import type { Func } from "mocha";
import { type } from "os";

export interface TimeSpan {
    start: number;
    end: number;
}

export interface ThreadInfo {
    key: number;
    osId: number;
    name: string;
    startTime: number;
    endTime: number;
}

export interface ProcessInfo {
    key: number;
    osId: number;
    name: string;
    startTime: number;
    endTime: number;
    threads: ThreadInfo[];
}

export interface HitCounts {
    sourceId: number;
    totalSamples: number;
    selfSamples: number;
    totalPercent: number;
    selfPercent: number;
}

export interface FunctionNode {
    id: number;
    name: string;
    module: string;
    type: string;
    hits: HitCounts[];
};

export interface SampleSourceInfo {
    id: number;
    name: string;
    numberOfSamples: number;
    averageSamplingRate: number;
    hasStacks: boolean;
}

export interface CallTreeNode {
    name: string;
    id: number;
    functionId: number;
    module: string;
    hits: HitCounts[];
    type: string;
    children: CallTreeNode[];
    isHot: boolean;
};

export interface CallerCalleeNode {
    processKey : number;
    function : FunctionNode;
    callers : FunctionNode[];
    callees : FunctionNode[];
};

export interface FunctionId {
    processKey : number;
    functionId : number;
};

export interface ProcessFunction {
    processKey: number;
    function : FunctionNode;
};

export interface ProcessFunctions {
    processKey: number;
    functions : FunctionNode[];
};
