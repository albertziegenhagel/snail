
import * as path from 'path';
import * as vscode from 'vscode';

import * as cp from 'child_process';
import * as rpc from 'vscode-jsonrpc/node';
import * as protocol from './protocol';
import { randomUUID } from 'crypto';


enum ClientState {
	starting,
	running,
	stopping,
	stopped,
}

class ProgressHandler {

	public workDoneToken: protocol.ProgressToken;
	public cancellationToken: vscode.CancellationToken;

	private _listener: rpc.Disposable | undefined;

	private _cancellationSource: vscode.CancellationTokenSource;
	private _progress: vscode.Progress<{ message?: string; increment?: number }> | undefined;
	private _reported: number = 0;
	private _tokenDisposable: vscode.Disposable | undefined;
	private _resolve: (() => void) | undefined;
	private _reject: ((reason?: any) => void) | undefined;

	public constructor(connection: rpc.MessageConnection) {
		this._cancellationSource = new vscode.CancellationTokenSource();

		this.cancellationToken = this._cancellationSource.token;
		this.workDoneToken = randomUUID();

		this._listener = connection.onProgress(protocol.workDoneProgressType, this.workDoneToken, async (param) => {
			switch (param.kind) {
				case 'begin':
					this.cancel();
					vscode.window.withProgress(
						{
							location: vscode.ProgressLocation.Window,
							title: param.title,
							cancellable: param.cancellable
						},
						async (progress, vscodeToken) => {
							this._tokenDisposable = vscodeToken.onCancellationRequested(() => this._cancellationSource.cancel());
							this._progress = progress;
							this._reported = 0;
							return new Promise<void>((resolve, reject) => {
								this._resolve = resolve;
								this._reject = reject;
							});
						}
					);
					break;
				case 'report':
					if (this._progress !== undefined && param.percentage !== undefined) {
						const percentage = Math.max(0, Math.min(param.percentage, 100));
						const delta = Math.max(0, percentage - this._reported);
						this._reported += delta;
						this._progress !== undefined && this._progress.report({ message: param.message, increment: delta });
					}
					break;
				case 'end':
					this.done();
					break;
			}
		});
	}

	public cancel(): void {
		if (this._reject !== undefined) {
			this._reject();
			this.end();
		}
	}

	public done(): void {
		if (this._resolve !== undefined) {
			this._resolve();
			this.end();
		}
	}

	public cleanup(): void {
		this.cancel();
		if (this._listener !== undefined) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}

	private end(): void {
		this._resolve = undefined;
		this._reject = undefined;
		if (this._tokenDisposable !== undefined) {
			this._tokenDisposable.dispose();
			this._tokenDisposable = undefined;
		}
		this._progress = undefined;
	}
}

export class Client {

	private _connection: rpc.MessageConnection | undefined;

	private _outputChannel: vscode.OutputChannel | undefined;

	private _started: Promise<void> | undefined;

	private _extensionPath: string;

	private _clientState: ClientState;

	public get outputChannel(): vscode.OutputChannel {
		if (!this._outputChannel) {
			this._outputChannel = vscode.window.createOutputChannel("Snail");
		}
		return this._outputChannel;
	}

	constructor(extensionPath: string) {
		this._extensionPath = extensionPath;
		this._clientState = ClientState.stopped;
	}

	private async _handleError(error: Error, message: rpc.Message | undefined, count: number | undefined) {
		vscode.window.showErrorMessage(`Snail JSON RPC error: ${error.message}`);
	}

	private async _handleClosed() {
		if (this._clientState === ClientState.running) {
			vscode.window.showErrorMessage("Snail server closed connection unexpectedly. Restarting...");
			this._connection?.end();
			this.start();
		}
	}

	private _getServerExecutablePath(): string {
		const executableConfig: string | undefined = vscode.workspace.getConfiguration("snail")?.get("server.executable");
		if (executableConfig && executableConfig.length > 0) {
			return executableConfig;
		}
		let serverExecutableName = 'snail-server';
		if (process.platform === 'win32') {
			serverExecutableName += ".exe";
		}
		return path.resolve(this._extensionPath, 'server', 'bin', serverExecutableName);
	}

	private _getServerCwd(): string | undefined {
		const folders = vscode.workspace.workspaceFolders;
		if (!folders || folders.length === 0) {
			return undefined;
		}
		const firstFolder = folders[0];
		if (firstFolder.uri.scheme === 'file') {
			return firstFolder.uri.fsPath;
		}
		return undefined;
	}

	private async _createConnection(): Promise<rpc.MessageConnection> {

		const serverPath = this._getServerExecutablePath();

		const serverExecOptions: cp.SpawnOptionsWithoutStdio = Object.create(null);
		serverExecOptions.cwd = this._getServerCwd();

		const serverArgs: string[] = [];
		let pipeName = rpc.generateRandomPipeName();
		serverArgs.push("--pipe");
		serverArgs.push(pipeName);

		const debugServer = vscode.workspace.getConfiguration("snail")?.get("server.debug");
		if (debugServer) {
			serverArgs.push("--debug");
		}

		const pipeTransport = await rpc.createClientPipeTransport(pipeName);

		const serverProcess = cp.spawn(serverPath, serverArgs, serverExecOptions);
		if (!serverProcess || !serverProcess.pid) {
			return Promise.reject<rpc.MessageConnection>(`Could not start server: '${serverPath}'`);
		}
		serverProcess.stderr.on('data', data => this.outputChannel.append(typeof data === 'string' || data instanceof String ? data : data.toString('utf-8')));
		serverProcess.stdout.on('data', data => this.outputChannel.append(typeof data === 'string' || data instanceof String ? data : data.toString('utf-8')));

		const [reader, writer] = await pipeTransport.onConnected();

		const connection = rpc.createMessageConnection(reader, writer);

		connection.onError((data) => { this._handleError(data[0], data[1], data[2]); });
		connection.onClose(() => { this._handleClosed(); });

		return connection;
	}

	private _sendUpdatePdbOptions() {
		if (this._connection === undefined) {
			return;
		}

		const configuration = vscode.workspace.getConfiguration("snail");
		if (configuration === null || configuration === undefined) {
			return;
		}

		const pdbSearchDirs = configuration.get<string[]>("pdbSymbols.searchDirs", []);
		const pdbCacheDir = configuration.get<string>("pdbSymbols.cacheDir", "");
		const pdbServerUrls = configuration.get<string[]>("pdbSymbols.serverUrls", []);
		const pdbNoDefaultServerUrls = configuration.get<boolean>("pdbSymbols.noDefaultServerUrls", false);

		this._connection.sendNotification(protocol.setPdbSymbolFindOptionsNotificationType, {
			searchDirs: pdbSearchDirs,
			symbolCacheDir: pdbCacheDir.length > 0 ? pdbCacheDir : undefined,
			noDefaultUrls: pdbNoDefaultServerUrls,
			symbolServerUrls: pdbServerUrls
		});
	}

	private _sendUpdateDwarfOptions() {
		if (this._connection === undefined) {
			return;
		}

		const configuration = vscode.workspace.getConfiguration("snail");
		if (configuration === null || configuration === undefined) {
			return;
		}

		configuration.get("dwarfDebugInfo.searchDirs");
		configuration.get("dwarfDebugInfo.cacheDir");
		configuration.get("dwarfDebugInfo.debuginfodUrls");
		configuration.get("dwarfDebugInfo.noDefaultDebuginfodUrls");

		const dwarfSearchDirs = configuration.get<string[]>("dwarfDebugInfo.searchDirs", []);
		const dwarfCacheDir = configuration.get<string>("dwarfDebugInfo.cacheDir", "");
		const dwarfDebuginfodUrls = configuration.get<string[]>("dwarfDebugInfo.debuginfodUrls", []);
		const dwarfNoDefaultDebuginfodUrls = configuration.get<boolean>("dwarfDebugInfo.noDefaultDebuginfodUrls", false);

		this._connection.sendNotification(protocol.setDwarfSymbolFindOptionsNotificationType, {
			searchDirs: dwarfSearchDirs,
			debuginfodCacheDir: dwarfCacheDir.length > 0 ? dwarfCacheDir : undefined,
			noDefaultUrls: dwarfNoDefaultDebuginfodUrls,
			debuginfodUrls: dwarfDebuginfodUrls
		});
	}

	private _sendUpdateModulePathMaps() {
		if (this._connection === undefined) {
			return;
		}

		const configuration = vscode.workspace.getConfiguration("snail");
		if (configuration === null || configuration === undefined) {
			return;
		}

		const modulePathMapsConfig = configuration.get<any[]>("moduleLookup.pathMap", []);

		let modulePathMaps: string[][] = [];

		for (const map of modulePathMapsConfig) {
			modulePathMaps.push([
				map['source'], map['target']
			]);
		}

		this._connection.sendNotification(protocol.setModulePathMapsNotificationType, {
			simpleMaps: modulePathMaps
		});
	}

	private _sendUpdateModuleFilters() {
		if (this._connection === undefined) {
			return;
		}

		const configuration = vscode.workspace.getConfiguration("snail");
		if (configuration === null || configuration === undefined) {
			return;
		}

		let mode = protocol.ModuleFilterMode.allButExcluded;
		const modeStr = configuration.get<string>("moduleLookup.filterMode", "All but excluded");
		if (modeStr === "Only included") {
			mode = protocol.ModuleFilterMode.onlyIncluded;
		}

		const include = configuration.get<string[]>("moduleLookup.filterInclude", []);
		const exclude = configuration.get<string[]>("moduleLookup.filterExclude", []);

		this._connection.sendNotification(protocol.setModuleFiltersNotificationType, {
			mode: mode,
			include: include,
			exclude: exclude
		});
	}

	private async _start(): Promise<void> {

		this._clientState = ClientState.starting;

		this._connection = await this._createConnection();

		this._connection.listen();

		// this._connection.trace(rpc.Trace.Verbose, {
		// 	log: (message: string, data?: string) => {
		// 		console.log(message, data);
		// 	}
		// });

		const initializeResult = await this._connection.sendRequest(protocol.initializeRequestType, {});

		this._sendUpdatePdbOptions();
		this._sendUpdateDwarfOptions();
		this._sendUpdateModulePathMaps();
		this._sendUpdateModuleFilters();

		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration("snail")) {
				this._sendUpdatePdbOptions();
				this._sendUpdateDwarfOptions();
				this._sendUpdateModulePathMaps();
				this._sendUpdateModuleFilters();
			}
		});

		this._clientState = ClientState.running;
	}

	public async start(): Promise<void> {
		this._started = this._start();
		return this._started;
	}

	public async stop(): Promise<void> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<void>("Client is not connected");
		}

		this._clientState = ClientState.stopping;

		this._connection.sendRequest(protocol.shutdownRequestType, null);
		await this._connection.sendNotification(protocol.exitNotificationType);

		this._connection.end();
		this._connection.dispose();

		this._clientState = ClientState.stopped;
	}

	public async readDocument(filePath: string): Promise<number> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<number>("Client is not connected");
		}

		const progressHandler = new ProgressHandler(this._connection);
		const result = this._connection.sendRequest(protocol.readDocumentRequestType, {
			filePath: filePath,
			workDoneToken: progressHandler.workDoneToken
		},
			progressHandler.cancellationToken);

		return result.then((data) => { progressHandler.cleanup(); return data.documentId; });
	}

	public async closeDocument(id: number): Promise<void> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<void>("Client is not connected");
		}

		const result = this._connection.sendNotification(protocol.closeDocumentNotificationType, {
			documentId: id
		});

		return result;
	}

	public async retrieveProcesses(documentId: number): Promise<protocol.ProcessInfo[]> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.ProcessInfo[]>("Client is not connected");
		}

		const result = this._connection.sendRequest(protocol.retrieveProcessesRequestType, {
			documentId: documentId
		});

		return result.then((data) => { return data.processes; });
	}

	public async setSampleFilter(documentId: number, minTime: number | undefined, maxTime: number | undefined, excludedProcesses: number[], excludedThreads: number[]): Promise<null> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<null>("Client is not connected");
		}

		const result = this._connection.sendRequest(protocol.setSampleFiltersRequestType, {
			documentId: documentId,
			minTime: minTime,
			maxTime: maxTime,
			excludedProcesses: excludedProcesses,
			excludedThreads: excludedThreads,
		});

		return result;
	}

	public async retrieveHottestFunctions(documentId: number, sourceId: number, count: number = 4): Promise<protocol.ProcessFunction[]> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.ProcessFunction[]>("Client is not connected");
		}


		const progressHandler = new ProgressHandler(this._connection);
		const result = this._connection.sendRequest(protocol.retrieveHottestFunctionsRequestType, {
			documentId: documentId,
			sourceId: sourceId,
			count: count,
			workDoneToken: progressHandler.workDoneToken
		},
			progressHandler.cancellationToken);

		return result.then((data) => { progressHandler.cleanup(); return data.functions; });
	}

	public async retrieveProcessSampleInfo(documentId: number, sourceId: number, processKey: number): Promise<protocol.RetrieveProcessSampleInfoResult> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.RetrieveProcessSampleInfoResult>("Client is not connected");
		}

		const result = this._connection.sendRequest(protocol.retrieveProcessSampleInfoRequestType, {
			documentId: documentId,
			processKey: processKey
		});

		return result;
	}

	public async retrieveCallTreeHotPath(documentId: number, sourceId: number, processKey: number): Promise<protocol.CallTreeNode> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.CallTreeNode>("Client is not connected");
		}

		const progressHandler = new ProgressHandler(this._connection);
		const result = this._connection.sendRequest(protocol.retrieveCallTreeHotPathRequestType, {
			documentId: documentId,
			sourceId: sourceId,
			processKey: processKey,
			workDoneToken: progressHandler.workDoneToken
		},
			progressHandler.cancellationToken);

		return result.then((data) => { progressHandler.cleanup(); return data.root; });
	}


	public async retrieveFunctionsPage(documentId: number, sortBy: protocol.FunctionsSortBy, sortOrder: protocol.SortDirection, sortSourceId: number | undefined, processKey: number,
		pageSize: number, pageIndex: number): Promise<protocol.FunctionNode[]> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.FunctionNode[]>("Client is not connected");
		}

		const progressHandler = new ProgressHandler(this._connection);
		const result = this._connection.sendRequest(protocol.retrieveFunctionsPageRequestType, {
			documentId: documentId,
			sortBy: sortBy,
			sortOrder: sortOrder,
			sortSourceId: sortSourceId,
			processKey: processKey,
			pageSize: pageSize,
			pageIndex: pageIndex,
			workDoneToken: progressHandler.workDoneToken
		},
			progressHandler.cancellationToken);

		return result.then((data) => { progressHandler.cleanup(); return data.functions; });
	}

	public async expandCallTreeNode(documentId: number, processKey: number, nodeId: number): Promise<protocol.CallTreeNode[]> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.CallTreeNode[]>("Client is not connected");
		}

		const progressHandler = new ProgressHandler(this._connection);
		const result = this._connection.sendRequest(protocol.expandCallTreeNodeRequestType, {
			documentId: documentId,
			processKey: processKey,
			nodeId: nodeId,
			workDoneToken: progressHandler.workDoneToken
		},
			progressHandler.cancellationToken);

		return result.then((data) => { progressHandler.cleanup(); return data.children; });
	}


	public async retrieveCallersCallees(documentId: number, sortSourceId: number, processKey: number, functionId: number, maxEntries: number = 6): Promise<protocol.RetrieveCallersCalleesResult> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.RetrieveCallersCalleesResult>("Client is not connected");
		}

		const progressHandler = new ProgressHandler(this._connection);
		const result = this._connection.sendRequest(protocol.retrieveCallersCalleesRequestType, {
			documentId: documentId,
			sortSourceId: sortSourceId,
			processKey: processKey,
			functionId: functionId,
			maxEntries: maxEntries,
			workDoneToken: progressHandler.workDoneToken
		},
			progressHandler.cancellationToken);

		return result.then((data) => { progressHandler.cleanup(); return data; });
	}

	public async retrieveSessionInfo(documentId: number): Promise<protocol.SessionInfo> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.SessionInfo>("Client is not connected");
		}

		const result = this._connection.sendRequest(protocol.retrieveSessionInfoRequestType, { documentId: documentId });

		return result.then((data) => { return data.sessionInfo; });
	}

	public async retrieveSystemInfo(documentId: number): Promise<protocol.SystemInfo> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.SystemInfo>("Client is not connected");
		}

		const result = this._connection.sendRequest(protocol.retrieveSystemInfoRequestType, { documentId: documentId });

		return result.then((data) => { return data.systemInfo; });
	}

	public async retrieveSampleSources(documentId: number): Promise<protocol.SampleSourceInfo[]> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.SampleSourceInfo[]>("Client is not connected");
		}

		const result = this._connection.sendRequest(protocol.retrieveSampleSourcesRequestType, { documentId: documentId });

		return result.then((data) => { return data.sampleSources; });
	}

	public async retrieveLineInfo(documentId: number, processKey: number, functionId: number): Promise<protocol.RetrieveLineInfoResult | null> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.RetrieveLineInfoResult | null>("Client is not connected");
		}

		const progressHandler = new ProgressHandler(this._connection);
		const result = this._connection.sendRequest(protocol.retrieveLineInfoRequestType, {
			documentId: documentId,
			processKey: processKey,
			functionId: functionId,
			workDoneToken: progressHandler.workDoneToken
		},
			progressHandler.cancellationToken);

		return result.then((data) => { progressHandler.cleanup(); return data; });
	}
}
