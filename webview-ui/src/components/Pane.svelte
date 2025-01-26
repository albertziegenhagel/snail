<script lang="ts">
  interface Props {
    title: string;
    toolbar?: import('svelte').Snippet;
    children?: import('svelte').Snippet;
  }

  let { title, toolbar, children }: Props = $props();

  let expanded: boolean = $state(true);

  const toggleExpansion = () => {
    expanded = !expanded;
  };
</script>

<div class="pane">
  <div
    role="button"
    tabindex="0"
    onclick={toggleExpansion}
    onkeypress={toggleExpansion}
    class="pane-header"
    aria-expanded={expanded}
  >
    <div
      class="twistie codicon codicon-chevron-down"
      class:collapsed={!expanded}
      aria-expanded={expanded}
    ></div>
    <h3 class="title">
      {title}
    </h3>

    <div class="toolbar">
      {@render toolbar?.()}
    </div>
  </div>
  <div class="pane-body" class:collapsed={!expanded}>
    {@render children?.()}
  </div>
</div>

<style>
  .pane-header {
    height: 22px;
    line-height: 22px;
    box-sizing: border-box;
    color: var(--vscode-sideBarSectionHeader-foreground);
    background-color: var(--vscode-sideBarSectionHeader-background);
    border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
    cursor: pointer;
    overflow: hidden;
    align-items: center;
    display: flex;
  }
  .pane-header .title {
    text-transform: uppercase;
    text-overflow: ellipsis;
    margin-block-start: 0;
    margin-block-end: 0;
    font-size: 11px;
  }
  .pane-header .toolbar {
    margin-left: auto;
  }

  .pane-body {
    padding: 0 0 1em;
    display: flex;
    flex-direction: column;
  }

  .pane-body.collapsed {
    display: none;
  }

  .twistie {
    padding-right: 6px;
  }
  .twistie:before {
    display: block;
  }
  .twistie.collapsed:before {
    transform: rotate(-90deg);
  }
</style>
