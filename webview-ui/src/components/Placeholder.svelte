<script lang="ts">
  export let width: number = 50;
  export let range: number = 20;
</script>

<div
  class="placeholder"
  style="width: {width + (Math.random() - 0.5) * range}%;"
/>

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
