<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteMap } from 'svelte/reactivity';

  import { vscode } from "./utilities/vscode";
  import type {
    ProcessInfo,
    FunctionId,
    CallerCalleeNode,
    CallTreeNode,
    TimeSpan,
    ProcessFunction,
    SampleSourceInfo,
    InfoEntry,
  } from "./utilities/types";

  import {
    provideVSCodeDesignSystem,
    vsCodeProgressRing,
  } from "@vscode/webview-ui-toolkit";

  import "@vscode-elements/elements";

  import Summary from "./Summary.svelte";
  import CallTree from "./CallTree.svelte";
  import CallerCallee from "./CallerCallee.svelte";
  import FunctionsPage from "./FunctionsPage.svelte";

  provideVSCodeDesignSystem().register(
    vsCodeProgressRing(),
  );

  let totalTime: TimeSpan | null = $state(null);
  let sampleSources: SampleSourceInfo[] = $state([]);
  let sourceInfo: InfoEntry[] | null = $state(null);
  let sessionInfo: InfoEntry[] | null = $state(null);
  let systemInfo: InfoEntry[] | null = $state(null);
  let processes: ProcessInfo[] | null = $state(null);

  let activeHotSourceIndex: number | null = $state(null);
  let activeMainSourceIndex: number | null = $state(null);

  let activeFunction: FunctionId | null = $state(null);

  let activeCallerCalleeNode: CallerCalleeNode | null = $state(null);

  let callTreeRoots: SvelteMap<number, CallTreeNode | null> | null = $state(null);

  let hotFunctions: ProcessFunction[] | null = $state(null);

  let activeSelectionFilter: TimeSpan | null = $state(null);

  onMount(() => {
    vscode.postMessage({ command: "retrieveSampleSources" });
    vscode.postMessage({ command: "retrieveSessionInfo" });
    vscode.postMessage({ command: "retrieveSystemInfo" });
    vscode.postMessage({ command: "retrieveProcesses" });
  });

  function changeActiveFunction(functionId: FunctionId, navigate = true) {
    activeFunction = functionId;
    vscode.postMessage({
      command: "retrieveCallersCallees",
      processKey: activeFunction.processKey,
      functionId: activeFunction.functionId,
      sortSourceId:
        activeMainSourceIndex !== null
          ? sampleSources[activeMainSourceIndex].id
          : null,
    });
    if (navigate) {
      vscode.postMessage({
        command: "navigateToFunction",
        processKey: activeFunction.processKey,
        functionId: activeFunction.functionId,
        sampleSources: $state.snapshot(sampleSources),
        sourceIndex: activeMainSourceIndex,
      });
    }
  }

  function applyFilter(
    minTime: number | null,
    maxTime: number | null,
    excludedProcesses: number[],
    excludedThreads: number[],
  ) {
    vscode.postMessage({
      command: "setSampleFilter",
      minTime: minTime,
      maxTime: maxTime,
      excludedProcesses: excludedProcesses,
      excludedThreads: excludedThreads,
    });
  }

  window.addEventListener("message", (event) => {
    if (event.data.type === "sampleSources") {
      const sources: any[] = event.data.data;
      const oldSampleSources = sampleSources;
      sampleSources = sources;
      if (sources.length == 0) {
        activeMainSourceIndex = null;
        activeHotSourceIndex = null;
      } else {
        const timerSourceIndex = sources.findIndex(
          (sourceInfo) =>
            sourceInfo.name === "Timer" || sourceInfo.name.startsWith("cycles"),
        );
        const timerSource =
          timerSourceIndex === -1 ? undefined : sources[timerSourceIndex];

        const activeMainSourceId =
          activeMainSourceIndex !== null
            ? oldSampleSources[activeMainSourceIndex].id
            : null;
        const activeMainSource = sources.find(
          (sourceInfo) => sourceInfo.id === activeMainSourceId,
        );
        if (activeMainSource === undefined) {
          if (timerSource !== undefined) {
            activeMainSourceIndex = timerSourceIndex;
          } else {
            activeMainSourceIndex = 0;
          }
        }

        const activeHotSourceId =
          activeHotSourceIndex !== null
            ? oldSampleSources[activeHotSourceIndex].id
            : null;
        const activeHotSource = sources.find(
          (sourceInfo) => sourceInfo.id === activeHotSourceId,
        );
        if (activeHotSource === undefined) {
          if (timerSource !== undefined) {
            activeHotSourceIndex = timerSourceIndex;
          } else {
            activeHotSourceIndex = 0;
          }
          vscode.postMessage({
            command: "retrieveHottestFunctions",
            sourceId: sampleSources[activeHotSourceIndex].id,
          });
        }
      }
      let newSourceInfo = [];
      for (const source of sources) {
        newSourceInfo.push({
          key: source.name,
          value: `${source.numberOfSamples} samples (${source.averageSamplingRate.toFixed(0)} samples/s) ; ${source.hasStacks ? "has" : "no"} stacks`,
        });
      }
      sourceInfo = newSourceInfo;
    }
    if (event.data.type === "sessionInfo") {
      const info = event.data.data;
      const date = new Date(Date.parse(info.date));
      sessionInfo = [
        { key: "Command", value: info.commandLine },
        { key: "Date", value: date.toLocaleString() },
        {
          key: "Runtime",
          value: `${(info.runtime / 1e9).toFixed(4)} seconds`,
        },
        { key: "Processes", value: info.numberOfProcesses },
        { key: "Threads", value: info.numberOfThreads },
        { key: "Total Samples", value: info.numberOfSamples },
      ];
      totalTime = {
        start: 0,
        end: info.runtime,
      };
    }
    if (event.data.type === "systemInfo") {
      const info = event.data.data;
      systemInfo = [
        { key: "Hostname", value: info.hostname },
        { key: "Platform", value: info.platform },
        { key: "Architecture", value: info.architecture },
        { key: "CPU", value: info.cpuName },
        { key: "Processors", value: info.numberOfProcessors },
      ];
    }
    if (event.data.type === "processes") {
      processes = event.data.data;
      if (processes === null) {
        processes = [];
      }
      for (const process of processes) {
        if (callTreeRoots === null || !(process.key in callTreeRoots)) {
          vscode.postMessage({
            command: "retrieveCallTreeHotPath",
            processKey: process.key,
            sourceId:
              activeHotSourceIndex !== null
                ? sampleSources[activeHotSourceIndex].id
                : null,
          });
          if (callTreeRoots === null) {
            callTreeRoots = new SvelteMap<number, CallTreeNode>();
          }
          callTreeRoots.set(process.key, null);
        }
      }
      if (callTreeRoots !== null) {
        for (let processKey of callTreeRoots.keys()) {
          let hasProcess = false;
          for (const process of processes) {
            if (process.key === processKey) {
              hasProcess = true;
              break;
            }
          }
          if (!hasProcess) {
            callTreeRoots.delete(processKey);
          }
        }
      }
    }

    if (event.data.type === "filterSet") {
      if (
        event.data.data["minTime"] === null &&
        event.data.data["maxTime"] === null
      ) {
        activeSelectionFilter = null;
      } else {
        activeSelectionFilter = {
          start: event.data.data["minTime"],
          end: event.data.data["maxTime"],
        };
      }
      activeFunction = null;
      activeCallerCalleeNode = null;
      callTreeRoots = null;
      hotFunctions = null;
      callTreeRoots = new SvelteMap<number, CallTreeNode>();
      if (processes !== null) {
        for (const process of processes) {
          vscode.postMessage({
            command: "retrieveCallTreeHotPath",
            processKey: process.key,
            sourceId:
              activeHotSourceIndex !== null
                ? sampleSources[activeHotSourceIndex].id
                : null,
          });
        }
      }
      vscode.postMessage({
        command: "retrieveHottestFunctions",
        sourceId:
          activeHotSourceIndex !== null
            ? sampleSources[activeHotSourceIndex].id
            : null,
      });
    }

    if (event.data.type === "callersCallees") {
      if (activeFunction === null) return;
      if (event.data.data["processKey"] !== activeFunction.processKey) return;
      if (event.data.data["function"]["id"] !== activeFunction.functionId)
        return;
      activeCallerCalleeNode = {
        processKey: activeFunction.processKey,
        function: event.data.data["function"],
        callers: event.data.data["callers"],
        callees: event.data.data["callees"],
      };
    }

    if (event.data.type === "callTreeHotPath") {
      if (callTreeRoots === null) return;
      callTreeRoots.set(event.data.data["processKey"], event.data.data["root"]);
    }

    if (event.data.type === "hottestFunctions") {
      hotFunctions = event.data.data["functions"];
      if (hotFunctions === null) return;
      if (activeFunction === null && hotFunctions.length > 0) {
        changeActiveFunction(
          {
            processKey: hotFunctions[0].processKey,
            functionId: hotFunctions[0].function.id,
          },
          false,
        );
      }
    }
  });
</script>

<main>
  <vscode-tabs panel>
    <vscode-tab-header slot="header" id="summary-tab">Summary</vscode-tab-header>
    <vscode-tab-header slot="header" id="call-tree-tab">Call Tree</vscode-tab-header>
    <vscode-tab-header slot="header" id="caller-callee-tab">Caller/Callee</vscode-tab-header>
    <vscode-tab-header slot="header" id="functions-tab">Functions</vscode-tab-header>

    <vscode-tab-panel id="summary-view">
      <vscode-scrollable>
        <Summary
          navigate={(functionId) => changeActiveFunction(functionId)}
          filter={(timeSpan, excludedProcesses, excludedThreads) =>
            applyFilter(
              timeSpan ? timeSpan.start : null,
              timeSpan ? timeSpan.end : null,
              excludedProcesses,
              excludedThreads,
            )}
          {processes}
          {totalTime}
          {sampleSources}
          {sessionInfo}
          {systemInfo}
          {sourceInfo}
          {hotFunctions}
          {activeFunction}
          {activeSelectionFilter}
        />
      </vscode-scrollable>
    </vscode-tab-panel>

    <vscode-tab-panel id="call-tree-view">
      <vscode-scrollable>
        <CallTree
          navigate={(functionId) => changeActiveFunction(functionId)}
          roots={callTreeRoots}
          hotSourceIndex={activeHotSourceIndex}
          {sampleSources}
          {activeFunction}
        />
      </vscode-scrollable>
    </vscode-tab-panel>

    <vscode-tab-panel id="caller-callee-view" class="full-panel">
      <section>
        <CallerCallee
          navigate={(functionId) => changeActiveFunction(functionId)}
          node={activeCallerCalleeNode}
          activeSourceIndex={activeMainSourceIndex}
        />
      </section>
    </vscode-tab-panel>

    <vscode-tab-panel id="functions-view">
      <vscode-scrollable>
        <FunctionsPage
          navigate={(functionId) => changeActiveFunction(functionId)}
          {sampleSources}
          {processes}
          {activeFunction}
        />
      </vscode-scrollable>
    </vscode-tab-panel>

    <!-- <vscode-tab-panel id="flame-graph-view">
      flame graph.
    </vscode-tab-panel> -->
  </vscode-tabs>
</main>

<style>
  main {
    height: 100%;
  }
  vscode-tabs {
    height: 100%;
    --vscode-panel-background: var(--background);
    display: flex;
    flex-direction: column;
  }
  /* :global(vscode-tabs > .header.panel) {
    background-color: var(--background);
  } */
  vscode-tab-header {
    text-transform: uppercase;
  }
  vscode-tab-panel {
    background-color: var(--background);
    flex: 1;
    overflow: auto;
    padding: 0 8px;
  }
  vscode-scrollable {
    height: 100%;
  }

  section {
    height: 100%;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  }
</style>
