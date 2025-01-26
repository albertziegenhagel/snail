<script lang="ts">
  import type {
    CallTreeNode,
    FunctionId,
    SampleSourceInfo,
  } from "./utilities/types";

  import FunctionTable from "./components/FunctionTable.svelte";
  import FunctionTableTreeNode from "./components/FunctionTableTreeNode.svelte";

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
</script>

<FunctionTable stickyHeader={true} {sampleSources} showAllSelfColumns={false}>
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
