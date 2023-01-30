<script lang="ts">
  import { onMount } from "svelte";

  import { vscode } from "./utilities/vscode";
  import type {
    ProcessInfo,
    FunctionId,
    CallerCalleeNode,
    CallTreeNode,
    TimeSpan,
    ProcessFunction,
  } from "./utilities/types";

  import {
    provideVSCodeDesignSystem,
    vsCodePanels,
    vsCodePanelView,
    vsCodePanelTab,
    vsCodeProgressRing,
  } from "@vscode/webview-ui-toolkit";

  import Summary from "./Summary.svelte";
  import CallTree from "./CallTree.svelte";
  import CallerCallee from "./CallerCallee.svelte";

  provideVSCodeDesignSystem().register(
    vsCodePanels(),
    vsCodePanelTab(),
    vsCodePanelView(),
    vsCodeProgressRing()
  );

  let totalTime: TimeSpan = null;
  let sessionInfo = null;
  let systemInfo = null;
  let processes: ProcessInfo[] = null;

  let activeFunction: FunctionId = null;

  let activeCallerCalleeNode: CallerCalleeNode = null;

  let callTreeRoots: Map<number, CallTreeNode> = null;

  let hotFunctions: ProcessFunction[] = null;

  onMount(() => {
    vscode.postMessage({ command: "retrieve_session_info" });
    vscode.postMessage({ command: "retrieve_system_info" });
    vscode.postMessage({ command: "retrieve_processes" });
    vscode.postMessage({ command: "retrieve_hottest_functions" });
  });

  function changeActiveFunction(functionId: FunctionId, navigate = true) {
    activeFunction = functionId;
    vscode.postMessage({
      command: "retrieve_callers_callees",
      processId: activeFunction.process_id,
      functionId: activeFunction.function_id,
    });
    if(navigate) {
      vscode.postMessage({
        command: "navigate_to_function",
        processId: activeFunction.process_id,
        functionId: activeFunction.function_id,
      });
    }
  }

  window.addEventListener("message", (event) => {
    if (event.data.type === "session_info") {
      const info = event.data.data["session_info"];
      const date = new Date(Date.parse(info.date));
      sessionInfo = [
        { key: "Command", value: info.command_line },
        { key: "Date", value: date.toLocaleString() },
        {
          key: "Runtime",
          value: `${(info.runtime / 1e9).toFixed(4)} seconds`,
        },
        { key: "Processes", value: info.number_of_processes },
        { key: "Threads", value: info.number_of_threads },
        { key: "Total Samples", value: info.number_of_samples },
        {
          key: "Average Sample Rate",
          value: `${info.average_sampling_rate.toFixed(4)} samples/s`,
        },
      ];
      totalTime = {
        start: 0,
        end: info.runtime,
      };
    }
    if (event.data.type === "system_info") {
      const info = event.data.data["system_info"];
      systemInfo = [
        { key: "Hostname", value: info.hostname },
        { key: "Platform", value: info.platform },
        { key: "Architecture", value: info.architecture },
        { key: "CPU", value: info.cpu_name },
        { key: "Processors", value: info.number_of_processors },
      ];
    }
    if (event.data.type === "processes") {
      processes = event.data.data;
      for (const process of processes) {
        if (callTreeRoots === null || !(process.id in callTreeRoots)) {
          vscode.postMessage({
            command: "retrieve_call_tree_hot_path",
            processId: process.id,
          });
          if (callTreeRoots === null) {
            callTreeRoots = new Map<number, CallTreeNode>();
          }
          callTreeRoots.set(process.id, null);
        }
      }
      if (callTreeRoots !== null) {
        for (let processId of callTreeRoots.keys()) {
          let hasProcess = false;
          for (const process of processes) {
            if (process.id === processId) {
              hasProcess = true;
              break;
            }
          }
          if (!hasProcess) {
            callTreeRoots.delete(processId);
          }
        }
      }
      callTreeRoots = callTreeRoots;
    }

    if (event.data.type === "callers_callees") {
      if (event.data.data["process_id"] !== activeFunction?.process_id) return;
      if (event.data.data["function"]["id"] !== activeFunction?.function_id)
        return;
      activeCallerCalleeNode = {
        process_id: activeFunction.process_id,
        function: event.data.data["function"],
        callers: event.data.data["callers"],
        callees: event.data.data["callees"],
      };
    }

    if (event.data.type === "call_tree_hot_path") {
      callTreeRoots.set(event.data.data["process_id"], event.data.data["root"]);
      callTreeRoots = callTreeRoots;
    }

    if (event.data.type === "hottest_functions") {
      hotFunctions = event.data.data["functions"];
      if (activeFunction == null && hotFunctions.length > 0) {
        changeActiveFunction({
          process_id: hotFunctions[0].process_id,
          function_id: hotFunctions[0].function.id,
        }, false);
      }
    }
  });
</script>

<main>
  <vscode-panels>
    <vscode-panel-tab id="summary-tab">Summary</vscode-panel-tab>
    <vscode-panel-tab id="call-tree-tab">Call Tree</vscode-panel-tab>
    <vscode-panel-tab id="caller-callee-tab">Caller/Callee</vscode-panel-tab>
    <vscode-panel-tab id="modules-tab">Modules</vscode-panel-tab>
    <vscode-panel-tab id="functions-tab">Functions</vscode-panel-tab>
    <!-- <vscode-panel-tab id="flame-graph-tab">FLAME GRAPH</vscode-panel-tab> -->

    <vscode-panel-view id="summary-view">
      <section>
        <Summary
          on:navigate={(event) => changeActiveFunction(event.detail.functionId)}
          {processes}
          {totalTime}
          {sessionInfo}
          {systemInfo}
          {hotFunctions}
          {activeFunction}
        />
      </section>
    </vscode-panel-view>

    <vscode-panel-view id="call-tree-view">
      <section>
        <CallTree
          on:navigate={(event) => changeActiveFunction(event.detail.functionId)}
          roots={callTreeRoots}
          {activeFunction}
        />
      </section>
    </vscode-panel-view>

    <vscode-panel-view id="caller-callee-view">
      <section>
        <CallerCallee
          on:navigate={(event) => changeActiveFunction(event.detail.functionId)}
          node={activeCallerCalleeNode}
        />
      </section>
    </vscode-panel-view>

    <vscode-panel-view id="modules-view">
      <section>modules...</section>
    </vscode-panel-view>

    <vscode-panel-view id="functions-view">
      <section>functions...</section>
    </vscode-panel-view>

    <!-- <vscode-panel-view id="flame-graph-view">
      flame graph.
    </vscode-panel-view> -->
  </vscode-panels>
</main>

<style>
  main {
    height: 100%;
    padding: 0 8px;
  }
  vscode-panels {
    height: 100%;
  }
  vscode-panel-tab {
    text-transform: uppercase;
  }
  /* :global(vscode-panels) :global(.tablist) {
    background-color: var(--background);
    position: sticky;
    top: 0;
  } */
  vscode-panel-view {
    height: 100%;
    padding-left: calc(var(--design-unit) * 1px);
    padding-right: calc(var(--design-unit) * 1px);
  }
  vscode-panel-view > section {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  }
</style>
