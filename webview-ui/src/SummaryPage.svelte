<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';

  import Pane from "./components/Pane.svelte";
  import FunctionTable from "./components/FunctionTable.svelte";
  import FunctionTableRow from "./components/FunctionTableRow.svelte";
  import TimeLine from "./components/TimeLine.svelte";
  import InfoTable from "./components/InfoTable.svelte";
  import ActionIcon from "./components/ActionIcon.svelte";
  import type {
    FunctionId,
    ProcessFunction,
    ProcessInfo,
    TimeSpan,
    SampleSourceInfo,
    InfoEntry,
    ProcessSampleInfo,
  } from "./utilities/types";

  interface Props {
    processes?: ProcessInfo[] | null;
    processSampleInfos: SvelteMap<number, ProcessSampleInfo | null> | null;
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
    processSampleInfos = null,
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

<vscode-scrollable>
  <Pane title="Timeline">
    <TimeLine
      bind:selection={activeSelection}
      {displayTime}
      {processes}
      {processSampleInfos}
      {sampleSources}
      {activeSelectionFilter}
      bind:uncheckedProcesses={excludedProcesses}
      bind:uncheckedThreads={excludedThreads}
    />

    {#snippet toolbar()}
      <div class="toolbar-buttons">
        <div class="toolbar-button">
          <ActionIcon
            disabled={!hasFilterChanges}
            label="Apply Filter"
            onclick={(e) => { e.stopPropagation(); applyFiler(); }}
            >
            <span class="codicon codicon-filter"></span>
          </ActionIcon>
        </div>
        <div class="toolbar-button">
        <ActionIcon
          label="Reset Selection Filter"
          disabled={!hasSelectionFilter}
          onclick={(e) => { e.stopPropagation(); clearSelectionFilter(); }}
        >
          <!-- <span class="codicon codicon-refresh"></span> -->
          <span class="icon-group">
            <span class="codicon codicon-filter"></span>
            <span class="icon-corner codicon codicon-error"></span>
          </span>
        </ActionIcon>
      </div>
      <div class="toolbar-button">
        <ActionIcon
          label="Clear Selection"
          disabled={!hasSelection}
          onclick={(e) => { e.stopPropagation(); clearSelection(); }}
        >
          <span class="codicon codicon-clear-all"></span>
        </ActionIcon>
      </div>
      <div class="toolbar-button">
        <ActionIcon
          label="Zoom to Selection"
          disabled={!hasSelection}
          onclick={(e) => { e.stopPropagation(); zoomToSelection(); }}
        >
          <span class="codicon codicon-zoom-in"></span>
        </ActionIcon>
      </div>
      <div class="toolbar-button">
        <ActionIcon
          label="Reset Zoom"
          disabled={!isZoomed}
          onclick={(e) => { e.stopPropagation(); resetZoom(); }}
        >
          <span class="codicon codicon-zoom-out"></span>
        </ActionIcon>
      </div>
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
</vscode-scrollable>

<style>
  vscode-scrollable {
    height: 100%;
    overflow: hidden;
  }

  .toolbar-buttons {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-left: 2px;
    margin-right: 2px;
  }

  .toolbar-button {
    margin-right: 4px;
  }

  .icon-group {
    position: relative;
    height: 16px;
  }

  span.icon-corner {
    position: absolute;
    bottom: 0;
    right: -2px;
    font-size: 8px;
    font-weight: bold;
  }
</style>
