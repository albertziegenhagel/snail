
import * as path from 'path';
import * as vscode from 'vscode';

import * as cp from 'child_process';
import * as rpc from 'vscode-jsonrpc/node';
import * as protocol from './protocol';


enum ClientState {
	starting,
	running,
	stopping,
	stopped,
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

	constructor(extensionPath : string) {
		this._extensionPath = extensionPath;
		this._clientState = ClientState.stopped;
	}

	private async _handleError(error: Error, message: rpc.Message | undefined, count: number | undefined) {
		vscode.window.showErrorMessage(`Snail JSON RPC error: ${error.message}`);
	}
	
	private async _handleClosed() {
		if(this._clientState === ClientState.running) {
			vscode.window.showErrorMessage("Snail server closed connection unexpectedly. Restarting...");
			this._connection?.end();
			this.start();
		}
	}

	private _getServerExecutablePath() : string {
		const executableConfig : string | undefined = vscode.workspace.getConfiguration("snail")?.get("server.executable");
		if(executableConfig && executableConfig.length > 0) {
			return executableConfig;
		}
		let serverExecutableName = 'snail-server';
		if(process.platform === 'win32') {
			serverExecutableName += ".exe";
		}
		return path.resolve(this._extensionPath, 'server', 'bin', serverExecutableName);
	}

	private _getServerCwd() : string | undefined {
		const folders = vscode.workspace.workspaceFolders;
		if(!folders || folders.length === 0) {
			return undefined;
		}
		const firstFolder = folders[0];
		if(firstFolder.uri.scheme === 'file') {
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
		if(debugServer) {
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
		if(configuration === null || configuration === undefined) {
			return;
		}

		const pdbSearchDirs = configuration.get<string[]>("pdbSymbols.searchDirs", []);
		const pdbCacheDir = configuration.get<string>("pdbSymbols.cacheDir", "");
		const pdbServerUrls = configuration.get<string[]>("pdbSymbols.serverUrls", []);
		const pdbNoDefaultServerUrls = configuration.get<boolean>("pdbSymbols.noDefaultServerUrls", false);

		this._connection.sendNotification(protocol.setPdbSymbolFindOptionsNotificationType, {
			searchDirs : pdbSearchDirs,
			symbolCacheDir : pdbCacheDir.length > 0 ? pdbCacheDir : null,
			noDefaultUrls : pdbNoDefaultServerUrls,
			symbolServerUrls : pdbServerUrls
		});
	}

	private _sendUpdateDwarfOptions() {
		if (this._connection === undefined) {
			return;
		}

		const configuration = vscode.workspace.getConfiguration("snail");
		if(configuration === null || configuration === undefined) {
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
			searchDirs : dwarfSearchDirs,
			debuginfodCacheDir : dwarfCacheDir.length > 0 ? dwarfCacheDir : null,
			noDefaultUrls : dwarfNoDefaultDebuginfodUrls,
			debuginfodUrls : dwarfDebuginfodUrls
		});
	}
	
	private _sendUpdateModulePathMaps() {
		if (this._connection === undefined) {
			return;
		}

		const configuration = vscode.workspace.getConfiguration("snail");
		if(configuration === null || configuration === undefined) {
			return;
		}

		const modulePathMapsConfig = configuration.get<any[]>("moduleLookup.pathMap", []);

		let modulePathMaps : string[][] = [];

		for (const map of modulePathMapsConfig) {
			modulePathMaps.push([
				map['source'], map['target']
			]);
		}

		this._connection.sendNotification(protocol.setModulePathMapsNotificationType, {
			simpleMaps: modulePathMaps
		});
	}

	private async _start(): Promise<void> {

		this._clientState = ClientState.starting;

		this._connection =  await this._createConnection();

		this._connection.listen();

		// this._connection.onNotification();

		// this._connection.trace();
		// this._connection.trace();

		const initializeResult = this._connection.sendRequest(protocol.initializeRequestType, {});

		this._sendUpdatePdbOptions();
		this._sendUpdateDwarfOptions();
		this._sendUpdateModulePathMaps();

		vscode.workspace.onDidChangeConfiguration((event) => {
			if(event.affectsConfiguration("snail")) {
				this._sendUpdatePdbOptions();
				this._sendUpdateDwarfOptions();
				this._sendUpdateModulePathMaps();
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

		const result = this._connection.sendRequest(protocol.readDocumentRequestType, {
			filePath: filePath
		});

		return result.then((data) => { return data.documentId; });
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

	public async retrieveHottestFunctions(documentId: number, count: number = 4): Promise<protocol.ProcessFunction[]> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.ProcessFunction[]>("Client is not connected");
		}


		const result = this._connection.sendRequest(protocol.retrieveHottestFunctionsRequestType, {
			documentId: documentId,
			count: count
		});

		return result.then((data) => { return data.functions; });
	}

	public async retrieveCallTreeHotPath(documentId: number, processId: number): Promise<protocol.CallTreeNode> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.CallTreeNode>("Client is not connected");
		}

		const result = this._connection.sendRequest(protocol.retrieveCallTreeHotPathRequestType, {
			documentId: documentId,
			processId: processId
		});

		return result.then((data) => { return data.root; });
	}


	public async retrieveFunctionsPage(documentId: number, processId: number,
		pageSize: number, pageIndex: number): Promise<protocol.FunctionNode[]> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.FunctionNode[]>("Client is not connected");
		}

		const result = this._connection.sendRequest(protocol.retrieveFunctionsPageRequestType, {
			documentId: documentId,
			processId: processId,
			pageSize: pageSize,
			pageIndex: pageIndex
		});

		return result.then((data) => { return data.functions; });
	}

	public async expandCallTreeNode(documentId: number, processId: number, nodeId: number): Promise<protocol.CallTreeNode[]> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.CallTreeNode[]>("Client is not connected");
		}

		const result = this._connection.sendRequest(protocol.expandCallTreeNodeRequestType, {
			documentId: documentId,
			processId: processId,
			nodeId: nodeId
		});

		return result.then((data) => { return data.children; });
	}


	public async retrieveCallersCallees(documentId: number, processId: number, functionId: number, maxEntries: number = 6): Promise<protocol.RetrieveCallersCalleesResult> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.RetrieveCallersCalleesResult>("Client is not connected");
		}

		const result = this._connection.sendRequest(protocol.retrieveCallersCalleesRequestType, {
			documentId: documentId,
			processId: processId,
			functionId: functionId,
			maxEntries: maxEntries
		});

		return result;
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

		const result =  this._connection.sendRequest(protocol.retrieveSystemInfoRequestType, { documentId: documentId });
		
		return result.then((data) => { return data.systemInfo; });
	}


	public async retrieveLineInfo(documentId: number, processId: number, functionId: number): Promise<protocol.RetrieveLineInfoResult|null> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<protocol.RetrieveLineInfoResult|null>("Client is not connected");
		}

		const result = this._connection.sendRequest(protocol.retrieveLineInfoRequestType, {
			documentId: documentId,
			processId: processId,
			functionId: functionId,
		});

		return result;
	}
}
