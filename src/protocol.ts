// ****** THIS IS A GENERATED FILE, DO NOT EDIT. ******

import * as rpc from 'vscode-jsonrpc/node';


export enum ModuleFilterMode {
    allButExcluded = "all_but_excluded",
    onlyIncluded = "only_included",
}

export enum FunctionsSortBy {
    name = "name",
    selfSamples = "self_samples",
    totalSamples = "total_samples",
}

export enum SortDirection {
    ascending = "ascending",
    descending = "descending",
}


export type ProgressToken = rpc.ProgressToken;

export interface WorkDoneProgressParams {
    workDoneToken?: ProgressToken;
}

export interface SampleSourceInfo {
    id: number;

    name: string;

    numberOfSamples: number;

    averageSamplingRate: number;

    hasStacks: boolean;
}

export interface ThreadInfo {
    key: number;

    osId: number;

    // Time when the thread started (in nanoseconds since the session start).
    startTime: number;

    // Time when the thread ended (in nanoseconds since the session start).
    endTime: number;

    name?: string;
}

export interface ProcessInfo {
    key: number;

    osId: number;

    name: string;

    // Time when the process started (in nanoseconds since the session start).
    startTime: number;

    // Time when the process ended (in nanoseconds since the session start).
    endTime: number;

    threads: ThreadInfo[];
}

export interface SessionInfo {
    commandLine: string;

    date: string;

    // Time the session was running (in nanoseconds).
    runtime: number;

    numberOfProcesses: number;

    numberOfThreads: number;

    numberOfSamples: number;
}

export interface SystemInfo {
    hostname: string;

    platform: string;

    architecture: string;

    cpuName: string;

    numberOfProcessors: number;
}

export interface HitCounts {
    sourceId: number;

    totalSamples: number;

    selfSamples: number;

    totalPercent: number;

    selfPercent: number;
}

export interface CallTreeNode {
    name: string;

    id: number;

    functionId: number;

    module: string;

    type: string;

    hits: HitCounts[];

    isHot: boolean;

    children?: CallTreeNode[];
}

export interface FunctionNode {
    name: string;

    id: number;

    module: string;

    type: string;

    hits: HitCounts[];
}

export interface ProcessFunction {
    processKey: number;

    function: FunctionNode;
}

export interface LineHits {
    lineNumber: number;

    hits: HitCounts[];
}

export interface CancelRequestParams {
    id: number | string;
}

export interface WorkDoneProgressBegin {
    kind: 'begin';

    title: string;

    cancellable?: boolean;

    message?: string;

    percentage?: number;
}

export interface WorkDoneProgressReport {
    kind: 'report';

    cancellable?: boolean;

    message?: string;

    percentage?: number;
}

export interface WorkDoneProgressEnd {
    kind: 'end';

    message?: string;
}

export interface ProgressParams {
    token: ProgressToken;

    value: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd;
}

export interface InitializeParams {
}

export interface InitializeResult {
    success: boolean;
}

export interface ReadDocumentParams extends WorkDoneProgressParams {
    filePath: string;
}

export interface ReadDocumentResult {
    documentId: number;
}

export interface RetrieveSampleSourcesParams {
    // The id of the document to perform the operation on.
    // This should be an id that resulted from a call to `readDocument`.
    documentId: number;
}

export interface RetrieveSessionInfoParams {
    // The id of the document to perform the operation on.
    // This should be an id that resulted from a call to `readDocument`.
    documentId: number;
}

export interface RetrieveSampleSourcesResult {
    sampleSources: SampleSourceInfo[];
}

export interface RetrieveSessionInfoResult {
    sessionInfo: SessionInfo;
}

export interface RetrieveSystemInfoParams {
    // The id of the document to perform the operation on.
    // This should be an id that resulted from a call to `readDocument`.
    documentId: number;
}

export interface RetrieveSystemInfoResult {
    systemInfo: SystemInfo;
}

export interface RetrieveProcessesParams {
    // The id of the document to perform the operation on.
    // This should be an id that resulted from a call to `readDocument`.
    documentId: number;
}

export interface RetrieveProcessesResult {
    processes: ProcessInfo[];
}

export interface RetrieveHottestFunctionsParams extends WorkDoneProgressParams {
    count: number;

    sourceId: number;

    // The id of the document to perform the operation on.
    // This should be an id that resulted from a call to `readDocument`.
    documentId: number;
}

export interface RetrieveHottestFunctionsResult {
    functions: ProcessFunction[];
}

export interface RetrieveCallTreeHotPathParams extends WorkDoneProgressParams {
    sourceId: number;

    processKey: number;

    // The id of the document to perform the operation on.
    // This should be an id that resulted from a call to `readDocument`.
    documentId: number;
}

export interface RetrieveCallTreeHotPathResult {
    root: CallTreeNode;
}

export interface RetrieveFunctionsPageParams extends WorkDoneProgressParams {
    sortBy: FunctionsSortBy;

    sortOrder: SortDirection;

    pageSize: number;

    pageIndex: number;

    processKey: number;

    // The id of the document to perform the operation on.
    // This should be an id that resulted from a call to `readDocument`.
    documentId: number;

    sortSourceId?: number;
}

export interface RetrieveFunctionsPageResult {
    functions: FunctionNode[];
}

export interface ExpandCallTreeNodeParams extends WorkDoneProgressParams {
    nodeId: number;

    processKey: number;

    // The id of the document to perform the operation on.
    // This should be an id that resulted from a call to `readDocument`.
    documentId: number;
}

export interface ExpandCallTreeNodeResult {
    children: CallTreeNode[];
}

export interface RetrieveCallersCalleesParams extends WorkDoneProgressParams {
    sortSourceId: number;

    maxEntries: number;

    functionId: number;

    processKey: number;

    // The id of the document to perform the operation on.
    // This should be an id that resulted from a call to `readDocument`.
    documentId: number;
}

export interface RetrieveCallersCalleesResult {
    function: FunctionNode;

    callers: FunctionNode[];

    callees: FunctionNode[];
}

export interface RetrieveLineInfoParams extends WorkDoneProgressParams {
    functionId: number;

    processKey: number;

    // The id of the document to perform the operation on.
    // This should be an id that resulted from a call to `readDocument`.
    documentId: number;
}

export interface RetrieveLineInfoResult {
    filePath: string;

    lineNumber: number;

    hits: HitCounts[];

    lineHits: LineHits[];
}

export interface CloseDocumentParams {
    // The id of the document to perform the operation on.
    // This should be an id that resulted from a call to `readDocument`.
    documentId: number;
}

export interface SetModulePathMapsParams {
    simpleMaps: [string, string][];
}

export interface SetPdbSymbolFindOptionsParams {
    searchDirs: string[];

    noDefaultUrls: boolean;

    symbolServerUrls: string[];

    symbolCacheDir?: string;
}

export interface SetDwarfSymbolFindOptionsParams {
    searchDirs: string[];

    noDefaultUrls: boolean;

    debuginfodUrls: string[];

    debuginfodCacheDir?: string;
}

export interface SetModuleFiltersParams {
    mode: ModuleFilterMode;

    // Modules to exclude when `mode` is `AllButExcluded`. Supports wildcards (as in '*.exe').
    exclude: string[];

    // Modules to include when `mode` is `IncludedOnly`. Supports wildcards (as in '*.exe').
    include: string[];
}

export interface SetSampleFiltersParams {
    excludedProcesses: number[];

    excludedThreads: number[];

    // The id of the document to perform the operation on.
    // This should be an id that resulted from a call to `readDocument`.
    documentId: number;

    // In nanoseconds since session start.
    minTime?: number;

    // In nanoseconds since session start.
    maxTime?: number;
}


export const initializeRequestType = new rpc.RequestType<InitializeParams, InitializeResult, void>('initialize');


export const shutdownRequestType = new rpc.RequestType<void, null, void>('shutdown');


export const readDocumentRequestType = new rpc.RequestType<ReadDocumentParams, ReadDocumentResult, void>('readDocument');


export const retrieveSampleSourcesRequestType = new rpc.RequestType<RetrieveSampleSourcesParams, RetrieveSampleSourcesResult, void>('retrieveSampleSources');


export const retrieveSessionInfoRequestType = new rpc.RequestType<RetrieveSessionInfoParams, RetrieveSessionInfoResult, void>('retrieveSessionInfo');


export const retrieveSystemInfoRequestType = new rpc.RequestType<RetrieveSystemInfoParams, RetrieveSystemInfoResult, void>('retrieveSystemInfo');


export const retrieveProcessesRequestType = new rpc.RequestType<RetrieveProcessesParams, RetrieveProcessesResult, void>('retrieveProcesses');


export const retrieveHottestFunctionsRequestType = new rpc.RequestType<RetrieveHottestFunctionsParams, RetrieveHottestFunctionsResult, void>('retrieveHottestFunctions');


export const retrieveCallTreeHotPathRequestType = new rpc.RequestType<RetrieveCallTreeHotPathParams, RetrieveCallTreeHotPathResult, void>('retrieveCallTreeHotPath');


export const retrieveFunctionsPageRequestType = new rpc.RequestType<RetrieveFunctionsPageParams, RetrieveFunctionsPageResult, void>('retrieveFunctionsPage');


export const expandCallTreeNodeRequestType = new rpc.RequestType<ExpandCallTreeNodeParams, ExpandCallTreeNodeResult, void>('expandCallTreeNode');


export const retrieveCallersCalleesRequestType = new rpc.RequestType<RetrieveCallersCalleesParams, RetrieveCallersCalleesResult, void>('retrieveCallersCallees');


export const retrieveLineInfoRequestType = new rpc.RequestType<RetrieveLineInfoParams, RetrieveLineInfoResult | null, void>('retrieveLineInfo');


export const setSampleFiltersRequestType = new rpc.RequestType<SetSampleFiltersParams, null, void>('setSampleFilters');


export const cancelRequestNotificationType = new rpc.NotificationType<CancelRequestParams>('$/cancelRequest');


export const progressNotificationType = new rpc.NotificationType<ProgressParams>('$/progress');


export const closeDocumentNotificationType = new rpc.NotificationType<CloseDocumentParams>('closeDocument');


export const setModulePathMapsNotificationType = new rpc.NotificationType<SetModulePathMapsParams>('setModulePathMaps');


export const setPdbSymbolFindOptionsNotificationType = new rpc.NotificationType<SetPdbSymbolFindOptionsParams>('setPdbSymbolFindOptions');


export const setDwarfSymbolFindOptionsNotificationType = new rpc.NotificationType<SetDwarfSymbolFindOptionsParams>('setDwarfSymbolFindOptions');


export const setModuleFiltersNotificationType = new rpc.NotificationType<SetModuleFiltersParams>('setModuleFilters');


export const exitNotificationType = new rpc.NotificationType<void>('exit');


export const workDoneProgressType = new rpc.ProgressType<WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd>();
