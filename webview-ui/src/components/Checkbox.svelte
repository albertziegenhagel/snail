<script lang="ts">
  interface Props {
    disabled?: boolean;
    checked: boolean;
    onchange?: (event : Event) => void;
  }

  let { disabled, checked = $bindable(), onchange }: Props = $props();
</script>


<input
  class="checkbox-control codicon checkbox-icon"
  class:codicon-check={checked}
  type="checkbox"
  bind:checked={checked}
  {disabled}
  onchange={(event) => {onchange?.(event)}}
/>

<style>
  .checkbox-control {
    position: relative;
    width: calc(var(--design-unit) * 4px);
    height: calc(var(--design-unit) * 4px);
    box-sizing: border-box;
    border-radius: 3px;
    border: 1px solid var(--vscode-settings-checkboxBorder);
    background: var(--vscode-settings-checkboxBackground);
    outline: none;
    cursor: pointer;
    appearance: none;
    margin: 0 calc(var(--design-unit) * 1.5px) 0 0;
  }

  input.checkbox-icon {
    font-size: 11pt;
  }

  .checkbox-control:active {
    background: var(--vscode-settings-checkboxBackground);
    border-color: var(--vscode-focusBorder);
  }
  .checkbox-control:focus-visible {
    border: 1px solid var(--vscode-focusBorder);
  }
</style>
