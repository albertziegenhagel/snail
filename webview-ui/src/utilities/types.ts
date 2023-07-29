import type { Func } from "mocha";
import { type } from "os";

export interface TimeSpan {
    start: number;
    end: number;
}

export interface ThreadInfo {
    id: number;
    name: string;
    startTime: number;
    endTime: number;
}

export interface ProcessInfo {
    id: number;
    name: string;
    startTime: number;
    endTime: number;
    threads: ThreadInfo[];
}

export interface FunctionNode {
    id: number;
    name: string;
    module: string;
    type: string;
    totalSamples: number;
    selfSamples: number;
    totalPercent: number;
    selfPercent: number;
};

export interface CallTreeNode {
    name: string;
    id: number;
    functionId: number;
    module: string;
    totalSamples: number;
    selfSamples: number;
    totalPercent: number;
    selfPercent: number;
    type: string;
    children: CallTreeNode[];
    isHot: boolean;
};

export interface CallerCalleeNode {
    processId : number;
    function : FunctionNode;
    callers : FunctionNode[];
    callees : FunctionNode[];
};

export interface FunctionId {
    processId : number;
    functionId : number;
};

export interface ProcessFunction {
    processId : number;
    function : FunctionNode;
};
