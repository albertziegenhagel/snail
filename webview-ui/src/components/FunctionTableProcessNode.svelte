<script lang="ts">
  import { createEventDispatcher } from "svelte";

  import { vscode } from "../utilities/vscode";
  import type {
    ProcessInfo,
    FunctionId,
    FunctionNode,
    SampleSourceInfo,
  } from "../utilities/types";

  import FunctionTableRow from "./FunctionTableRow.svelte";

  export let process: ProcessInfo;
  export let activeFunction: FunctionId | null;
  export let sampleSources: SampleSourceInfo[];

  export let sortBy: string | null;
  export let sortOrder: string | null;
  export let sortSourceId: number | null;

  const dispatch = createEventDispatcher();

  let processPseudoFunc: FunctionNode;
  let functions: FunctionNode[] | null = null;

  let canHaveMore: boolean | null = null;
  let waitingForMore: boolean = false;

  let loadingAll = false;

  const pageSize = 100;

  $: isNotEmpty = functions === null || functions.length > 0;

  $: if (process !== null) {
    processPseudoFunc = {
      id: -1,
      name: `${process.name} (PID: ${process.osId})`,
      module: "[multiple]",
      type: "process",
      hits: [],
    };
    for (let source of sampleSources) {
      processPseudoFunc.hits.push({
        sourceId: source.id,
        selfPercent: 0.0,
        selfSamples: 0,
        totalPercent: 0.0,
        totalSamples: 0,
      });
    }
  }

  let expanded: boolean | null = null;

  $: if (functions !== null) {
    if (expanded === null) {
      expanded = true;
    }
  }

  $: if (sortBy !== null || sortOrder !== null || sortSourceId !== null) {
    functions = null;
    loadMoreIfExpanded();
  }

  function loadMoreIfExpanded() {
    if (expanded) {
      loadMore();
    }
  }

  function loadMore() {
    const useSortBy = sortBy === null ? "name" : sortBy;
    const useSortOrder = sortOrder === null ? "ascending" : sortOrder;
    waitingForMore = true;
    const nextPageIndex =
      functions === null ? 0 : Math.ceil(functions.length / pageSize);
    vscode.postMessage({
      command: "retrieveFunctionsPage",
      sortBy: useSortBy,
      sortOrder: useSortOrder,
      sortSourceId: sortSourceId,
      pageSize: pageSize,
      pageIndex: nextPageIndex,
      processKey: process.key,
    });
  }

  const toggleExpansion = () => {
    if (expanded === null) {
      expanded = true;
    } else {
      expanded = !expanded;
    }
    if (expanded && functions === null) {
      loadMore();
    }
  };

  function loadAll() {
    loadingAll = true;
    loadMore();
  }

  function navigateToFunction(functionId: number) {
    dispatch("navigate", {
      functionId: {
        processKey: process.key,
        functionId: functionId,
      },
    });
  }

  window.addEventListener("message", (event) => {
    if (process === null) return;
    if (event.data.type !== "functionsPage") return;
    if (event.data.data["processKey"] !== process.key) return;

    const newFunctions = event.data.data["functions"];

    if (functions === null) {
      functions = newFunctions;
    } else {
      functions = functions.concat(newFunctions);
    }

    canHaveMore = newFunctions.length == pageSize;

    if (!loadingAll || !canHaveMore) {
      waitingForMore = false;
      loadingAll = false;
    }

    if (canHaveMore && loadingAll) {
      loadMore();
    }
  });
</script>

<FunctionTableRow
  node={processPseudoFunc}
  isHot={false}
  isActive={false}
  {sampleSources}
>
  <span slot="function-name-prefix" class="function-name-prefix">
    <div
      on:click={toggleExpansion}
      on:keypress={toggleExpansion}
      style="padding-left: calc(var(--design-unit) * {0}px);"
      class="twistie codicon codicon-chevron-down"
      class:collapsible={isNotEmpty}
      class:collapsed={!expanded}
    />
  </span>
</FunctionTableRow>

{#if expanded && process !== null}
  {#if functions !== null}
    {#each functions as func}
      <FunctionTableRow
        on:navigate={(event) => navigateToFunction(event.detail.functionId)}
        node={func}
        isHot={false}
        isActive={activeFunction != null &&
          process.key == activeFunction.processKey &&
          func.id == activeFunction.functionId}
        {sampleSources}
      >
        <span slot="function-name-prefix" class="function-name-prefix">
          <div
            style="padding-left: calc(var(--design-unit) * 2px);"
            class="twistie codicon codicon-chevron-down"
            class:collapsible={false}
            class:collapsed={false}
          />
        </span>
      </FunctionTableRow>
    {/each}
    {#if waitingForMore}
      <FunctionTableRow node={null} isHot={false} {sampleSources}>
        <span slot="function-name-prefix" class="function-name-prefix">
          <div
            style="padding-left: calc(var(--design-unit) * 2px);"
            class="twistie codicon codicon-chevron-down"
            class:collapsible={false}
            class:collapsed={false}
          />
        </span>
      </FunctionTableRow>
    {:else if canHaveMore !== null && canHaveMore}
      <tr>
        <td>
          <div class="function-name">
            <span class="function-name-prefix">
              <div
                style="padding-left: calc(var(--design-unit) * 2px);"
                class="twistie codicon codicon-chevron-down"
                class:collapsible={false}
                class:collapsed={false}
              />
            </span>
            <span class="load-more"
              ><a href="#top" on:click={() => loadMore()}>more</a></span
            >
            <span class="load-all"
              ><a href="#top" on:click={() => loadAll()}>all</a></span
            >
          </div>
        </td>
      </tr>
    {/if}
  {:else}
    <FunctionTableRow node={null} isHot={false} {sampleSources} />
  {/if}
{/if}

<style>
  .function-name-prefix {
    display: flex;
    align-items: center;
  }

  tr {
    white-space: nowrap;
    line-height: 22px;
  }

  td > div {
    display: flex;
    margin-left: 2px;
    margin-right: 2px;
  }

  td > div > span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .load-all {
    margin-left: 6px;
  }

  .twistie {
    display: flex;
    align-items: center;
    padding-right: 6px;
  }
  .twistie:not(.collapsible) {
    visibility: hidden;
  }
  .twistie:before {
    cursor: pointer;
    display: block;
  }
  .twistie.collapsed:before {
    transform: rotate(-90deg);
  }
</style>
