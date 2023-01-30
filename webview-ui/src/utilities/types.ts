import type { Func } from "mocha";
import { type } from "os";

export interface TimeSpan {
    start: number;
    end: number;
}

export interface ThreadInfo {
    id: number;
    name: string;
    start_time: number;
    end_time: number;
}

export interface ProcessInfo {
    id: number;
    name: string;
    start_time: number;
    end_time: number;
    threads: ThreadInfo[];
}

export interface FunctionNode {
    id: number;
    name: string;
    module: string;
    type: string;
    total_samples: number;
    self_samples: number;
    total_percent: number;
    self_percent: number;
};

export interface CallTreeNode {
    name: string;
    id: number;
    function_id: number;
    module: string;
    total_samples: number;
    self_samples: number;
    total_percent: number;
    self_percent: number;
    type: string;
    children: CallTreeNode[];
    is_hot: boolean;
};

export interface CallerCalleeNode {
    process_id : number;
    function : FunctionNode;
    callers : FunctionNode[];
    callees : FunctionNode[];
};

export interface FunctionId {
    process_id : number;
    function_id : number;
};

export interface ProcessFunction {
    process_id : number;
    function : FunctionNode;
};
