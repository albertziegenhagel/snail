<script lang="ts">
  import { getModuleDisplayName } from "../utilities/path";
  import type { FunctionNode, SampleSourceInfo } from "../utilities/types";
  import Placeholder from "./Placeholder.svelte";

  interface Props {
    node: FunctionNode | null;
    isHot?: boolean;
    isActive?: boolean;
    showAllSelfColumns?: boolean;
    sampleSources: SampleSourceInfo[];
    functionNamePrefix?: import('svelte').Snippet;
    totalSamplesPrefix?: import('svelte').Snippet;
    selfSamplesPrefix?: import('svelte').Snippet;
    modulesPrefix?: import('svelte').Snippet;
    navigate?: (functionId: number) => void;
  }

  let {
    node,
    isHot = false,
    isActive = false,
    showAllSelfColumns = true,
    sampleSources,
    functionNamePrefix,
    totalSamplesPrefix,
    selfSamplesPrefix,
    modulesPrefix,
    navigate
  }: Props = $props();

  function navigateToSelf() {
    if(node !== null) {
    navigate?.(node.id);
    }
  }
</script>

<tr class:active={isActive}>
  <td>
    <div class="function-name">
      {@render functionNamePrefix?.()}
      {#if isHot}
        <div class="hot"><i class="codicon codicon-flame"></i></div>
      {/if}
      {#if node !== null}
        {#if node.type === "function"}
          <span
            role="button"
            tabindex="0"
            onclick={() => navigateToSelf()}
            onkeypress={() => navigateToSelf()}
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
        {#if node !== null}
          <div class="percent-bar-container">
            <div class="percent-bar" style="width: calc({node.hits[sourceIndex].totalPercent.toFixed(1)}%)"></div>
          </div>
        {/if}
        <div class="total-samples">
          {@render totalSamplesPrefix?.()}
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
        {#if node !== null}
          <div class="percent-bar-container">
            <div class="percent-bar" style="width: calc({node.hits[sourceIndex].selfPercent.toFixed(1)}%)"></div>
          </div>
        {/if}
        <div class="self-samples">
          {@render selfSamplesPrefix?.()}
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
      {@render modulesPrefix?.()}
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

  td {
    position: relative;
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

  .percent-bar-container {
    position: absolute;
    width: calc(100% - 4px);
    height: 100%;
    right: 2px;
    display: flex;
    justify-content: right;
    align-items: center;
    margin: 0;
  }
  .percent-bar {
    position: absolute;
    border-radius: 4px;
    height: calc(100% - 6px);
    background-color: var(--vscode-progressBar-background);
    opacity: 0.15;
  }
</style>
