
import * as path from 'path';
import * as vscode from 'vscode';

import * as cp from 'child_process';
import * as rpc from 'vscode-jsonrpc/node';

interface InitializeParams {
}
interface InitializeResult {
	success: boolean;
}
interface InitializeError {
}
const initializeRequestType = new rpc.RequestType<InitializeParams, InitializeResult, InitializeError>('initialize');

const shutdownRequestType = new rpc.RequestType0<void, void>('shutdown');
const exitNotificationType = new rpc.NotificationType('exit');

interface ThreadInfo {
	id: number;
	name: string;
	start_time: number; // nanoseconds since session start
	end_time: number;   // nanoseconds since session start
}

interface ProcessInfo {
	id: number;
	name: string;
	start_time: number; // nanoseconds since session start
	end_time: number;   // nanoseconds since session start
	threads: ThreadInfo[]
}
interface CallTreeNode {
	name: string;
	id: number;
	function_id: number;
	module: string;
	type: string;
	self_samples: number;
	total_samples: number;
	self_percent: number;
	total_percent: number;
	children: CallTreeNode[] | null;
	is_hot: boolean;
}

interface FunctionNode {
	name: string;
	id: number;
	module: string;
	type: string;
	self_samples: number;
	total_samples: number;
	self_percent: number;
	total_percent: number;
}

interface ProcessFunction {
	process_id: number;
	function: FunctionNode;
}

interface CallerCalleeInfo {
	function: FunctionNode;
	callers: FunctionNode[];
	callees: FunctionNode[];
}

interface SessionInfo {
	command_line: string;
	date: string;
	runtime: number; // in nanoseconds
	number_of_processes: number;
	number_of_threads: number;
	number_of_samples: number;
	average_sampling_rate: number;
}

interface SystemInfo {
	hostname: string;
	platform: string;
	architecture: string;
	cpu_name: string;
	number_of_processors: number;
}

interface LineHits {
	line_number: number;
	self_samples: number;
	total_samples: number;
	self_percent: number;
	total_percent: number;
}

export interface FunctionFileHits {
	file_path: string;
	line_number: number;

	self_samples: number;
	total_samples: number;
	self_percent: number;
	total_percent: number;

	line_hits: LineHits[];
}

export class Client {

	private _connection: rpc.MessageConnection | undefined;

	private _outputChannel: vscode.OutputChannel | undefined;

	private _started: Promise<void> | undefined;

	private _extensionPath: string;

	public get outputChannel(): vscode.OutputChannel {
		if (!this._outputChannel) {
			this._outputChannel = vscode.window.createOutputChannel("Snail");
		}
		return this._outputChannel;
	}

	constructor(extensionPath : string) {
		this._extensionPath = extensionPath;
	}

	private async _handleError(error: Error, message: rpc.Message | undefined, count: number | undefined) {
		vscode.window.showErrorMessage(`Snail JSON RPC error: ${error.message}`);
	}
	
	private async _handleClosed() {
		vscode.window.showErrorMessage("Snail server closed connection unexpectedly. Restarting...");
		this._connection?.end();
		this.start();
	}

	private _getServerExecutablePath() : string {
		const executableConfig : string | undefined = vscode.workspace.getConfiguration("snail")?.get("server.executable");
		if(executableConfig) {
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

	private async _start(): Promise<void> {

		this._connection =  await this._createConnection();

		this._connection.listen();

		// this._connection.onNotification();

		// this._connection.trace();
		// this._connection.trace();

		const initializeParams: InitializeParams = {
		};

		const initializeResult = this._connection.sendRequest(initializeRequestType, initializeParams);
	}

	public async start(): Promise<void> {
		this._started = this._start();
		return this._started;
	}

	public async stop(): Promise<void> {
		await this._started;
		if (this._connection === undefined) {
			return;
		}

		this._connection.sendRequest(shutdownRequestType, undefined);
		await this._connection.sendNotification(exitNotificationType);

		this._connection.end();
		this._connection.dispose();
	}

	public async readDocument(filePath: string): Promise<number> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<number>("Client is not connected");
		}

		interface Params {
			file_path: string;
		}
		interface Result {
			document_id: number;
		}
		interface Error {
		}
		const requestType = new rpc.RequestType<Params, Result, Error>('read_document');

		const result = this._connection.sendRequest(requestType, {
			file_path: filePath
		});

		return result.then((data) => { return data.document_id; });
	}

	public async closeDocument(id: number): Promise<void> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<void>("Client is not connected");
		}

		interface Params {
			document_id: number;
		}
		const requestType = new rpc.NotificationType<Params>('close_document');

		const result = this._connection.sendNotification(requestType, {
			document_id: id
		});

		return result;
	}

	public async retrieveProcesses(documentId: number): Promise<ProcessInfo[]> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<ProcessInfo[]>("Client is not connected");
		}

		interface Params {
			document_id: number;
		}
		interface Result {
			processes: ProcessInfo[]
		}
		interface Error {
		}
		const requestType = new rpc.RequestType<Params, Result, Error>('retrieve_processes');

		const result = this._connection.sendRequest(requestType, {
			document_id: documentId
		});

		return result.then((data) => { return data.processes; });
	}

	public async retrieveHottestFunctions(documentId: number, count: number = 4): Promise<ProcessFunction[]> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<ProcessFunction[]>("Client is not connected");
		}

		interface Params {
			document_id: number;
			count: number;
		}
		interface Result {
			functions: ProcessFunction[]
		}
		interface Error {
		}
		const requestType = new rpc.RequestType<Params, Result, Error>('retrieve_hottest_functions');

		const result = this._connection.sendRequest(requestType, {
			document_id: documentId,
			count: count
		});

		return result.then((data) => { return data.functions; });
	}

	public async retrieveCallTreeHotPath(documentId: number, processId: number): Promise<CallTreeNode> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<CallTreeNode>("Client is not connected");
		}

		interface Params {
			document_id: number;
			process_id: number;
		}
		interface Result {
			root: CallTreeNode
		}
		interface Error {
		}
		const requestType = new rpc.RequestType<Params, Result, Error>('retrieve_call_tree_hot_path');

		const result = this._connection.sendRequest(requestType, {
			document_id: documentId,
			process_id: processId
		});

		return result.then((data) => { return data.root; });
	}


	public async retrieveFunctionsPage(documentId: number, processId: number,
		pageSize: number, pageIndex: number): Promise<FunctionNode[]> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<FunctionNode[]>("Client is not connected");
		}

		interface Params {
			document_id: number;
			process_id: number;
			page_size: number;
			page_index: number;
		}
		interface Result {
			functions: FunctionNode[]
		}
		interface Error {
		}
		const requestType = new rpc.RequestType<Params, Result, Error>('retrieve_functions_page');

		const result = this._connection.sendRequest(requestType, {
			document_id: documentId,
			process_id: processId,
			page_size: pageSize,
			page_index: pageIndex
		});

		return result.then((data) => { return data.functions; });
	}

	public async expandCallTreeNode(documentId: number, processId: number, nodeId: number): Promise<CallTreeNode[]> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<CallTreeNode[]>("Client is not connected");
		}

		interface Params {
			document_id: number;
			process_id: number;
			node_id: number;
		}
		interface Result {
			children: CallTreeNode[]
		}
		interface Error {
		}
		const requestType = new rpc.RequestType<Params, Result, Error>('expand_call_tree_node');

		const result = this._connection.sendRequest(requestType, {
			document_id: documentId,
			process_id: processId,
			node_id: nodeId
		});

		return result.then((data) => { return data.children; });
	}


	public async retrieveCallersCallees(documentId: number, processId: number, functionId: number, maxEntries: number = 6): Promise<CallerCalleeInfo> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<CallerCalleeInfo>("Client is not connected");
		}

		interface Params {
			document_id: number;
			process_id: number;
			function_id: number;
			max_entries: number;
		}
		interface Error {
		}
		const requestType = new rpc.RequestType<Params, CallerCalleeInfo, Error>('retrieve_callers_callees');

		const result = this._connection.sendRequest(requestType, {
			document_id: documentId,
			process_id: processId,
			function_id: functionId,
			max_entries: maxEntries
		});

		return result;
	}

	public async retrieveSessionInfo(documentId: number): Promise<SessionInfo> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<SessionInfo>("Client is not connected");
		}

		interface Params {
			document_id: number;
		}
		interface Error {
		}
		const requestType = new rpc.RequestType<Params, SessionInfo, Error>('retrieve_session_info');

		const result = this._connection.sendRequest(requestType, { document_id: documentId });

		return result;
	}

	public async retrieveSystemInfo(documentId: number): Promise<SystemInfo> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<SystemInfo>("Client is not connected");
		}

		interface Params {
			document_id: number;
		}
		interface Error {
		}
		const requestType = new rpc.RequestType<Params, SystemInfo, Error>('retrieve_system_info');

		return this._connection.sendRequest(requestType, { document_id: documentId });
	}


	public async retrieveLineInfo(documentId: number, processId: number, functionId: number): Promise<FunctionFileHits> {
		await this._started;
		if (this._connection === undefined) {
			return Promise.reject<FunctionFileHits>("Client is not connected");
		}

		interface Params {
			document_id: number;
			process_id: number;
			function_id: number;
		}
		interface Error {
		}
		const requestType = new rpc.RequestType<Params, FunctionFileHits, Error>('retrieve_line_info');

		const result = this._connection.sendRequest(requestType, {
			document_id: documentId,
			process_id: processId,
			function_id: functionId,
		});

		return result;
	}
}
