<script lang="ts">
  import FunctionTableTreeNode from "./FunctionTableTreeNode.svelte";

  import { vscode } from "../utilities/vscode";
  import type {
    CallTreeNode,
    FunctionId,
    SampleSourceInfo,
  } from "../utilities/types";

  import FunctionTableRow from "./FunctionTableRow.svelte";
  import exp from "constants";

  interface Props {
    processKey: number;
    hotSourceIndex: number | null;
    node: CallTreeNode | null;
    level: number;
    activeFunction: FunctionId | null;
    sampleSources: SampleSourceInfo[];
    navigate?: (functionId: FunctionId) => void;
  }

  let {
    processKey,
    hotSourceIndex,
    node = $bindable(),
    level,
    activeFunction,
    sampleSources,
    navigate,
  }: Props = $props();

  let hasChildren = $derived(
    node !== null && (node.children === null || node.children.length > 0),
  );

  let expanded: boolean | null = $state(null);

  $effect(() => {
    if (node !== null && node.children !== null && hotSourceIndex !== null) {
      node.children.sort((a, b) => {
        return -(
          a.hits[hotSourceIndex].totalSamples -
          b.hits[hotSourceIndex].totalSamples
        );
      });
      if (expanded === null) {
        expanded = node.isHot;
      }
    }
  });

  let isHot = $derived(node !== null && node.isHot);
  let isActive = $derived(
    node !== null &&
      activeFunction != null &&
      processKey == activeFunction.processKey &&
      node.functionId == activeFunction.functionId,
  );

  const toggleExpansion = () => {
    if (node === null) return;
    if (expanded === null) {
      expanded = true;
    } else {
      expanded = !expanded;
    }
    if (expanded && node.children === null) {
      vscode.postMessage({
        command: "expandCallTreeNode",
        processKey: processKey,
        nodeId: node.id,
      });
    }
  };

  function navigateToSelf() {
    if (node === null) return;
    navigate?.({
      processKey: processKey,
      functionId: node.functionId,
    });
  }

  function navigateToChild(functionId: FunctionId) {
    navigate?.(functionId);
  }

  window.addEventListener("message", (event) => {
    if (node === null) return;
    if (event.data.type !== "callTreeNodeChildren") return;
    if (event.data.data["id"] !== node.id) return;
    if (hotSourceIndex !== null) {
      event.data.data["children"].sort((a: CallTreeNode, b: CallTreeNode) => {
        return -(
          a.hits[hotSourceIndex].totalSamples -
          b.hits[hotSourceIndex].totalSamples
        );
      });
    }
    node.children = event.data.data["children"];
  });
</script>

<FunctionTableRow
  navigate={() => navigateToSelf()}
  {node}
  {isHot}
  {isActive}
  {sampleSources}
  showAllSelfColumns={false}
>
  {#snippet functionNamePrefix()}
    <span class="function-name-prefix">
      <div
        role="button"
        tabindex="0"
        onclick={toggleExpansion}
        onkeypress={toggleExpansion}
        style="padding-left: calc(var(--design-unit) * {level * 2}px);"
        class="twistie codicon codicon-chevron-down"
        class:collapsible={hasChildren}
        class:collapsed={!expanded}
        aria-expanded={expanded}
      ></div>
    </span>
  {/snippet}
</FunctionTableRow>

{#if expanded && node !== null}
  {#if node.children !== null}
    {#each node.children as child}
      <FunctionTableTreeNode
        navigate={(functionId) => navigateToChild(functionId)}
        {processKey}
        node={child}
        {sampleSources}
        {hotSourceIndex}
        level={level + 1}
        {activeFunction}
      />
    {/each}
  {:else}
    <!-- Placeholder -->
    <FunctionTableTreeNode
      {processKey}
      node={null}
      activeFunction={null}
      {sampleSources}
      {hotSourceIndex}
      level={level + 1}
    />
  {/if}
{/if}

<style>
  .function-name-prefix {
    display: flex;
    align-items: center;
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
