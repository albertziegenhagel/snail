import type { Func } from "mocha";
import { type } from "os";

export interface TimeSpan {
    start: number;
    end: number;
}

export interface PmcCounterInfo {
    count: number;

    name?: string;
}

export interface ThreadStatistics {
    contextSwitches?: number;

    pmcCounters?: PmcCounterInfo[];
}

export interface ProcessStatistics {
    contextSwitches?: number;

    pmcCounters?: PmcCounterInfo[];
}

export interface ThreadInfo {
    key: number;
    osId: number;
    name: string;
    startTime: number;
    endTime: number;
    statistics: ThreadStatistics;
}

export interface ProcessInfo {
    key: number;
    osId: number;
    name: string;
    startTime: number;
    endTime: number;
    threads: ThreadInfo[];
    statistics: ProcessStatistics;
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

export interface SampleCountInfo{
    sourceId: number;

    numberOfSamples: number;
}

export interface ThreadSampleInfo{
    key: number;

    counts: SampleCountInfo[];
}

export interface ProcessSampleInfo{
    counts: SampleCountInfo[];

    threads: ThreadSampleInfo[];
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
    processKey: number;
    function: FunctionNode;
    callers: FunctionNode[];
    callees: FunctionNode[];
};

export interface FunctionId {
    processKey: number;
    functionId: number;
};

export interface ProcessFunction {
    processKey: number;
    function: FunctionNode;
};

export interface ProcessFunctions {
    processKey: number;
    functions: FunctionNode[];
};

export interface InfoEntry {
    key: string;
    value: string;
}

export interface ExpansionState {
    expanded: boolean | null;

    children: Map<number, ExpansionState>
}
