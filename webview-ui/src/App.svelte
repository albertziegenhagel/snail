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
    SampleSourceInfo,
    InfoEntry,
  } from "./utilities/types";

  import {
    provideVSCodeDesignSystem,
    vsCodePanels,
    vsCodePanelView,
    vsCodePanelTab,
    vsCodeProgressRing,
    vsCodeButton
  } from "@vscode/webview-ui-toolkit";

  import Summary from "./Summary.svelte";
  import CallTree from "./CallTree.svelte";
  import CallerCallee from "./CallerCallee.svelte";
  import FunctionsPage from "./FunctionsPage.svelte";

  provideVSCodeDesignSystem().register(
    vsCodePanels(),
    vsCodePanelTab(),
    vsCodePanelView(),
    vsCodeProgressRing(),
    vsCodeButton()
  );

  let totalTime: TimeSpan|null = null;
  let sampleSources: SampleSourceInfo[] = [];
  let sourceInfo: InfoEntry[]|null = null;
  let sessionInfo: InfoEntry[]|null = null;
  let systemInfo: InfoEntry[]|null = null;
  let processes: ProcessInfo[]|null = null;

  let activeHotSourceIndex: number|null = null;
  let activeMainSourceIndex: number|null = null;

  let activeFunction: FunctionId|null = null;

  let activeCallerCalleeNode: CallerCalleeNode|null = null;

  let callTreeRoots: Map<number, CallTreeNode|null>|null = null;

  let hotFunctions: ProcessFunction[]|null = null;

  let activeSelectionFilter: TimeSpan|null = null;

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
      sortSourceId: activeMainSourceIndex !== null ? sampleSources[activeMainSourceIndex].id : null,
    });
    if(navigate) {
      vscode.postMessage({
        command: "navigateToFunction",
        processKey: activeFunction.processKey,
        functionId: activeFunction.functionId,
        sampleSources: sampleSources,
        sourceIndex: activeMainSourceIndex,
      });
    }
  }

  function applyFilter(minTime: number|null, maxTime: number|null, excludedProcesses: number[], excludedThreads: number[]) {
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
      const sources : any[] = event.data.data;
      const oldSampleSources = sampleSources;
      sampleSources = sources;
      if(sources.length == 0) {
        activeMainSourceIndex = null;
        activeHotSourceIndex = null;
      }
      else {
        const timerSourceIndex = sources.findIndex(sourceInfo => sourceInfo.name === "Timer" || sourceInfo.name.startsWith("cycles"));
        const timerSource = timerSourceIndex === -1 ? undefined : sources[timerSourceIndex];

        const activeMainSourceId = activeMainSourceIndex !== null ? oldSampleSources[activeMainSourceIndex].id : null;
        const activeMainSource = sources.find(sourceInfo => sourceInfo.id === activeMainSourceId);
        if(activeMainSource === undefined) {
          if(timerSource !== undefined) {
            activeMainSourceIndex = timerSourceIndex;
          }
          else {
            activeMainSourceIndex = 0;
          }
        }

        const activeHotSourceId = activeHotSourceIndex !== null ? oldSampleSources[activeHotSourceIndex].id : null;
        const activeHotSource = sources.find(sourceInfo => sourceInfo.id === activeHotSourceId);
        if(activeHotSource === undefined) {
          if(timerSource !== undefined) {
            activeHotSourceIndex = timerSourceIndex;
          }
          else {
            activeHotSourceIndex = 0;
          }
          vscode.postMessage({ command: "retrieveHottestFunctions", sourceId: sampleSources[activeHotSourceIndex].id });
        }
      }
      let newSourceInfo = []
      for (const source of sources) {
        newSourceInfo.push(
          {key: source.name, value: `${source.numberOfSamples} samples (${source.averageSamplingRate.toFixed(0)} samples/s) ; ${source.hasStacks ? "has" : "no"} stacks`}
        )
      }
      sourceInfo = newSourceInfo
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
      if(processes === null) {
        processes = [];
      }
      for (const process of processes) {
        if (callTreeRoots === null || !(process.key in callTreeRoots)) {
          vscode.postMessage({
            command: "retrieveCallTreeHotPath",
            processKey: process.key,
            sourceId: activeHotSourceIndex !== null ? sampleSources[activeHotSourceIndex].id : null,
          });
          if (callTreeRoots === null) {
            callTreeRoots = new Map<number, CallTreeNode>();
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
      callTreeRoots = callTreeRoots;
    }

    if (event.data.type === "filterSet") {
      console.log(event.data.data);
      if(event.data.data["minTime"] === null && event.data.data["maxTime"] === null)
      {
        activeSelectionFilter = null;
      }
      else {
        activeSelectionFilter = {
          start: event.data.data["minTime"],
          end: event.data.data["maxTime"]
        };
      }
      activeFunction = null;
      activeCallerCalleeNode = null;
      callTreeRoots = null;
      hotFunctions = null;
      callTreeRoots = new Map<number, CallTreeNode>();
      if(processes !== null){
      for (const process of processes) {
        vscode.postMessage({
          command: "retrieveCallTreeHotPath",
          processKey: process.key,
          sourceId: activeHotSourceIndex !== null ? sampleSources[activeHotSourceIndex].id : null
        });
      }}
      vscode.postMessage({ command: "retrieveHottestFunctions", sourceId : activeHotSourceIndex !== null ? sampleSources[activeHotSourceIndex].id : null });
    }

    if (event.data.type === "callersCallees") {
      if (activeFunction === null) return;
      if (event.data.data["processKey"] !== activeFunction.processKey) return;
      if (event.data.data["function"]["id"] !== activeFunction.functionId) return;
      activeCallerCalleeNode = {
        processKey: activeFunction.processKey,
        function: event.data.data["function"],
        callers: event.data.data["callers"],
        callees: event.data.data["callees"],
      };
    }

    if (event.data.type === "callTreeHotPath") {
      if(callTreeRoots === null) return;
      callTreeRoots.set(event.data.data["processKey"], event.data.data["root"]);
      callTreeRoots = callTreeRoots;
    }

    if (event.data.type === "hottestFunctions") {
      hotFunctions = event.data.data["functions"];
      if(hotFunctions === null) return;
      if (activeFunction === null && hotFunctions.length > 0) {
        changeActiveFunction({
          processKey: hotFunctions[0].processKey,
          functionId: hotFunctions[0].function.id,
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
          on:filter={(event) => applyFilter(event.detail.minTime, event.detail.maxTime, event.detail.excludedProcesses, event.detail.excludedThreads)}
          processes={processes}
          totalTime={totalTime}
          sampleSources={sampleSources}
          sessionInfo={sessionInfo}
          systemInfo={systemInfo}
          sourceInfo={sourceInfo}
          hotFunctions={hotFunctions}
          activeFunction={activeFunction}
          activeSelectionFilter={activeSelectionFilter}
        />
      </section>
    </vscode-panel-view>

    <vscode-panel-view id="call-tree-view">
      <section>
        <CallTree
          on:navigate={(event) => changeActiveFunction(event.detail.functionId)}
          roots={callTreeRoots}
          hotSourceIndex={activeHotSourceIndex}
          sampleSources={sampleSources}
          {activeFunction}
        />
      </section>
    </vscode-panel-view>

    <vscode-panel-view id="caller-callee-view">
      <section>
        <CallerCallee
          on:navigate={(event) => changeActiveFunction(event.detail.functionId)}
          node={activeCallerCalleeNode}
          activeSourceIndex={activeMainSourceIndex}
        />
      </section>
    </vscode-panel-view>

    <vscode-panel-view id="modules-view">
      <section>modules...</section>
    </vscode-panel-view>

    <vscode-panel-view id="functions-view">
      <section>
        <FunctionsPage
          on:navigate={(event) => changeActiveFunction(event.detail.functionId)}
          sampleSources={sampleSources}
          processes={processes}
          activeFunction={activeFunction}
        />
      </section>
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
