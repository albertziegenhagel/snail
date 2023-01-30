<script lang="ts">
    export let stickyHeader : boolean = false;
  </script>
  
  <table>
    <colgroup>
      <col class="function-column"/>
      <col class="total-samples-column"/>
      <col class="self-samples-column"/>
      <col class="module-column"/>
    </colgroup>
    <thead class:sticky={stickyHeader}>
      <tr>
        <td><div class="function-head">Function Name</div></td>
        <td><div class="total-samples-head">Total</div></td>
        <td><div class="self-samples-head">Self</div></td>
        <td><div class="module-head">Module</div></td>
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
  </style>
  