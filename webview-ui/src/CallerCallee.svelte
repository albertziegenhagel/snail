<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Placeholder from "./components/Placeholder.svelte";
  import { getModuleDisplayName } from "./utilities/path";
  import type { CallerCalleeNode, FunctionNode } from "./utilities/types";

  export let node: CallerCalleeNode = null;

  const dispatch = createEventDispatcher();

  // let currentFunction: Function = null;
  // let callers: Function[] = [];
  // let callees: Function[] = [];

  // $: if (activeFunction !== null && activeFunction.processKey !== null && activeFunction.functionId !== null) {
  //   vscode.postMessage({
  //     command: "retrieveCallersCallees",
  //     processKey: activeFunction.processKey,
  //     functionId: activeFunction.functionId,
  //   });
  // }

  function navigateTo(func: FunctionNode) {
    dispatch("navigate", {
      functionId: {
        processKey: node.processKey,
        functionId: func.id,
      },
    });
    // currentFunctionId = func.id;
  }

  // window.addEventListener("message", (event) => {
  //   // if (currentFunctionId === null && event.data.type === "functionsPage" && event.data.data["pageIndex"] === 0) {
  //   //   currentFunctionId = event.data.data["functions"][0].id;
  //   // }
  //   if (event.data.type === "callersCallees") {
  //     if(event.data.data["function"]['id'] !== activeFunction?.functionId) return;
  //     currentFunction = event.data.data["function"];
  //     callers = event.data.data["callers"];
  //     callees = event.data.data["callees"];
  //   }
  // });
</script>

{#if node !== null}
  <h1 class="current-function-name" title={node.function.name}>
    {node.function.name}
  </h1>
  <h3 class="current-module-name" title={node.function.module}>
    {getModuleDisplayName(node.function.module)}
  </h3>
{:else}
  <h1 class="current-function-name">
    <Placeholder />
  </h1>
  <h3 class="current-module-name">
    <Placeholder width={20} />
  </h3>
{/if}

<div class="caller-callee-view">
  <div class="caller-callee-node callers-node">
    <h4 class="caller-callee-node-title">CALLING FUNCTIONS</h4>
    <div class="caller-callee-node-group">
      {#if node !== null}
        {#if node.callers.length === 0}
          <div class="caller-callee-node-group-entry">
            <span class="function-name">Root</span>
          </div>
        {:else}
          {#each node.callers as func}
            <div
              on:click={() => {
                navigateTo(func);
              }}
              on:keypress={() => {
                navigateTo(func);
              }}
              class="caller-callee-node-group-entry callee"
              style="flex: {func.totalSamples} 0 0;"
            >
              <span class="function-name" title={func.name}>{func.name}</span>
              <span class="samples" title="{func.totalSamples} total samples"
                >{func.totalSamples}</span
              >
              <span
                class="percent"
                title="{func.totalPercent.toFixed(2)}% of total samples"
                >({func.totalPercent.toFixed(2)}%)</span
              >
            </div>
          {/each}
        {/if}
      {:else}
        <div class="caller-callee-node-group-entry">
          <Placeholder />
        </div>
      {/if}
    </div>
  </div>
  <div class="arrow">
    <i class="codicon codicon-arrow-right" />
  </div>
  <div class="caller-callee-node current-function-node">
    <h4 class="caller-callee-node-title">CURRENT FUNCTION</h4>
    <div class="caller-callee-node-group">
      {#if node !== null}
        <div
          class="caller-callee-node-group-entry current-total"
          style="flex: {node.function.totalSamples -
            node.function.selfSamples} 0 0;"
        >
          <span class="function-name" title={node.function.name}
            >{node.function.name}</span
          >
          <span
            class="samples"
            title="{node.function.totalSamples} total samples"
            >{node.function.totalSamples}</span
          >
          <span
            class="percent"
            title="{node.function.totalPercent.toFixed(2)}% of total samples"
            >({node.function.totalPercent.toFixed(2)}%)</span
          >
        </div>
        <div
          class="caller-callee-node-group-entry current-self"
          style="flex: {node.function.selfSamples} 0 0;"
        >
          <span class="function-name">Function Body</span>
          <span
            class="samples"
            title="{node.function.selfSamples} self samples"
            >{node.function.selfSamples}</span
          >
          <span
            class="percent"
            title="{node.function.selfPercent.toFixed(2)}% of total samples"
            >({node.function.selfPercent.toFixed(2)}%)</span
          >
        </div>
      {:else}
        <div class="caller-callee-node-group-entry current-total">
          <Placeholder />
        </div>
        <div class="caller-callee-node-group-entry current-self">
          <Placeholder />
        </div>
      {/if}
    </div>
  </div>
  <div class="arrow">
    <i class="codicon codicon-arrow-right" />
  </div>
  <div class="caller-callee-node callees-node">
    <h4 class="caller-callee-node-title">CALLED FUNCTIONS</h4>
    <div class="caller-callee-node-group">
      {#if node !== null}
        {#if node.callees.length === 0}
          <div class="caller-callee-node-group-entry">
            <span class="function-name">Top of stack</span>
          </div>
        {:else}
          {#each node.callees as func}
            <div
              on:click={() => {
                navigateTo(func);
              }}
              on:keypress={() => {
                navigateTo(func);
              }}
              class="caller-callee-node-group-entry caller"
              style="flex: {func.totalSamples} 0 0;"
            >
              <span class="function-name" title={func.name}>{func.name}</span>
              <span class="samples" title="{func.totalSamples} total samples"
                >{func.totalSamples}</span
              >
              <span
                class="percent"
                title="{func.totalPercent.toFixed(2)}% of total samples"
                >({func.totalPercent.toFixed(2)}%)</span
              >
            </div>
          {/each}
        {/if}
      {:else}
        <div class="caller-callee-node-group-entry">
          <Placeholder />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .current-function-name {
    margin: 0pt 2pt;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .current-module-name {
    margin: 0pt 2pt;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .caller-callee-view {
    display: flex;
    flex: auto;
  }
  .caller-callee-node {
    flex: 1 1 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .caller-callee-node-title {
    display: flex;
    justify-content: center;
    margin: 4pt 0pt;
  }
  .caller-callee-node-group {
    background-color: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-sideBarSectionHeader-border);
    margin: 4pt 0pt;
    flex: auto;
    display: flex;
    flex-direction: column;
  }
  .caller-callee-node-group-entry {
    border: 1px solid var(--vscode-sideBarSectionHeader-border);
    margin: 4pt;
    padding: 2pt 4pt;
    display: flex;
  }
  .callers-node .caller-callee-node-group-entry {
    background-color: var(--vscode-tree-tableOddRowsBackground);
  }
  .callees-node .caller-callee-node-group-entry {
    background-color: var(--vscode-tree-tableOddRowsBackground);
  }
  .caller-callee-node-group-entry.current-total {
    border: none;
  }
  .caller-callee-node-group-entry.current-self {
    background-color: var(--vscode-list-inactiveSelectionBackground);
    color: var(--vscode-list-inactiveSelectionForeground);
  }
  .caller-callee-node-group-entry.caller:hover,
  .caller-callee-node-group-entry.callee:hover {
    background-color: var(--vscode-list-hoverBackground);
    color: var(--vscode-list-hoverForeground);
    cursor: pointer;
  }
  .caller-callee-node-group-entry > span {
    margin: 0pt 2pt;
  }
  .caller-callee-node-group-entry > span.function-name {
    flex: auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .arrow {
    display: flex;
    align-items: center;
  }
</style>
