<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { CallTreeNode, FunctionId } from "./utilities/types";

  import FunctionTable from "./components/FunctionTable.svelte";
  import TreeFunctionTableRow from "./components/TreeFunctionTableRow.svelte";

  export let roots: Map<number, CallTreeNode> = null;
  export let activeFunction: FunctionId = null;

  const dispatch = createEventDispatcher();

  // $: {
  //   if(processes !== null) {
  //     for (const process of processes) {
  //       if(process.id in roots) continue;
  //       vscode.postMessage({ command: "retrieve_call_tree_hot_path", processId: process.id });
  //     }
  //     // TODO: remove old roots
  //   }
  //   else {
  //     roots = {}
  //   }
  // }

  // window.addEventListener("message", (event) => {
  //   if(event.data.type !== "call_tree_hot_path") return;
  //   roots[event.data.data['process_id']] = event.data.data['root'];
  // });
</script>

<FunctionTable stickyHeader={true}>
  {#if roots !== null}
    {#each [...roots] as [processId, root]}
      <TreeFunctionTableRow
        on:navigate={(event) =>
          dispatch("navigate", {
            functionId: event.detail.functionId,
          })}
        {processId}
        node={root}
        level={0}
        {activeFunction}
      />
    {/each}
  {:else}
    <vscode-progress-ring />
  {/if}
</FunctionTable>
