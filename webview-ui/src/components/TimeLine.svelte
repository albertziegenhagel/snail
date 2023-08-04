<script lang="ts">
  import type { TimeSpan, ProcessInfo } from "../utilities/types";

  export let totalTime: TimeSpan = null;

  export let processes: ProcessInfo[] = null;

  let expanded: boolean[] = null;
  let checked: { process: boolean; threads: boolean[] }[] = null;

  $: if (
    processes !== null &&
    (expanded === null || expanded.length != processes.length)
  ) {
    expanded = new Array<boolean>(processes.length).fill(false);

    checked = [];
    for (let process of processes) {
      checked.push({
        process: true,
        threads: new Array<boolean>(process.threads.length).fill(true),
      });
    }
  }

  const toggleExpansion = (i: number) => {
    expanded[i] = !expanded[i];
  };
</script>

<table>
  <thead>
    <tr>
      <td><div>Source</div></td>
      <td><div>Samples</div></td>
    </tr>
  </thead>
  <tbody>
    {#if totalTime !== null && processes !== null}
      {#each processes as process, processIndex}
        <tr class:disabled={!checked[processIndex].process}>
          <td class="name-data">
            <div>
              <div
                on:click={() => toggleExpansion(processIndex)}
                on:keypress={() => toggleExpansion(processIndex)}
                class="twistie codicon codicon-chevron-down"
                class:collapsible={process.threads.length > 0}
                class:collapsed={!expanded[processIndex]}
              />
              <div class="input-group">
                <input
                  type="checkbox"
                  class="checkbox-control codicon"
                  class:codicon-check={checked[processIndex].process}
                  bind:checked={checked[processIndex].process}
                />
                {process.name} (PID: {process.osId})
              </div>
            </div>
          </td>
          <td>
            <div class="time-data">
              <span
                class="time-idle"
                style="width: {(process.startTime /
                  (totalTime.end - totalTime.start)) *
                  100}%;"
              />
              <span
                class="time-active"
                style="width: {((process.endTime - process.startTime) /
                  (totalTime.end - totalTime.start)) *
                  100}%;"
              />
              <span
                class="time-idle"
                style="width: {((totalTime.end - process.endTime) /
                  (totalTime.end - totalTime.start)) *
                  100}%;"
              />
            </div>
          </td>
        </tr>
        {#if expanded[processIndex]}
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
                  />
                  <div class="input-group">
                    <input
                      class="checkbox-control codicon"
                      class:codicon-check={checked[processIndex].threads[
                        threadIndex
                      ]}
                      type="checkbox"
                      bind:checked={checked[processIndex].threads[threadIndex]}
                      disabled={!checked[processIndex].process}
                    />
                    {thread.name === null ? "[thread]" : thread.name} (TID: {thread.osId})
                  </div>
                </div>
              </td>
              <td>
                <div class="time-data">
                  <span
                    class="time-idle"
                    style="width: {(thread.startTime /
                      (totalTime.end - totalTime.start)) *
                      100}%;"
                  />
                  <span
                    class="time-active"
                    style="width: {((thread.endTime - thread.startTime) /
                      (totalTime.end - totalTime.start)) *
                      100}%;"
                  />
                  <span
                    class="time-idle"
                    style="width: {((totalTime.end - thread.endTime) /
                      (totalTime.end - totalTime.start)) *
                      100}%;"
                  />
                </div>
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

  td > div {
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

  .checkbox-control {
    position: relative;
    width: calc(var(--design-unit) * 4px);
    height: calc(var(--design-unit) * 4px);
    box-sizing: border-box;
    border-radius: calc(var(--checkbox-corner-radius) * 1px);
    border: calc(var(--border-width) * 1px) solid var(--checkbox-border);
    background: var(--checkbox-background);
    outline: none;
    cursor: pointer;
    appearance: none;
    margin: 0 calc(var(--design-unit) * 1.5px) 0 0;
    font-size: 11pt;
  }

  .checkbox-control:active {
    background: var(--checkbox-background);
    border-color: var(--focus-border);
  }
  .checkbox-control:focus-visible {
    border: calc(var(--border-width) * 1px) solid var(--focus-border);
  }

  .time-data {
    width: 100%;
    height: 14px;
  }

  .time-idle {
    background-color: var(--vscode-editor-inactiveSelectionBackground);
    border: 1px solid rgb(227, 241, 241);
  }
  .time-active {
    background-color: var(--vscode-editor-selectionBackground);
    border: 1px solid lightskyblue;
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
    cursor: pointer;
  }
  .twistie.collapsed:before {
    transform: rotate(-90deg);
  }
</style>
