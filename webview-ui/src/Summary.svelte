<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Pane from "./components/Pane.svelte";
  import FunctionTable from "./components/FunctionTable.svelte";
  import FunctionTableRow from "./components/FunctionTableRow.svelte";
  import TimeLine from "./components/TimeLine.svelte";
  import InfoTable from "./components/InfoTable.svelte";
  import type {
    FunctionId,
    ProcessFunction,
    ProcessInfo,
    TimeSpan,
    SampleSourceInfo,
    InfoEntry,
  } from "./utilities/types";

  export let processes: ProcessInfo[] | null = null;
  export let totalTime: TimeSpan | null = null;
  export let sampleSources: SampleSourceInfo[];
  export let sessionInfo: InfoEntry[] | null = null;
  export let systemInfo: InfoEntry[] | null = null;
  export let sourceInfo: InfoEntry[] | null = null;

  export let hotFunctions: ProcessFunction[] | null = null;
  export let activeFunction: FunctionId | null;

  export let activeSelectionFilter: TimeSpan | null = null;

  let activeSelection: TimeSpan | null;

  let wipSelectionFilter: TimeSpan | null = null;

  let excludedProcesses: number[] = [];
  let excludedThreads: number[] = [];

  let activeExcludedProcesses: number[] = [];
  let activeExcludedThreads: number[] = [];

  const dispatch = createEventDispatcher();

  $: hasSelection = activeSelection !== null;

  $: hasSelectionFilter =
    activeSelectionFilter !== null &&
    (activeSelectionFilter.start !== null ||
      activeSelectionFilter.end !== null);

  $: displayTime = totalTime;

  $: isZoomed =
    totalTime !== null &&
    displayTime !== null &&
    (displayTime.start > totalTime.start || displayTime.end < totalTime.end);

  function arrayEquals(a: number[], b: number[]) {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  $: hasFilterChanges =
    hasSelection ||
    !arrayEquals(excludedProcesses, activeExcludedProcesses) ||
    !arrayEquals(excludedThreads, activeExcludedThreads);

  function clearSelection() {
    activeSelection = null;
  }

  function applyFiler() {
    if (activeSelection !== null) {
      wipSelectionFilter = {
        start: activeSelection.start,
        end: activeSelection.end,
      };
    } else if (activeSelectionFilter !== null) {
      wipSelectionFilter = {
        start: activeSelectionFilter.start,
        end: activeSelectionFilter.end,
      };
    } else {
      wipSelectionFilter = null;
    }
    dispatch("filter", {
      minTime: wipSelectionFilter?.start,
      maxTime: wipSelectionFilter?.end,
      excludedProcesses: excludedProcesses,
      excludedThreads: excludedThreads,
    });
    activeExcludedProcesses = [...excludedProcesses];
    activeExcludedThreads = [...excludedThreads];
    zoomToSelection();
  }

  function clearSelectionFilter() {
    wipSelectionFilter = null;
    dispatch("filter", {
      minTime: null,
      maxTime: null,
      excludedProcesses: excludedProcesses,
      excludedThreads: excludedThreads,
    });
    resetZoom();
  }

  function zoomToSelection() {
    if (activeSelection === null) {
      return;
    }
    displayTime = activeSelection;
    activeSelection = null;
  }
  function resetZoom() {
    displayTime = totalTime;
  }
</script>

<div class="container">
  <Pane title="Timeline">
    <TimeLine
      bind:selection={activeSelection}
      {displayTime}
      {processes}
      {activeSelectionFilter}
      bind:uncheckedProcesses={excludedProcesses}
      bind:uncheckedThreads={excludedThreads}
    />

    <div class="toolbar-buttons" slot="toolbar">
      <vscode-button
        role="button"
        tabindex="0"
        appearance="icon"
        aria-label="Apply Filter"
        title="Apply Filter"
        disabled={!hasFilterChanges}
        on:click|stopPropagation={applyFiler}
        on:keypress|stopPropagation={applyFiler}
      >
        <span class="codicon codicon-filter"></span>
      </vscode-button>
      <vscode-button
        role="button"
        tabindex="0"
        appearance="icon"
        aria-label="Reset Selection Filter"
        title="Reset Selection Filter"
        disabled={!hasSelectionFilter}
        on:click|stopPropagation={clearSelectionFilter}
        on:keypress|stopPropagation={clearSelectionFilter}
      >
        <!-- <span class="codicon codicon-refresh"></span> -->
        <span class="icon-group">
          <span class="codicon codicon-filter"></span>
          <span class="icon-corner codicon codicon-error"></span>
        </span>
      </vscode-button>

      <vscode-button
        role="button"
        tabindex="0"
        appearance="icon"
        aria-label="Clear Selection"
        title="Clear Selection"
        disabled={!hasSelection}
        on:click|stopPropagation={clearSelection}
        on:keypress|stopPropagation={clearSelection}
      >
        <span class="codicon codicon-clear-all"></span>
      </vscode-button>

      <vscode-button
        role="button"
        tabindex="0"
        appearance="icon"
        aria-label="Zoom to Selection"
        title="Zoom to Selection"
        disabled={!hasSelection}
        on:click|stopPropagation={zoomToSelection}
        on:keypress|stopPropagation={zoomToSelection}
      >
        <span class="codicon codicon-zoom-in"></span>
      </vscode-button>
      <vscode-button
        role="button"
        tabindex="0"
        appearance="icon"
        aria-label="Reset Zoom"
        title="Reset Zoom"
        disabled={!isZoomed}
        on:click|stopPropagation={resetZoom}
        on:keypress|stopPropagation={resetZoom}
      >
        <span class="codicon codicon-zoom-out"></span>
      </vscode-button>
    </div>
  </Pane>
  <Pane title="Hot spots">
    <FunctionTable {sampleSources}>
      {#if hotFunctions !== null}
        {#each hotFunctions as func}
          <FunctionTableRow
            on:navigate={() =>
              dispatch("navigate", {
                functionId: {
                  processKey: func.processKey,
                  functionId: func.function.id,
                },
              })}
            node={func.function}
            isHot={true}
            {sampleSources}
            isActive={func.processKey == activeFunction?.processKey &&
              func.function.id == activeFunction?.functionId}
          />
        {/each}
      {:else}
        <!-- Placeholders -->
        <FunctionTableRow node={null} isHot={true} {sampleSources} />
        <FunctionTableRow node={null} isHot={true} {sampleSources} />
        <FunctionTableRow node={null} isHot={true} {sampleSources} />
        <FunctionTableRow node={null} isHot={true} {sampleSources} />
      {/if}
    </FunctionTable>
  </Pane>
  <Pane title="Session Info">
    <InfoTable entries={sessionInfo} />
  </Pane>
  <Pane title="Sample Sources">
    <InfoTable entries={sourceInfo} />
  </Pane>
  <Pane title="System Info">
    <InfoTable entries={systemInfo} />
  </Pane>
</div>

<style>
  .toolbar-buttons {
    display: flex;
    gap: 4px;
    margin-left: 2px;
    margin-right: 2px;
  }

  .icon-group {
    position: relative;
  }

  span.icon-corner {
    position: absolute;
    bottom: 0;
    right: -2px;
    font-size: 8px;
    font-weight: bold;
  }
</style>
