<script lang="ts">
  import type {
    CallTreeNode,
    FunctionId,
    SampleSourceInfo,
  } from "./utilities/types";

  import FunctionTable from "./components/FunctionTable.svelte";
  import FunctionTableTreeNode from "./components/FunctionTableTreeNode.svelte";
  import { onMount } from "svelte";
  import type { VscodeScrollable } from "@vscode-elements/elements";

  interface Props {
    roots: Map<number, CallTreeNode | null> | null;
    sampleSources: SampleSourceInfo[];
    hotSourceIndex: number | null;
    activeFunction: FunctionId | null;
    navigate: (functionId: FunctionId) => void;
  }

  let {
    roots = null,
    sampleSources,
    hotSourceIndex = null,
    activeFunction = null,
    navigate,
  }: Props = $props();

  let scrollable: VscodeScrollable | undefined = $state();

  onMount(() => {
    let sheet = new CSSStyleSheet();
    sheet.replaceSync(`.content { overflow: unset; } .shadow { z-index: 2; }`);
    scrollable?.shadowRoot?.adoptedStyleSheets.push(sheet);
  });
</script>

<vscode-scrollable bind:this={scrollable}>
  <FunctionTable
    stickyHeader={true}
    {scrollable}
    {sampleSources}
    showAllSelfColumns={false}
  >
    {#if roots !== null}
      {#each [...roots] as [processKey, root]}
        <FunctionTableTreeNode
          navigate={(functionId) => navigate(functionId)}
          {processKey}
          {hotSourceIndex}
          {sampleSources}
          node={root}
          level={0}
          {activeFunction}
        />
      {/each}
    {:else}
      <vscode-progress-ring></vscode-progress-ring>
    {/if}
  </FunctionTable>
  <div class="scrollbar-hack"></div>
</vscode-scrollable>

<style>
  vscode-scrollable {
    height: 100%;
    overflow: hidden;
  }

  .scrollbar-hack {
    visibility: hidden;
    z-index: 99;
  }
</style>
