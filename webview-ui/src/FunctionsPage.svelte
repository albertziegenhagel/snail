<script lang="ts">
  import type {
    ProcessInfo,
    FunctionId,
    SampleSourceInfo,
  } from "./utilities/types";

  import FunctionTable from "./components/FunctionTable.svelte";
  import FunctionTableRow from "./components/FunctionTableRow.svelte";
  import FunctionTableProcessNode from "./components/FunctionTableProcessNode.svelte";

  interface Props {
    sampleSources: SampleSourceInfo[];
    processes: ProcessInfo[] | null;
    activeFunction?: FunctionId | null;
    navigate: (functionId: FunctionId) => void;
  }

  let { sampleSources, processes, activeFunction = null, navigate }: Props = $props();

  let sortBy: string | null = $state(null);
  let sortOrder: string | null = $state(null);
  let sortSourceId: number | null = $state(null);


  function toggleSortOrder() {
    if (sortOrder === "descending") {
      sortOrder = "ascending";
    } else {
      sortOrder = "descending";
    }
  }

  function toggleSortBySample(by: string, source: number) {
    if (source !== sortSourceId || by !== sortBy) {
      sortBy = by;
      sortSourceId = source;
      sortOrder = "descending";
    } else {
      toggleSortOrder();
    }
  }
  function toggleSortByName() {
    if (sortBy !== "name") {
      sortBy = "name";
      sortSourceId = null;
      sortOrder = "ascending";
    } else {
      toggleSortOrder();
    }
  }

  $effect(() => {
    if (sampleSources !== null) {
      if (sortBy === null && sampleSources.length > 0) {
        const timerSource = sampleSources.find(
          (sourceInfo) =>
            sourceInfo.name === "Timer" || sourceInfo.name.startsWith("cycles"),
        );
        let sortSource =
          timerSource !== undefined ? timerSource : sampleSources[0];
        toggleSortBySample("self_samples", sortSource.id);
      }
    }
  });
</script>

<FunctionTable
  toggle={(header, sourceId) => {
    if (header === "name") {
      toggleSortByName();
    } else {
      toggleSortBySample(header, sourceId!);
    }
  }}
  stickyHeader={true}
  {sampleSources}
  {sortBy}
  {sortOrder}
  {sortSourceId}
>
  {#if processes !== null}
    {#each processes as process}
      <FunctionTableProcessNode
        navigate={(functionId) => navigate(functionId)}
        {process}
        {sampleSources}
        {activeFunction}
        {sortBy}
        {sortOrder}
        {sortSourceId}
      />
    {/each}
  {:else}
    <!-- Placeholders -->
    <FunctionTableRow node={null} isHot={false} {sampleSources} />
    <FunctionTableRow node={null} isHot={false} {sampleSources} />
    <FunctionTableRow node={null} isHot={false} {sampleSources} />
    <FunctionTableRow node={null} isHot={false} {sampleSources} />
  {/if}
</FunctionTable>
