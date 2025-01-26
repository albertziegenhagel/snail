<script lang="ts">
  import { run, stopPropagation } from "svelte/legacy";

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

  interface Props {
    processes?: ProcessInfo[] | null;
    totalTime?: TimeSpan | null;
    sampleSources: SampleSourceInfo[];
    sessionInfo?: InfoEntry[] | null;
    systemInfo?: InfoEntry[] | null;
    sourceInfo?: InfoEntry[] | null;
    hotFunctions?: ProcessFunction[] | null;
    activeFunction: FunctionId | null;
    activeSelectionFilter?: TimeSpan | null;
    navigate: (functionId: FunctionId) => void;
    filter: (
      timeSpan: TimeSpan | null,
      excludedProcesses: number[],
      excludedThreads: number[],
    ) => void;
  }

  let {
    processes = null,
    totalTime = null,
    sampleSources,
    sessionInfo = null,
    systemInfo = null,
    sourceInfo = null,
    hotFunctions = null,
    activeFunction,
    activeSelectionFilter = null,
    navigate,
    filter,
  }: Props = $props();

  let activeSelection: TimeSpan | null = $state(null);

  let wipSelectionFilter: TimeSpan | null = null;

  let excludedProcesses: number[] = $state([]);
  let excludedThreads: number[] = $state([]);

  let activeExcludedProcesses: number[] = $state([]);
  let activeExcludedThreads: number[] = $state([]);

  let hasSelection = $derived(activeSelection !== null);

  const hasSelectionFilter = $derived(
    activeSelectionFilter !== null &&
      (activeSelectionFilter.start !== null ||
        activeSelectionFilter.end !== null),
  );

  let displayTime: TimeSpan | null = $state(totalTime);
  $effect(() => {
    displayTime = totalTime;
  });

  let isZoomed = $derived(
    totalTime !== null &&
      displayTime !== null &&
      (displayTime.start > totalTime.start || displayTime.end < totalTime.end),
  );

  function arrayEquals(a: number[], b: number[]) {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  let hasFilterChanges = $derived(
    hasSelection ||
      !arrayEquals(excludedProcesses, activeExcludedProcesses) ||
      !arrayEquals(excludedThreads, activeExcludedThreads),
  );

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
    filter(
      wipSelectionFilter,
      $state.snapshot(excludedProcesses),
      $state.snapshot(excludedThreads),
    );
    activeExcludedProcesses = [...excludedProcesses];
    activeExcludedThreads = [...excludedThreads];
    zoomToSelection();
  }

  function clearSelectionFilter() {
    wipSelectionFilter = null;
    filter(
      wipSelectionFilter,
      $state.snapshot(excludedProcesses),
      $state.snapshot(excludedThreads),
    );
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

    {#snippet toolbar()}
      <div class="toolbar-buttons">
        <vscode-button
          role="button"
          tabindex="0"
          appearance="icon"
          aria-label="Apply Filter"
          title="Apply Filter"
          disabled={!hasFilterChanges}
          onclick={stopPropagation(applyFiler)}
          onkeypress={stopPropagation(applyFiler)}
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
          onclick={stopPropagation(clearSelectionFilter)}
          onkeypress={stopPropagation(clearSelectionFilter)}
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
          onclick={stopPropagation(clearSelection)}
          onkeypress={stopPropagation(clearSelection)}
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
          onclick={stopPropagation(zoomToSelection)}
          onkeypress={stopPropagation(zoomToSelection)}
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
          onclick={stopPropagation(resetZoom)}
          onkeypress={stopPropagation(resetZoom)}
        >
          <span class="codicon codicon-zoom-out"></span>
        </vscode-button>
      </div>
    {/snippet}
  </Pane>
  <Pane title="Hot spots">
    <FunctionTable {sampleSources} toggle={(h, s) => {}}>
      {#if hotFunctions !== null}
        {#each hotFunctions as func}
          <FunctionTableRow
            navigate={() =>
              navigate({
                processKey: func.processKey,
                functionId: func.function.id,
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
