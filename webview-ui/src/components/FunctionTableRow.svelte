<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { getModuleDisplayName } from "../utilities/path";
  import type { FunctionNode, SampleSourceInfo } from "../utilities/types";
  import Placeholder from "./Placeholder.svelte";

  export let node: FunctionNode | null;
  export let isHot: boolean = false;
  export let isActive: boolean = false;
  export let showAllSelfColumns: boolean = true;
  export let sampleSources: SampleSourceInfo[];

  const dispatch = createEventDispatcher();

  function navigateToSelf() {
    dispatch("navigate", {
      functionId: node!.id,
    });
  }
</script>

<tr class:active={isActive}>
  <td>
    <div class="function-name">
      <slot name="function-name-prefix" />
      {#if isHot}
        <div class="hot"><i class="codicon codicon-flame" /></div>
      {/if}
      {#if node !== null}
        {#if node.type === "function"}
          <span
            role="button"
            tabindex="0"
            on:click={() => navigateToSelf()}
            on:keypress={() => navigateToSelf()}
            class="function-name-text clickable"
            title={node.name}
          >
            {node.name}
          </span>
        {:else}
          <span class="function-name-text" title={node.name}>{node.name}</span>
        {/if}
      {:else}
        <Placeholder />
      {/if}
    </div>
  </td>
  {#each sampleSources as source, sourceIndex}
    {#if source.hasStacks}
      <td>
        <div class="total-samples">
          <slot name="total-samples-prefix" />
          {#if node !== null}
            <span class="total-samples-text"
              >{node.hits[sourceIndex].totalSamples} ({node.hits[
                sourceIndex
              ].totalPercent.toFixed(2)}%)</span
            >
          {:else}
            <Placeholder />
          {/if}
        </div>
      </td>
    {/if}
    {#if source.hasStacks || showAllSelfColumns}
      <td>
        <div class="self-samples">
          <slot name="self-samples-prefix" />
          {#if node !== null}
            <span class="self-samples-text"
              >{node.hits[sourceIndex].selfSamples} ({node.hits[
                sourceIndex
              ].selfPercent.toFixed(2)}%)</span
            >
          {:else}
            <Placeholder />
          {/if}
        </div>
      </td>
    {/if}
  {/each}
  <td>
    <div class="modules">
      <slot name="modules-prefix" />
      {#if node !== null}
        <span class="modules-text" title={node.module}
          >{getModuleDisplayName(node.module)}</span
        >
      {:else}
        <Placeholder />
      {/if}
    </div>
  </td>
</tr>

<style>
  tr {
    white-space: nowrap;
    line-height: 22px;
  }
  tr:hover {
    background-color: var(--vscode-list-hoverBackground);
    color: var(--vscode-list-hoverForeground);
  }
  tr.active {
    background-color: var(--vscode-list-inactiveSelectionBackground);
  }

  .function-name-text.clickable {
    cursor: pointer;
  }

  .function-name-text.clickable:hover {
    text-decoration: underline;
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

  .total-samples,
  .self-samples {
    justify-content: right;
  }

  .hot {
    display: flex;
    align-items: center;
    color: var(--vscode-notificationsErrorIcon-foreground);
    padding-right: 4px;
  }
</style>
