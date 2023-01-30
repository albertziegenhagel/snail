import * as vscode from 'vscode';
import { getNonce } from '../utilities/getNonce';
import { getUri } from '../utilities/getUri';
import { client } from '../extension';
import { FunctionFileHits } from '../client';
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

        const codiconsUri = getUri(webview, this.extensionUri, ["webview-ui", "node_modules", "@vscode/codicons", "dist", "codicon.css"]);

        const nonce = getNonce();

        // <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

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
                    <link rel="stylesheet" type="text/css" href="${stylesUri}"/>
                    <link rel="stylesheet" type="text/css" href="${codiconsUri}"/>
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
                    case "retrieve_processes":
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
                    case "retrieve_hottest_functions":
                        client.retrieveHottestFunctions(document.documentId).then(
                            (functions) => {
                                webview.postMessage({
                                    "type": "hottest_functions",
                                    "data": {
                                        "functions": functions,
                                    }
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve hottest functions: ${reason}`);
                            });
                        return;
                    case "retrieve_call_tree_hot_path":
                        client.retrieveCallTreeHotPath(document.documentId, message.processId).then(
                            (root) => {
                                webview.postMessage({
                                    "type": "call_tree_hot_path",
                                    "data": {
                                        "process_id": message.processId,
                                        "root": root
                                    }
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve call tree hot path: ${reason}`);
                            });
                        return;
                    case "retrieve_functions_page":
                        client.retrieveFunctionsPage(document.documentId, message.processId, message.pageSize, message.pageIndex).then(
                            (functions) => {
                                webview.postMessage({
                                    "type": "functions_page",
                                    "data": {
                                        "page_size": message.pageSize,
                                        "page_index": message.pageIndex,
                                        "functions": functions,
                                    }
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve functions page: ${reason}`);
                            });
                        return;
                    case "expand_call_tree_node":
                        client.expandCallTreeNode(document.documentId, message.processId, message.nodeId).then(
                            (children) => {
                                webview.postMessage({
                                    "type": "call_tree_node_children",
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
                    case "retrieve_callers_callees":
                        client.retrieveCallersCallees(document.documentId, message.processId, message.functionId).then(
                            (result) => {
                                webview.postMessage({
                                    "type": "callers_callees",
                                    "data": {
                                        "process_id": message.processId,
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
                    case "retrieve_session_info":
                        client.retrieveSessionInfo(document.documentId).then(
                            (sessionInfo) => {
                                webview.postMessage({
                                    "type": "session_info",
                                    "data": sessionInfo
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve session info: ${reason}`);
                            });
                        return;
                    case "retrieve_system_info":
                        client.retrieveSystemInfo(document.documentId).then(
                            (systemInfo) => {
                                webview.postMessage({
                                    "type": "system_info",
                                    "data": systemInfo
                                });
                            },
                            (reason) => {
                                vscode.window.showErrorMessage(`Failed to retrieve system info: ${reason}`);
                            }
                        );
                        return;
                    case "navigate_to_function":
                        client.retrieveLineInfo(document.documentId, message.processId, message.functionId).then(
                            (result) => {
                                if (result === undefined) {
                                    return;
                                }
                                this.navigateTo(result);
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

    async navigateTo(functionHits: FunctionFileHits) {
        if (functionHits.file_path === null) {
            this.clearDecorations();
            return;
        }

		// FIXME: Remove hard-coded mapping!
        if (functionHits.file_path.startsWith("/mnt/c/")) {
            functionHits.file_path = functionHits.file_path.replace("/mnt/c/", "C:/");
        }

        const documentPromise = vscode.workspace.openTextDocument(functionHits.file_path);

        let gutterDecorations: vscode.DecorationOptions[] = [];

        let hitDecorations: vscode.Range[][] = [];
        while (hitDecorations.length < hitDecorationTypes.length) {
            hitDecorations.push([]);
        }

        functionHits.line_hits.sort((a, b) => {
            return (a.line_number - b.line_number);
        });

        let maxChars = 1;

        let lastLine: number = 0;
        for (const lineInfo of functionHits.line_hits) {
            for (let line = lastLine; line < lineInfo.line_number; line++) {
                gutterDecorations.push({
                    range: new vscode.Range(line, 0, line, 0),
                    renderOptions: {
                        before: {
                            contentText: "",
                        }
                    },
                });
            }

            const text = `${lineInfo.total_samples}`;
            maxChars = Math.max(maxChars, text.length);

            gutterDecorations.push({
                range: new vscode.Range(lineInfo.line_number, 0, lineInfo.line_number, 0),
                renderOptions: {
                    before: {
                        contentText: text,
                    }
                },
            });
            const index = Math.min(Math.trunc((lineInfo.total_samples / functionHits.total_samples) * hitDecorations.length), hitDecorations.length - 1);
            hitDecorations[index].push(
                new vscode.Range(lineInfo.line_number, 0, lineInfo.line_number, 0),
            );
            lastLine = lineInfo.line_number + 1;
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
                    `Could not open document '${functionHits.file_path}'\nMaybe you need to specify file mapping?`,
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

        editor.revealRange(new vscode.Range(
            Math.min(Math.max(functionHits.line_number + startOffset, 0), functionHits.line_hits.at(0)?.line_number || functionHits.line_number), 0,
            Math.max(functionHits.line_number, functionHits.line_hits.at(-1)?.line_number || functionHits.line_number), 0));

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
