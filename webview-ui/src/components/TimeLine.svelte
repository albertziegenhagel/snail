<script lang="ts">
  import type { TimeSpan, ProcessInfo } from "../utilities/types";
  import Checkbox from "./Checkbox.svelte";

  interface Props {
    displayTime: TimeSpan | null;
    processes: ProcessInfo[] | null;
    activeSelectionFilter: TimeSpan | null;
    selection: TimeSpan | null;
    uncheckedProcesses: number[];
    uncheckedThreads: number[];
    select?: (selection: TimeSpan | null) => void;
  }

  let {
    displayTime = null,
    processes = null,
    activeSelectionFilter = null,
    selection = $bindable(null),
    uncheckedProcesses = $bindable([]),
    uncheckedThreads = $bindable([]),
    select,
  }: Props = $props();

  let expanded: boolean[] | null = $state(null);
  let checked: { process: boolean; threads: boolean[] }[] | null = $state(null);

  $effect(() => {
    // initialize expanded array when processes changed
    if (processes !== null) {
      if (expanded === null || expanded.length != processes.length) {
        expanded = new Array<boolean>(processes.length).fill(false);
      }
    } else {
      expanded = null;
    }
  });

  $effect(() => {
    // initialize checked array when processes changed
    if (processes !== null) {
      if (checked === null || checked.length != processes.length) {
        let result: { process: boolean; threads: boolean[] }[] = [];
        for (let process of processes) {
          result.push({
            process: true,
            threads: new Array<boolean>(process.threads.length).fill(true),
          });
        }
        checked = result;
      }
    } else {
      checked = null;
    }
  });

  const ticks = 10;

  let delta: number = $derived.by(() => {
    if (displayTime !== null) {
      return (displayTime.end - displayTime.start) / 10;
    } else {
      return 1;
    }
  });

  const toggleExpansion = (i: number) => {
    if (expanded === null) return;
    expanded[i] = !expanded[i];
  };

  const toggleProcessFilter = (processIndex: number) => {
    if (checked === null || processes === null) return;
    if (!checked[processIndex].process) {
      uncheckedProcesses.push(processes[processIndex].key);
      uncheckedProcesses.sort();
    } else {
      const index = uncheckedProcesses.indexOf(processes[processIndex].key);
      if (index > -1) {
        uncheckedProcesses.splice(index, 1);
      }
    }
    uncheckedProcesses = uncheckedProcesses;
  };
  const toggleThreadFilter = (processIndex: number, threadIndex: number) => {
    if (checked === null || processes === null) return;
    if (!checked[processIndex].threads[threadIndex]) {
      uncheckedThreads.push(processes[processIndex].threads[threadIndex].key);
      uncheckedThreads.sort();
    } else {
      const index = uncheckedThreads.indexOf(
        processes[processIndex].threads[threadIndex].key,
      );
      if (index > -1) {
        uncheckedThreads.splice(index, 1);
      }
    }
    uncheckedThreads = uncheckedThreads;
  };

  function formatTick(tick: number, isBound: boolean): string {
    if (displayTime === null) {
      return `${tick} ns`;
    }

    const value = isBound ? tick : tick - displayTime.start;
    let unit = "ns";
    let denom = 1;
    if (value > 1e9) {
      unit = "s";
      denom = 1e9;
    } else if (value > 1e6) {
      unit = "ms";
      denom = 1e6;
    } else if (value > 1e3) {
      unit = "µs";
      denom = 1e3;
    }

    return `${isBound ? "" : "+"}${(value / denom).toFixed(2)}${unit}`;
  }

  let ticksLine: HTMLElement;

  let selectionStartTime: number | null = null;

  function startSelect(e: MouseEvent) {
    if (displayTime === null) return;
    if (selectionStartTime !== null) {
      // should never happen
      return;
    }

    e.preventDefault();

    const bounds = ticksLine.getBoundingClientRect();

    selectionStartTime =
      displayTime.start +
      ((e.clientX - bounds.left) / (bounds.right - bounds.left)) *
        (displayTime.end - displayTime.start);

    selection = {
      start: selectionStartTime,
      end: selectionStartTime,
    };
  }
  function moveSelect(e: MouseEvent) {
    if (displayTime === null) return;
    if (selectionStartTime === null) {
      return;
    }

    const bounds = ticksLine.getBoundingClientRect();

    const currentMouseTime = Math.min(
      Math.max(
        displayTime.start,
        displayTime.start +
          ((e.clientX - bounds.left) / (bounds.right - bounds.left)) *
            (displayTime.end - displayTime.start),
      ),
      displayTime.end,
    );

    selection = {
      start: Math.min(selectionStartTime, currentMouseTime),
      end: Math.max(selectionStartTime, currentMouseTime),
    };
  }
  function endSelect(e: MouseEvent) {
    if (selectionStartTime === null) {
      return;
    }
    e.preventDefault();

    selectionStartTime = null;

    select?.(selection);
  }
</script>

<svelte:window onmousemove={moveSelect} onmouseup={endSelect} />

<table>
  <thead>
    <tr>
      <td>
        <div>Source</div>
      </td>
      <td class="ticks-data" onmousedown={startSelect}>
        <div class="ticks-line" bind:this={ticksLine}>
          {#if displayTime !== null}
            {#each { length: ticks } as _, i}
              {#if i + 1 < ticks}
                <span class="tick tick-left" style="width: {100 / ticks}%;">
                  {formatTick(displayTime.start + delta * i, i == 0)}
                </span>
              {:else}
                <span class="tick tick-left" style="width: {50 / ticks}%;">
                  {formatTick(displayTime.start + delta * i, i == 0)}
                </span>
                <span class="tick tick-right" style="width: {50 / ticks}%;">
                  {formatTick(displayTime.end, true)}
                </span>
              {/if}
            {/each}
          {:else}
            Time
          {/if}
        </div>
        {#if activeSelectionFilter !== null && displayTime !== null}
          <div class="selection-filter-line">
            <span
              class="selection-filter-pre"
              style="width: {(((activeSelectionFilter.start
                ? Math.max(activeSelectionFilter.start, displayTime.start)
                : displayTime.start) -
                displayTime.start) /
                (displayTime.end - displayTime.start)) *
                100}%;"
            ></span>
            <span
              class="selection-filter"
              style="width: {(((activeSelectionFilter.end
                ? Math.min(activeSelectionFilter.end, displayTime.end)
                : displayTime.end) -
                (activeSelectionFilter.start
                  ? Math.max(activeSelectionFilter.start, displayTime.start)
                  : displayTime.start)) /
                (displayTime.end - displayTime.start)) *
                100}%;"
            >
              <span class="selection-filter-inner"></span>
            </span>
            <span
              class="selection-filter-post"
              style="width: {((displayTime.end -
                (activeSelectionFilter.end
                  ? Math.min(activeSelectionFilter.end, displayTime.end)
                  : displayTime.end)) /
                (displayTime.end - displayTime.start)) *
                100}%;"
            ></span>
          </div>
        {/if}
        {#if selection !== null && displayTime !== null}
          <div class="selection-line">
            <span
              class="selection-pre"
              style="width: {((selection.start - displayTime.start) /
                (displayTime.end - displayTime.start)) *
                100}%;"
            ></span>
            <span
              class="selection"
              style="width: {((selection.end - selection.start) /
                (displayTime.end - displayTime.start)) *
                100}%;"
            >
              <span class="selection-inner"></span>
            </span>
            <span
              class="selection-post"
              style="width: {((displayTime.end - selection.end) /
                (displayTime.end - displayTime.start)) *
                100}%;"
            ></span>
          </div>
        {/if}
      </td>
    </tr>
  </thead>
  <tbody>
    {#if displayTime !== null && processes !== null && checked !== null && expanded !== null}
      {#each processes as process, processIndex}
        <tr class:disabled={!checked[processIndex].process}>
          <td class="name-data">
            <div>
              <div
                role="button"
                tabindex="0"
                onclick={() => toggleExpansion(processIndex)}
                onkeypress={() => toggleExpansion(processIndex)}
                class="twistie codicon codicon-chevron-down"
                class:collapsible={process.threads.length > 0}
                class:collapsed={!expanded[processIndex]}
                aria-expanded={expanded[processIndex]}
              ></div>
              <div class="input-group">
                <Checkbox
                  bind:checked={checked[processIndex].process}
                  onchange={() => toggleProcessFilter(processIndex)}
                ></Checkbox>
                {process.name} (PID: {process.osId})
              </div>
            </div>
          </td>
          <td class="time-data" onmousedown={startSelect}>
            <div class="time-line">
              <div class="time-line-bar">
                <span
                  class="time-idle"
                  style="width: {((Math.max(
                    process.startTime,
                    displayTime.start,
                  ) -
                    displayTime.start) /
                    (displayTime.end - displayTime.start)) *
                    100}%;"
                ></span>
                <span
                  class="time-active"
                  style="width: {((Math.min(process.endTime, displayTime.end) -
                    Math.max(process.startTime, displayTime.start)) /
                    (displayTime.end - displayTime.start)) *
                    100}%;"
                ></span>
                <span
                  class="time-idle"
                  style="width: {((displayTime.end -
                    Math.min(process.endTime, displayTime.end)) /
                    (displayTime.end - displayTime.start)) *
                    100}%;"
                ></span>
              </div>
            </div>
            {#if activeSelectionFilter !== null}
              <div class="selection-filter-line">
                <span
                  class="selection-filter-pre"
                  style="width: {(((activeSelectionFilter.start
                    ? Math.max(activeSelectionFilter.start, displayTime.start)
                    : displayTime.start) -
                    displayTime.start) /
                    (displayTime.end - displayTime.start)) *
                    100}%;"
                ></span>
                <span
                  class="selection-filter"
                  style="width: {(((activeSelectionFilter.end
                    ? Math.min(activeSelectionFilter.end, displayTime.end)
                    : displayTime.end) -
                    (activeSelectionFilter.start
                      ? Math.max(activeSelectionFilter.start, displayTime.start)
                      : displayTime.start)) /
                    (displayTime.end - displayTime.start)) *
                    100}%;"
                >
                  <span class="selection-filter-inner"></span>
                </span>
                <span
                  class="selection-filter-post"
                  style="width: {((displayTime.end -
                    (activeSelectionFilter.end
                      ? Math.min(activeSelectionFilter.end, displayTime.end)
                      : displayTime.end)) /
                    (displayTime.end - displayTime.start)) *
                    100}%;"
                ></span>
              </div>
            {/if}
            {#if selection !== null}
              <div class="selection-line">
                <span
                  class="selection-pre"
                  style="width: {((selection.start - displayTime.start) /
                    (displayTime.end - displayTime.start)) *
                    100}%;"
                ></span>
                <span
                  class="selection"
                  style="width: {((selection.end - selection.start) /
                    (displayTime.end - displayTime.start)) *
                    100}%;"
                >
                  <span class="selection-inner"></span>
                </span>
                <span
                  class="selection-post"
                  style="width: {((displayTime.end - selection.end) /
                    (displayTime.end - displayTime.start)) *
                    100}%;"
                ></span>
              </div>
            {/if}
          </td>
        </tr>
        {#if expanded !== null && checked !== null && expanded[processIndex]}
          {#each process.threads as thread, threadIndex}
            <tr
              class:disabled={!checked[processIndex].process ||
                !checked[processIndex].threads[threadIndex]}
            >
              <td class="name-data">
                <div>
                  <div
                    style="padding-left: calc(var(--design-unit) * 2px);"
                    class="twistie codicon codicon-chevron-down"
                  ></div>
                  <div class="input-group">
                    <Checkbox
                      bind:checked={checked[processIndex].threads[threadIndex]}
                      onchange={() =>
                        toggleThreadFilter(processIndex, threadIndex)}
                    ></Checkbox>
                    {thread.name === null ? "[thread]" : thread.name} (TID: {thread.osId})
                  </div>
                </div>
              </td>
              <td class="time-data" onmousedown={startSelect}>
                <div class="time-line">
                  <div class="time-line-bar">
                    <span
                      class="time-idle"
                      style="width: {((Math.max(
                        thread.startTime,
                        displayTime.start,
                      ) -
                        displayTime.start) /
                        (displayTime.end - displayTime.start)) *
                        100}%;"
                    ></span>
                    <span
                      class="time-active"
                      style="width: {((Math.min(
                        thread.endTime,
                        displayTime.end,
                      ) -
                        Math.max(thread.startTime, displayTime.start)) /
                        (displayTime.end - displayTime.start)) *
                        100}%;"
                    ></span>
                    <span
                      class="time-idle"
                      style="width: {((displayTime.end -
                        Math.min(thread.endTime, displayTime.end)) /
                        (displayTime.end - displayTime.start)) *
                        100}%;"
                    ></span>
                  </div>
                </div>
                {#if activeSelectionFilter !== null}
                  <div class="selection-filter-line">
                    <span
                      class="selection-filter-pre"
                      style="width: {(((activeSelectionFilter.start
                        ? Math.max(
                            activeSelectionFilter.start,
                            displayTime.start,
                          )
                        : displayTime.start) -
                        displayTime.start) /
                        (displayTime.end - displayTime.start)) *
                        100}%;"
                    ></span>
                    <span
                      class="selection-filter"
                      style="width: {(((activeSelectionFilter.end
                        ? Math.min(activeSelectionFilter.end, displayTime.end)
                        : displayTime.end) -
                        (activeSelectionFilter.start
                          ? Math.max(
                              activeSelectionFilter.start,
                              displayTime.start,
                            )
                          : displayTime.start)) /
                        (displayTime.end - displayTime.start)) *
                        100}%;"
                    >
                      <span class="selection-filter-inner"></span>
                    </span>
                    <span
                      class="selection-filter-post"
                      style="width: {((displayTime.end -
                        (activeSelectionFilter.end
                          ? Math.min(activeSelectionFilter.end, displayTime.end)
                          : displayTime.end)) /
                        (displayTime.end - displayTime.start)) *
                        100}%;"
                    ></span>
                  </div>
                {/if}
                {#if selection !== null}
                  <div class="selection-line">
                    <span
                      class="selection-pre"
                      style="width: {((selection.start - displayTime.start) /
                        (displayTime.end - displayTime.start)) *
                        100}%;"
                    ></span>
                    <span
                      class="selection"
                      style="width: {((selection.end - selection.start) /
                        (displayTime.end - displayTime.start)) *
                        100}%;"
                    >
                      <span class="selection-inner"></span>
                    </span>
                    <span
                      class="selection-post"
                      style="width: {((displayTime.end - selection.end) /
                        (displayTime.end - displayTime.start)) *
                        100}%;"
                    ></span>
                  </div>
                {/if}
              </td>
            </tr>
          {/each}
        {/if}
      {/each}
    {/if}
  </tbody>
</table>

<style>
  table {
    border-collapse: collapse;
    border-spacing: 0px;
    box-sizing: content-box;
    width: 100%;
  }
  thead > tr {
    font-weight: 600;
  }
  tbody > tr:hover {
    background-color: var(--vscode-list-hoverBackground);
    color: var(--vscode-list-hoverForeground);
  }

  td.name-data > div {
    display: flex;
    margin-left: 2px;
    margin-right: 2px;
  }

  td.name-data {
    white-space: nowrap;
    width: 1%;
  }

  .disabled {
    opacity: 0.4;
  }

  .input-group {
    display: flex;
    align-items: center;
  }

  .time-data {
    position: relative;
  }

  .time-line {
    width: 100%;
    display: flex;
    align-items: center;
  }

  .time-line-bar {
    display: flex;
    width: 100%;
    height: 14px;
    position: absolute;
  }

  .time-idle {
    background-color: var(--vscode-editor-inactiveSelectionBackground);
  }
  .time-active {
    background-color: var(--vscode-editor-selectionBackground);
  }

  .ticks-data {
    position: relative;
  }

  .ticks-line {
    display: flex;
  }

  .tick {
    padding-left: 2px;
    height: 12px;
    font-size: 9px;
    color: gray;
    display: flex;
    user-select: none;
  }

  .tick-left {
    border-left: 1px solid gray;
    padding-left: 2px;
    overflow: hidden;
  }

  .tick-right {
    padding-right: 2px;
    border-right: 1px solid gray;
    justify-content: right;
  }

  .selection-line {
    width: 100%;
    height: 100%;
    position: absolute;
    display: flex;
    top: 0;
  }

  .selection-pre,
  .selection-post {
    background-color: transparent;
    height: 100%;
  }

  .selection {
    border-left: 1px solid var(--vscode-editor-selectionBackground);
    border-right: 1px solid var(--vscode-editor-selectionBackground);
    box-sizing: border-box;
    height: 100%;
  }
  .selection-inner {
    background-color: var(--vscode-editor-selectionBackground);
    box-sizing: border-box;
    display: block;
    height: 100%;
    width: 100%;
    opacity: 0.25;
  }

  .selection-filter-line {
    width: 100%;
    height: 100%;
    position: absolute;
    display: flex;
    top: 0;
  }

  .selection-filter-pre,
  .selection-filter-post {
    background-color: var(--vscode-list-inactiveSelectionBackground);
    display: block;
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    opacity: 0.25;
  }

  .selection-filter {
    border-left: 1px solid var(--vscode-list-inactiveSelectionBackground);
    border-right: 1px solid var(--vscode-list-inactiveSelectionBackground);
    box-sizing: border-box;
    height: 100%;
  }
  .selection-filter-inner {
    background-color: transparent;
    height: 100%;
    width: 100%;
  }

  .twistie {
    display: flex;
    align-items: center;
    padding-right: calc(var(--design-unit) * 1.5px);
  }
  .twistie:not(.collapsible) {
    visibility: hidden;
  }
  .twistie:before {
    display: block;
    cursor: pointer;
  }
  .twistie.collapsed:before {
    transform: rotate(-90deg);
  }
</style>
