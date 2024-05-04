<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { ProcessInfo, FunctionId, SampleSourceInfo } from "./utilities/types";

  import FunctionTable from "./components/FunctionTable.svelte";
  import FunctionTableRow from "./components/FunctionTableRow.svelte";
  import FunctionTableProcessNode from "./components/FunctionTableProcessNode.svelte";

  export let sampleSources: SampleSourceInfo[];
  export let processes: ProcessInfo[]|null;
  export let activeFunction: FunctionId|null = null;
  
  let sortBy: string|null = null;
  let sortOrder: string|null = null;
  let sortSourceId: number|null = null;

  $: if (sampleSources !== null) {
      if(sortBy === null && sampleSources.length > 0) {
        const timerSource = sampleSources.find(sourceInfo => sourceInfo.name === "Timer" || sourceInfo.name.startsWith("cycles"));
        let sortSource = timerSource !== undefined ? timerSource : sampleSources[0];
        toggleSortBySample("self_samples", sortSource.id);
      }
    }
  
  function toggleSortOrder()
  {
    if(sortOrder === "descending") {
      sortOrder = "ascending";
    }
    else {
      sortOrder = "descending";
    }
  }

  function toggleSortBySample(by:string, source:number)
  {
    if(source !== sortSourceId || by !== sortBy) {
      sortBy = by;
      sortSourceId = source;
      sortOrder = "descending";
    }
    else {
      toggleSortOrder();
    }
  }
  function toggleSortByName()
  {
    if(sortBy !== 'name') {
      sortBy = 'name';
      sortSourceId = null;
      sortOrder = "ascending";
    }
    else {
      toggleSortOrder();
    }
  }

  const dispatch = createEventDispatcher();

</script>

<FunctionTable
  on:toggle={(event) => {
    if(event.detail.header === 'name') {
      toggleSortByName();
    }
    else {
      toggleSortBySample(event.detail.header, event.detail.sourceId);
    }
  }}
  stickyHeader={true} 
  sampleSources={sampleSources}
  sortBy={sortBy}
  sortOrder={sortOrder}
  sortSourceId={sortSourceId}
  >
  {#if processes !== null}
      {#each processes as process}
        <FunctionTableProcessNode
          on:navigate={(event) =>
            dispatch("navigate", {
              functionId: event.detail.functionId,
            })}
          process={process}
          sampleSources={sampleSources}
          activeFunction={activeFunction}
          sortBy={sortBy}
          sortOrder={sortOrder}
          sortSourceId={sortSourceId}
        />
      {/each}
  {:else}
      <!-- Placeholders -->
      <FunctionTableRow func={null} isHot={false} sampleSources={sampleSources}/>
      <FunctionTableRow func={null} isHot={false} sampleSources={sampleSources}/>
      <FunctionTableRow func={null} isHot={false} sampleSources={sampleSources}/>
      <FunctionTableRow func={null} isHot={false} sampleSources={sampleSources}/>
  {/if}
</FunctionTable>
