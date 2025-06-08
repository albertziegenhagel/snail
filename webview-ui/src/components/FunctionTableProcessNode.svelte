<script lang="ts">
  import { vscode } from "../utilities/vscode";
  import type {
    ProcessInfo,
    FunctionId,
    FunctionNode,
    SampleSourceInfo,
    HitCounts,
  } from "../utilities/types";

  import FunctionTableRow from "./FunctionTableRow.svelte";
  import { untrack } from "svelte";

  interface Props {
    process: ProcessInfo;
    activeFunction: FunctionId | null;
    sampleSources: SampleSourceInfo[];
    sortBy: string | null;
    sortOrder: string | null;
    sortSourceId: number | null;
    navigate: (functionId: FunctionId) => void;
  }

  let {
    process,
    activeFunction,
    sampleSources,
    sortBy,
    sortOrder,
    sortSourceId,
    navigate,
  }: Props = $props();

  let processPseudoFunc: FunctionNode | null = $state(null);
  let functions: FunctionNode[] | null = $state(null);

  let canHaveMore: boolean | null = $state(null);
  let waitingForMore: boolean = $state(false);

  let loadingAll = false;

  const pageSize = 100;

  let expanded: boolean | null = $state(null);

  let clearOnNextReceive = false;

  function loadMore(clearOnReceive : boolean) {
    const useSortBy = sortBy === null ? "name" : sortBy;
    const useSortOrder = sortOrder === null ? "ascending" : sortOrder;
    waitingForMore = true;
    if(clearOnNextReceive && !clearOnReceive) {
      functions = null;
    }
    const nextPageIndex =
      (functions === null || clearOnReceive) ? 0 : Math.ceil(functions.length / pageSize);
    clearOnNextReceive = clearOnReceive;
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
      loadMore(false);
    }
  };

  function loadAll() {
    loadingAll = true;
    loadMore(false);
  }

  function navigateToFunction(functionId: number) {
    navigate({
      processKey: process.key,
      functionId: functionId,
    });
  }

  window.addEventListener("message", (event) => {
    if (process === null) return;
    if (event.data.type !== "functionsPage") return;
    if (event.data.data["processKey"] !== process.key) return;

    const newFunctions = event.data.data["functions"];

    if (functions === null || clearOnNextReceive) {
      functions = newFunctions;
    } else {
      functions = functions.concat(newFunctions);
    }

    clearOnNextReceive = false;
    canHaveMore = newFunctions.length == pageSize;

    if (!loadingAll || !canHaveMore) {
      waitingForMore = false;
      loadingAll = false;
    }

    if (canHaveMore && loadingAll) {
      loadMore(false);
    }
  });
  $effect(() => {
    // reload functions on sort change
    sortBy;
    sortOrder;
    sortSourceId;
    if (sortBy !== null || sortOrder !== null || sortSourceId !== null) {
      untrack(() => {
        if (expanded) {
          loadMore(true);
        }
      });
    }
  });
  let isNotEmpty = $derived.by(() => {
    return functions === null || functions.length > 0;
  });
  $effect(() => {
    // rebuild the displayed function object when necessary
    let hits: HitCounts[] = [];
    for (let source of sampleSources) {
      hits.push({
        sourceId: source.id,
        selfPercent: 0.0,
        selfSamples: 0,
        totalPercent: 0.0,
        totalSamples: 0,
      });
    }
    processPseudoFunc = {
      id: -1,
      name: `${process.name} (PID: ${process.osId})`,
      module: "[multiple]",
      type: "process",
      hits: hits,
    };
  });
  $effect(() => {
    // initialize the expandable state when we receive functions
    if (functions !== null && expanded === null) {
      expanded = true;
    }
  });
</script>

<FunctionTableRow
  node={processPseudoFunc}
  isHot={false}
  isActive={false}
  {sampleSources}
>
  {#snippet functionNamePrefix()}
    <span class="function-name-prefix">
      <div
        role="button"
        tabindex="0"
        onclick={toggleExpansion}
        onkeypress={toggleExpansion}
        style="padding-left: calc(var(--design-unit) * {0}px);"
        class="twistie codicon codicon-chevron-down"
        class:collapsible={isNotEmpty}
        class:collapsed={!expanded}
        aria-expanded={expanded}
      ></div>
    </span>
  {/snippet}
</FunctionTableRow>

{#if expanded && process !== null}
  {#if functions !== null}
    {#each functions as func}
      <FunctionTableRow
        navigate={(functionId) => navigateToFunction(functionId)}
        node={func}
        isHot={false}
        isActive={activeFunction != null &&
          process.key == activeFunction.processKey &&
          func.id == activeFunction.functionId}
        {sampleSources}
      >
        {#snippet functionNamePrefix()}
          <span class="function-name-prefix">
            <div
              style="padding-left: calc(var(--design-unit) * 2px);"
              class="twistie codicon codicon-chevron-down"
              class:collapsible={false}
              class:collapsed={false}
            ></div>
          </span>
        {/snippet}
      </FunctionTableRow>
    {/each}
    {#if waitingForMore}
      <FunctionTableRow node={null} isHot={false} {sampleSources}>
        {#snippet functionNamePrefix()}
          <span class="function-name-prefix">
            <div
              style="padding-left: calc(var(--design-unit) * 2px);"
              class="twistie codicon codicon-chevron-down"
              class:collapsible={false}
              class:collapsed={false}
            ></div>
          </span>
        {/snippet}
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
              ></div>
            </span>
            <span class="load-more"
              ><a href="#top" onclick={() => loadMore(false)}>more</a></span
            >
            <span class="load-all"
              ><a href="#top" onclick={() => loadAll()}>all</a></span
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
