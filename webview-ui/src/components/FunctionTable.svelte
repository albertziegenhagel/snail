<script lang="ts">
  import type { Action } from "svelte/action";
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
    scrollable?: HTMLElement | null;
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
    scrollable,
  }: Props = $props();

  let headerIsStuck = $state(false);
  let scrolled = $state(false);
  let showShadow = $derived(headerIsStuck && scrolled);

  $effect(() => {
    if (scrollable) {
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.type === "attributes") {
            scrolled = scrollable.hasAttribute("scrolled");
          }
        });
      });

      observer.observe(scrollable, {
        attributes: true,
      });
      // FIXME: disconnect observer when done
    }
  });

  function onHeader(header: string, sourceId: number | null) {
    toggle?.(header, sourceId);
  }

  function handleStuck(e: CustomEvent) {
    headerIsStuck = e.detail.isStuck;
  }

  type Parameter = HTMLElement | null | undefined;

  interface Attributes {
    onstuck: (event: CustomEvent) => void;
  }

  export const sticky: Action<HTMLElement, Parameter, Attributes> = (
    node,
    param,
  ) => {
    let observer = new IntersectionObserver(
      ([entry]) => {
        let isStuck = entry.intersectionRatio >= 1;

        node.dispatchEvent(
          new CustomEvent("stuck", {
            detail: { isStuck },
          }),
        );
      },
      {
        root: param,
        threshold: [1],
      },
    );

    observer.observe(node);

    return {
      update(param) {
        observer.disconnect();

        observer = new IntersectionObserver(
          ([entry]) => {
            let isStuck = entry.intersectionRatio < 1;

            node.dispatchEvent(
              new CustomEvent("stuck", {
                detail: { isStuck },
              }),
            );
          },
          {
            root: param,
            threshold: [1],
            rootMargin: "-1px 0px 0px 0px",
          },
        );

        observer.observe(node);
        // observer.unobserve(node);
        // observer.observe(node);
      },

      destroy() {
        observer.disconnect();
      },
    };
  };
</script>

<!-- <div class="outer">
  <div class="inner"> -->
    
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
  <thead
    class:sticky={stickyHeader}
    class:stuck={showShadow}
    use:sticky={scrollable}
    onstuck={handleStuck}
  >
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
              <span class=head-source-name title="{source.name} (total)">{source.name}</span>
              <span class=head-source-kind title="{source.name} (total)">&nbsp;(total)</span>
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
              <span class=head-source-name title="{source.name} (self)">{source.name}</span>
              <span class=head-source-kind title="{source.name} (self)">&nbsp;(self)</span>
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
<!-- </div>
</div> -->

<style>
  table {
    border-collapse: collapse;
    border-spacing: 0px;
    box-sizing: content-box;
    width: 100%;
    table-layout: fixed;
  }
  thead.sticky {
    background: var(--vscode-editorStickyScroll-background);
    position: sticky;
    top: 0;
  }
  thead.sticky:not(.stuck) {
    z-index: 1;
  }
  thead.sticky.stuck {
    z-index: 3;
  }

  /* .outer {
    overflow-x: clip;
  }

  .inner {
    overflow-x: auto;
  } */

  thead.sticky.stuck::after {
    box-shadow: var(--vscode-scrollbar-shadow) 0 6px 6px -6px inset;
    content: "";
    left: 0;
    bottom: -3px;
    height: 3px;
    pointer-events: none;
    position: absolute;
    width: 100%;
  }

  tbody {
    position: relative;
    /* z-index: -1; */
  }
  thead > tr {
    font-weight: 600;
  }

  td > div {
    display: flex;
    margin-left: 2px;
    margin-right: 2px;
  }

  .head-source-name {
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .total-samples-head,
  .self-samples-head {
    justify-content: right;
    overflow: hidden;
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
