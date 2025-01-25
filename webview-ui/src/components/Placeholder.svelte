<script lang="ts">
  interface Props {
    width?: number;
    range?: number;
  }

  let { width = 50, range = 20 }: Props = $props();
</script>

<div
  class="placeholder"
  style="width: {width + (Math.random() - 0.5) * range}%;"
></div>

<style>
  .placeholder {
    animation: skeleton 1s linear infinite alternate;
    border-radius: 3px;
    margin-top: 3px;
    margin-bottom: 3px;
    line-height: normal;
    font-size: 80%;
  }
  .placeholder::before {
    content: "\200b";
  }
  @keyframes skeleton {
    0% {
      background-color: var(--vscode-editorWidget-background);
    }
    100% {
      background-color: var(--vscode-editorWidget-border);
    }
  }
</style>
