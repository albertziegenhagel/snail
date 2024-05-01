<script lang="ts">
  import { createEventDispatcher } from "svelte";

  import type { SampleSourceInfo } from "../utilities/types";
  export let stickyHeader : boolean = false;
  export let showAllSelfColumns : boolean = true;
  export let sampleSources : SampleSourceInfo[];

  export let sortBy: string|null = null;
  export let sortOrder: string|null = null;
  export let sortSourceId: number|null = null;

  function onHeader(header:string, sourceId:number|null) {

    dispatch("toggle", {
      header: header,
      sourceId: sourceId
    });
  }

  const dispatch = createEventDispatcher();
</script>

<table>
  <colgroup>
    <col class="function-column"/>
    {#each sampleSources as source}
      {#if source.hasStacks}
        <col class="total-samples-column"/>
      {/if}
      {#if source.hasStacks || showAllSelfColumns}
        <col class="self-samples-column"/>
      {/if}
    {/each}
    <col class="module-column"/>
  </colgroup>
  <thead class:sticky={stickyHeader}>
    <tr>
      <td on:keypress={() => onHeader('name', null)} on:click={() => onHeader('name', null)}>
        <div class="function-head">
          <span>Function Name</span>
          {#if sortBy === 'name'}
          <span class="order-indicator codicon codicon-triangle-{sortOrder === 'ascending' ? 'up' : 'down'}"/>
          {/if}
        </div>
      </td>
      {#each sampleSources as source}
        {#if source.hasStacks}
          <td  on:keypress={() => onHeader('total_samples', source.id)} on:click={() => onHeader('total_samples', source.id)}>
            <div class="total-samples-head">
              <span>{source.name} (total)</span>
              {#if sortBy === 'total_samples' && sortSourceId === source.id}
              <span class="order-indicator codicon codicon-triangle-{sortOrder === 'ascending' ? 'up' : 'down'}"/>
              {/if}
            </div>
          </td>
        {/if}
        {#if source.hasStacks || showAllSelfColumns}
          <td  on:keypress={() => onHeader('self_samples', source.id)} on:click={() => onHeader('self_samples', source.id)}>
            <div class="self-samples-head">
              <span>{source.name} (self)</span>
              {#if sortBy === 'self_samples' && sortSourceId === source.id}
              <span class="order-indicator codicon codicon-triangle-{sortOrder === 'ascending' ? 'up' : 'down'}"/>
              {/if}
            </div>
          </td>
        {/if}
      {/each}
      <td>
        <div class="module-head">Module</div>
      </td>
    </tr>
  </thead>
  <tbody>
    <slot></slot>
  </tbody>
</table>
  
<style>
  table {
    border-collapse: collapse;
    border-spacing: 0px;
    box-sizing: content-box;
    width: 100%;
    table-layout: fixed;
  }
  thead.sticky {
    background: var(--background);
    position: sticky;
    top: 0;
  }
  thead > tr {
    font-weight: 600;
  }

  td > div {
    display: flex;
    margin-left: 2px;
    margin-right: 2px;
  }

  .total-samples-head,
  .self-samples-head {
    justify-content: right;
  }

  .function-column {
    width: 70%;
  }

  .total-samples-column,
  .self-samples-column,
  .module-column {
    width: 10%;
  }

  .order-indicator {
    margin-left: 2px;
    font-weight: normal;
    font-size: smaller;
    display: flex;
    align-items: center;
  }
</style>
