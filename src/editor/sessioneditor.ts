import * as vscode from 'vscode';
import { getNonce } from '../utilities/getNonce';
import { getUri } from '../utilities/getUri';
import { client } from '../extension';
import * as protocol from '../protocol';
import { gutterDecorationType, hitDecorationTypes } from './decorations';

class PerformanceSessionDocument implements vscode.CustomDocument {

    static async create(uri: vscode.Uri, token: vscode.CancellationToken): Promise<PerformanceSessionDocument | PromiseLike<PerformanceSessionDocument>> {
        const documentId = await client.readDocument(uri.fsPath);
        return new PerformanceSessionDocument(uri, documentId);
    }

    private readonly _uri: vscode.Uri;

    private readonly _documentId: number;

    private constructor(uri: vscode.Uri, documentId: number) {
        this._uri = uri;
        this._documentId = documentId;
    }

    public get uri() { return this._uri; }
    public get documentId() { return this._documentId; }

    dispose(): void {
        client.closeDocument(this._documentId);
    }
}

export class PerformanceSessionEditorProvider implements vscode.CustomReadonlyEditorProvider<PerformanceSessionDocument> {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {

        return vscode.window.registerCustomEditorProvider(
            PerformanceSessionEditorProvider.viewType,
            new PerformanceSessionEditorProvider(context),
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsMultipleEditorsPerDocument: false,
            });
    }

    private static readonly viewType = 'snail.perfSession';

    private extensionUri: vscode.Uri;

    constructor(
        private readonly context: vscode.ExtensionContext
    ) {
        this.extensionUri = context.extensionUri;
    }

    async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        token: vscode.CancellationToken
    ): Promise<PerformanceSessionDocument> {
        return PerformanceSessionDocument.create(uri, token);
    }

    async resolveCustomEditor(
        document: PerformanceSessionDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        this._setWebviewMessageListener(webviewPanel.webview, document);
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const stylesUri = getUri(webview, this.extensionUri, ["webview-ui", "build", "assets", "index.css"]);
        const scriptUri = getUri(webview, this.extensionUri, ["webview-ui", "build", "assets", "index.js"]);

        const codiconsUri = getUri(webview, this.extensionUri, ["webview-ui", "node_modules", "@vscode", "codicons", "dist", "codicon.css"]);

        const nonce = getNonce();

        return /* html */`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <style>
                        html {height: 100%;}
                        body {height: 100%; padding: 0;}
                    </style>
                    <title>Performance Session</title>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

                    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">

                    <link rel="stylesheet" type="text/css" href="${stylesUri}"/>
                    <link rel="stylesheet" type="text/css" href="${codiconsUri}" id="vscode-codicon-stylesheet"/>
                </head>
                <body>
                    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
                </body>
            </html>`;
    }

    private _setWebviewMessageListener(webview: vscode.Webview, document: PerformanceSessionDocument) {
        webview.onDidReceiveMessage(
            (message: any) => {
                switch (message.command) {
                    case "retrieveProcesses":
                        client.retrieveProcesses(document.documentId).then(
                            (processInfos) => {
                                webview.postMessage({
                                    "type": "processes",
                                    "data": processInfos
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve processes: ${reason}`);
                            });
                        return;
                    case "setSampleFilter":
                        client.setSampleFilter(document.documentId, message.minTime, message.maxTime, message.excludedProcesses, message.excludedThreads).then(
                            () => {
                                webview.postMessage({
                                    "type": "filterSet",
                                    "data": {
                                        minTime: message.minTime,
                                        maxTime: message.maxTime
                                    }
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to set sample filter: ${reason}`);
                            });
                        return;
                    case "retrieveHottestFunctions":
                        client.retrieveHottestFunctions(document.documentId, message.sourceId).then(
                            (functions) => {
                                webview.postMessage({
                                    "type": "hottestFunctions",
                                    "data": {
                                        "functions": functions,
                                    }
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve hottest functions: ${reason}`);
                            });
                        return;
                    case "retrieveProcessSampleInfo":
                        client.retrieveProcessSampleInfo(document.documentId, message.sourceId, message.processKey).then(
                            (info) => {
                                webview.postMessage({
                                    "type": "processSampleInfo",
                                    "data": {
                                        "processKey": message.processKey,
                                        "info": info
                                    }
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve process sample info: ${reason}`);
                            });
                        return;
                    case "retrieveCallTreeHotPath":
                        client.retrieveCallTreeHotPath(document.documentId, message.sourceId, message.processKey).then(
                            (root) => {
                                webview.postMessage({
                                    "type": "callTreeHotPath",
                                    "data": {
                                        "processKey": message.processKey,
                                        "root": root
                                    }
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve call tree hot path: ${reason}`);
                            });
                        return;
                    case "retrieveFunctionsPage":
                        client.retrieveFunctionsPage(document.documentId, message.sortBy, message.sortOrder, message.sortSourceId, message.processKey, message.pageSize, message.pageIndex).then(
                            (functions) => {
                                webview.postMessage({
                                    "type": "functionsPage",
                                    "data": {
                                        "processKey": message.processKey,
                                        "pageSize": message.pageSize,
                                        "pageIndex": message.pageIndex,
                                        "functions": functions,
                                    }
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve functions page: ${reason}`);
                            });
                        return;
                    case "expandCallTreeNode":
                        client.expandCallTreeNode(document.documentId, message.processKey, message.nodeId).then(
                            (children) => {
                                webview.postMessage({
                                    "type": "callTreeNodeChildren",
                                    "data": {
                                        "id": message.nodeId,
                                        "children": children
                                    }
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to expand call tree node: ${reason}`);
                            });
                        return;
                    case "retrieveCallersCallees":
                        client.retrieveCallersCallees(document.documentId, message.sortSourceId, message.processKey, message.functionId).then(
                            (result) => {
                                webview.postMessage({
                                    "type": "callersCallees",
                                    "data": {
                                        "processKey": message.processKey,
                                        "function": result.function,
                                        "callers": result.callers,
                                        "callees": result.callees
                                    }
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve callers/callees: ${reason}`);
                            });
                        return;
                    case "retrieveSessionInfo":
                        client.retrieveSessionInfo(document.documentId).then(
                            (sessionInfo) => {
                                webview.postMessage({
                                    "type": "sessionInfo",
                                    "data": sessionInfo
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve session info: ${reason}`);
                            });
                        return;
                    case "retrieveSystemInfo":
                        client.retrieveSystemInfo(document.documentId).then(
                            (systemInfo) => {
                                webview.postMessage({
                                    "type": "systemInfo",
                                    "data": systemInfo
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve system info: ${reason}`);
                            }
                        );
                        return;
                    case "retrieveSampleSources":
                        client.retrieveSampleSources(document.documentId).then(
                            (sampleSources) => {
                                webview.postMessage({
                                    "type": "sampleSources",
                                    "data": sampleSources
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve sample sources: ${reason}`);
                            });
                        return;
                    case "navigateToFunction":
                        client.retrieveLineInfo(document.documentId, message.processKey, message.functionId).then(
                            (result) => {
                                if (result === undefined) {
                                    return;
                                }
                                this.navigateTo(result, message.sampleSources, message.sourceIndex);
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve line info: ${reason}`);
                            });
                        return;
                }
            },
            undefined//,
            //   this._disposables
        );
    }

    private currentlyDecoratedEditor: vscode.TextEditor | undefined;

    private clearDecorations() {
        if (this.currentlyDecoratedEditor === undefined) {
            return;
        }

        this.currentlyDecoratedEditor.setDecorations(gutterDecorationType, []);
        for (let i = 0; i < hitDecorationTypes.length; i++) {
            this.currentlyDecoratedEditor.setDecorations(hitDecorationTypes[i], []);
        }
        this.currentlyDecoratedEditor = undefined;
    }

    async navigateTo(functionHits: protocol.RetrieveLineInfoResult | null, sampleSources: protocol.SampleSourceInfo[] | null, sampleSourceIndex: number | null) {
        if (functionHits === null) {
            this.clearDecorations();
            return;
        }

        // FIXME: Remove hard-coded mapping!
        if (functionHits.filePath.startsWith("/mnt/c/")) {
            functionHits.filePath = functionHits.filePath.replace("/mnt/c/", "C:/");
        }

        const documentPromise = vscode.workspace.openTextDocument(functionHits.filePath);

        let gutterDecorations: vscode.DecorationOptions[] = [];

        let hitDecorations: vscode.Range[][] = [];
        while (hitDecorations.length < hitDecorationTypes.length) {
            hitDecorations.push([]);
        }

        functionHits.lineHits.sort((a, b) => {
            return (a.lineNumber - b.lineNumber);
        });

        let maxChars = 1;

        if (sampleSourceIndex === null) {
            sampleSourceIndex = 0;
        }

        const useTotalSamples = sampleSources !== null && sampleSourceIndex < sampleSources.length ?
            sampleSources[sampleSourceIndex].hasStacks : false;

        const functionSamples = (sampleSourceIndex < functionHits.hits.length) ?
            (useTotalSamples ?
                functionHits.hits[sampleSourceIndex].totalSamples :
                functionHits.hits[sampleSourceIndex].selfSamples) : 0;

        let lastLine: number = 1;
        for (const lineInfo of functionHits.lineHits) {
            if (lineInfo.lineNumber < 1) {
                continue;
            }
            if (lineInfo.lineNumber - lastLine > 100000) {
                // Protect against very large gaps. This is probably due to
                // us getting an invalid line number (max int or similar).
                lastLine = lineInfo.lineNumber + 1;
                continue;
            }
            for (let line = lastLine; line < lineInfo.lineNumber; line++) {
                gutterDecorations.push({
                    range: new vscode.Range(line - 1, 0, line - 1, 0),
                    renderOptions: {
                        before: {
                            contentText: "",
                        }
                    },
                });
            }

            const lineSamples = (sampleSourceIndex < lineInfo.hits.length) ?
                (useTotalSamples ?
                    lineInfo.hits[sampleSourceIndex].totalSamples :
                    lineInfo.hits[sampleSourceIndex].selfSamples) : 0;

            const text = `${lineSamples}`;
            maxChars = Math.max(maxChars, text.length);

            gutterDecorations.push({
                range: new vscode.Range(lineInfo.lineNumber - 1, 0, lineInfo.lineNumber - 1, 0),
                renderOptions: {
                    before: {
                        contentText: text,
                    }
                },
            });
            const index = Math.min(Math.trunc((lineSamples / functionSamples) * hitDecorations.length), hitDecorations.length - 1);
            hitDecorations[index].push(
                new vscode.Range(lineInfo.lineNumber - 1, 0, lineInfo.lineNumber - 1, 0),
            );
            lastLine = lineInfo.lineNumber + 1;
        }

        const configurationName = "workbench.editor.openSideBySideDirection";

        const desiredDirection: string | undefined = 'down'; // TODO: make this a setting

        const currentDirection: string | undefined = vscode.workspace.getConfiguration().get(configurationName);
        const originalConfig = vscode.workspace.getConfiguration().inspect(configurationName);

        let editor: vscode.TextEditor | undefined;

        async function tryShowDocument(documentPromise: Thenable<vscode.TextDocument>): Promise<vscode.TextEditor | undefined> {
            let document: vscode.TextDocument;
            try {
                document = await documentPromise;
            }
            catch (error) {
                vscode.window.showInformationMessage(
                    `Could not open document '${functionHits?.filePath}'\nMaybe you need to specify file mapping?`,
                    'Browse'
                ).then((item) => {
                    if (item === "Browse") {
                        // TODO: implement browsing
                    }
                });
                return undefined;
            }
            return vscode.window.showTextDocument(document, vscode.ViewColumn.Beside, true);
        }

        if (desiredDirection !== undefined && desiredDirection !== currentDirection && originalConfig !== undefined) {
            const target = originalConfig.workspaceValue === currentDirection ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
            await vscode.workspace.getConfiguration().update(configurationName, desiredDirection, target);
            try {
                editor = await tryShowDocument(documentPromise);
            }
            finally {
                const originalDirection = target === vscode.ConfigurationTarget.Workspace ? originalConfig.workspaceValue : originalConfig.globalValue;
                vscode.workspace.getConfiguration().update(configurationName, originalDirection, target);
            }
        }
        else {
            editor = await tryShowDocument(documentPromise);
        }

        if (editor === undefined) {
            this.clearDecorations();
            return;
        }

        const startOffset = -2; // function start is usually the open parenthesis

        var startLine = functionHits.lineNumber - 1 + startOffset;
        if (functionHits.lineHits.at(0)?.lineNumber !== undefined) {
            startLine = Math.min(startLine, functionHits.lineHits.at(0)!.lineNumber - 1);
        }
        var endLine = functionHits.lineNumber - 1;
        if (functionHits.lineHits.at(-1)?.lineNumber !== undefined) {
            endLine = Math.max(endLine, functionHits.lineHits.at(-1)!.lineNumber - 1);
        }
        editor.revealRange(new vscode.Range(
            Math.max(Math.min(startLine, editor.document.lineCount), 0), 0,
            Math.max(Math.min(endLine, editor.document.lineCount), 0), 0));

        for (let line = lastLine; line < editor.document.lineCount; line++) {
            gutterDecorations.push({
                range: new vscode.Range(line, 0, line, 1),
                renderOptions: {
                    before: {
                        contentText: "",
                    }
                },
            });
        }

        for (let decoration of gutterDecorations) {
            decoration.renderOptions!.before!.width = `calc(${maxChars}ch)`;
        }

        editor.setDecorations(gutterDecorationType, gutterDecorations);
        for (let i = 0; i < hitDecorationTypes.length; i++) {
            editor.setDecorations(hitDecorationTypes[i], hitDecorations[i]);
        }

        this.currentlyDecoratedEditor = editor;
    }
}
