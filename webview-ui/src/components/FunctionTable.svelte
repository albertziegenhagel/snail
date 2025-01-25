<script lang="ts">
  import type { SampleSourceInfo } from "../utilities/types";

  interface Props {
    stickyHeader?: boolean;
    showAllSelfColumns?: boolean;
    sampleSources: SampleSourceInfo[];
    sortBy?: string | null;
    sortOrder?: string | null;
    sortSourceId?: number | null;
    toggle?: (header: string, sourceId: number | null) => void;
    children?: import("svelte").Snippet;
  }

  let {
    stickyHeader = false,
    showAllSelfColumns = true,
    sampleSources,
    sortBy = null,
    sortOrder = null,
    sortSourceId = null,
    toggle,
    children,
  }: Props = $props();

  function onHeader(header: string, sourceId: number | null) {
    toggle?.(header, sourceId);
  }
</script>

<table>
  <colgroup>
    <col class="function-column" />
    {#each sampleSources as source}
      {#if source.hasStacks}
        <col class="total-samples-column" />
      {/if}
      {#if source.hasStacks || showAllSelfColumns}
        <col class="self-samples-column" />
      {/if}
    {/each}
    <col class="module-column" />
  </colgroup>
  <thead class:sticky={stickyHeader}>
    <tr>
      <td
        onkeypress={() => onHeader("name", null)}
        onclick={() => onHeader("name", null)}
      >
        <div class="function-head">
          <span>Function Name</span>
          {#if sortBy === "name"}
            <span
              class="order-indicator codicon codicon-triangle-{sortOrder ===
              'ascending'
                ? 'up'
                : 'down'}"
            ></span>
          {/if}
        </div>
      </td>
      {#each sampleSources as source}
        {#if source.hasStacks}
          <td
            onkeypress={() => onHeader("total_samples", source.id)}
            onclick={() => onHeader("total_samples", source.id)}
          >
            <div class="total-samples-head">
              <span>{source.name} (total)</span>
              {#if sortBy === "total_samples" && sortSourceId === source.id}
                <span
                  class="order-indicator codicon codicon-triangle-{sortOrder ===
                  'ascending'
                    ? 'up'
                    : 'down'}"
                ></span>
              {/if}
            </div>
          </td>
        {/if}
        {#if source.hasStacks || showAllSelfColumns}
          <td
            onkeypress={() => onHeader("self_samples", source.id)}
            onclick={() => onHeader("self_samples", source.id)}
          >
            <div class="self-samples-head">
              <span>{source.name} (self)</span>
              {#if sortBy === "self_samples" && sortSourceId === source.id}
                <span
                  class="order-indicator codicon codicon-triangle-{sortOrder ===
                  'ascending'
                    ? 'up'
                    : 'down'}"
                ></span>
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
    {@render children?.()}
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
    z-index: 1;
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
