<script lang="ts">
  import type { InfoEntry } from "../utilities/types";
  import Placeholder from "./Placeholder.svelte";

  interface Props {
    entries: InfoEntry[] | null;
  }

  let { entries }: Props = $props();
</script>

<table>
  <colgroup>
    <col class="key-column" />
    <col class="value-column" />
  </colgroup>
  <tbody>
    {#if entries != null}
      {#each entries as entry}
        <tr>
          <td class="key-data">
            <span>{entry.key}:</span>
          </td>
          <td class="value-data">
            <span title={entry.value}>{entry.value}</span>
          </td>
        </tr>
      {/each}
    {:else}
      <tr>
        <td class="key-data"><Placeholder /></td>
        <td class="value-data"><Placeholder /></td>
      </tr>
      <tr>
        <td class="key-data"><Placeholder /></td>
        <td class="value-data"><Placeholder /></td>
      </tr>
    {/if}
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
  .key-data {
    font-weight: 600;
    width: 1%;
    white-space: nowrap;
  }
  .value-data {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .key-column {
    width: 20%;
  }
  .value-column {
    width: 80%;
  }
</style>
