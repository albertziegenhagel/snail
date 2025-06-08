<script lang="ts">

  interface Props {
    children?: import('svelte').Snippet;
    disabled: boolean
    label: string
    onclick?: (event : MouseEvent) => void;
  }

  let { children, disabled, label, onclick }: Props = $props();

</script>

<button
  class="action-button"
  aria-label={label}
  title={label}
  disabled={disabled}
  onclick={(event) => onclick?.(event)}
>
  {@render children?.()}
</button>

<style>
    .action-button:disabled {
      cursor: not-allowed;
      opacity: 0.4;
      pointer-events: none;
    }

    .action-button {
      display: flex;
      align-items: center;
      border-color: transparent;
      border-style: solid;
      border-width: 1px;
      border-radius: 5px;
      color: var(--vscode-icon-foreground);
      background-color: transparent;
      cursor: pointer;
      padding: 2px;
    }

    .action-button:hover {
      background-color: var(--vscode-toolbar-hoverBackground);
    }

    .action-button:active {
      background-color: var(--vscode-toolbar-activeBackground);
    }

    .action-button:focus {
      outline: none;
    }

    .action-button:focus-visible {
      border-color: var(--vscode-focusBorder);
    }
</style>
