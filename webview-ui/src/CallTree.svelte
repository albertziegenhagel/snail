<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { CallTreeNode, FunctionId, SampleSourceInfo } from "./utilities/types";

  import FunctionTable from "./components/FunctionTable.svelte";
  import TreeFunctionTableRow from "./components/FunctionTableTreeNode.svelte";

  export let roots: Map<number, CallTreeNode|null>|null = null;
  export let sampleSources : SampleSourceInfo[];
  export let hotSourceIndex: number|null = null;
  export let activeFunction: FunctionId|null = null;

  const dispatch = createEventDispatcher();

  // $: {
  //   if(processes !== null) {
  //     for (const process of processes) {
  //       if(process.key in roots) continue;
  //       vscode.postMessage({ command: "retrieveCallTreeHotPath", processKey: process.key });
  //     }
  //     // TODO: remove old roots
  //   }
  //   else {
  //     roots = {}
  //   }
  // }

  // window.addEventListener("message", (event) => {
  //   if(event.data.type !== "callTreeHotPath") return;
  //   roots[event.data.data['processKey']] = event.data.data['root'];
  // });
</script>

<FunctionTable stickyHeader={true} sampleSources={sampleSources} showAllSelfColumns={false}>
  {#if roots !== null}
    {#each [...roots] as [processKey, root]}
      <TreeFunctionTableRow
        on:navigate={(event) =>
          dispatch("navigate", {
            functionId: event.detail.functionId,
          })}
        {processKey}
        hotSourceIndex={hotSourceIndex}
        sampleSources={sampleSources}
        node={root}
        level={0}
        {activeFunction}
      />
    {/each}
  {:else}
    <vscode-progress-ring />
  {/if}
</FunctionTable>
