<script lang="ts">
    import { createEventDispatcher } from "svelte";

    import { vscode } from "../utilities/vscode";
    import type { CallTreeNode, FunctionId } from "../utilities/types";

    import FunctionTableRow from "./FunctionTableRow.svelte";

    export let processKey: number;
    export let node: CallTreeNode;
    export let level: number;
    export let activeFunction: FunctionId;

    const dispatch = createEventDispatcher();

    $: hasChildren =
        node !== null && (node.children === null || node.children.length > 0);

    let expanded: boolean|null = null;

    $: if (node !== null && node.children !== null) {
        node.children.sort((a, b) => {
            return -(a.totalSamples - b.totalSamples);
        });
        if(expanded === null) {
          expanded = node.isHot;
        }
    }

    $: isHot = node !== null && node.isHot;
    $: isActive = node !== null && activeFunction != null && processKey == activeFunction.processKey && node.functionId == activeFunction.functionId;

    const toggleExpansion = () => {
        if(expanded === null) {
          expanded = true
        }
        else {
          expanded = !expanded;
        }
        if (expanded && node.children === null) {
            vscode.postMessage({
                command: "expandCallTreeNode",
                processKey: processKey,
                nodeId: node.id,
            });
        }
    };

    function navigateToSelf() {
        dispatch("navigate", {
            functionId: {
                processKey: processKey,
                functionId: node.functionId,
            },
        });
    }

    function navigateToChild(functionId : FunctionId) {
        dispatch("navigate", {
            functionId: functionId,
        });
    }

    window.addEventListener("message", (event) => {
        if (node === null) return;
        if (event.data.type !== "callTreeNodeChildren") return;
        if (event.data.data["id"] !== node.id) return;
        event.data.data["children"].sort((a, b) => {
            return -(a.totalSamples - b.totalSamples);
        });
        node.children = event.data.data["children"];
    });
</script>

<FunctionTableRow
    on:navigate={(event) => navigateToSelf()}
    func={node}
    {isHot}
    {isActive}
>
    <span slot="function-name-prefix" class="function-name-prefix">
        <div
            on:click={toggleExpansion}
            on:keypress={toggleExpansion}
            style="padding-left: calc(var(--design-unit) * {level * 2}px);"
            class="twistie codicon codicon-chevron-down"
            class:collapsible={hasChildren}
            class:collapsed={!expanded}
        />
    </span>
</FunctionTableRow>

{#if expanded && node !== null}
    {#if node.children !== null}
        {#each node.children as child}
            <svelte:self
                on:navigate={(event) =>
                    navigateToChild(event.detail.functionId)}
                {processKey}
                node={child}
                level={level + 1}
                {activeFunction}
            />
        {/each}
    {:else}
        <!-- Placeholder -->
        <svelte:self
            {processKey}
            node={null}
            level={level + 1}
        />
    {/if}
{/if}

<style>
    .function-name-prefix {
        display: flex;
        align-items: center;
    }

    .twistie {
        display: flex;
        align-items: center;
        padding-right: 6px;
    }
    .twistie:not(.collapsible) {
        visibility: hidden;
    }
    .twistie:before {
        cursor: pointer;
        display: block;
    }
    .twistie.collapsed:before {
        transform: rotate(-90deg);
    }
</style>
