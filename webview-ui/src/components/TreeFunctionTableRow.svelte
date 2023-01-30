<script lang="ts">
    import { createEventDispatcher } from "svelte";

    import { vscode } from "../utilities/vscode";
    import type { CallTreeNode, FunctionId } from "../utilities/types";

    import FunctionTableRow from "./FunctionTableRow.svelte";

    export let processId: number;
    export let node: CallTreeNode;
    export let level: number;
    export let activeFunction: FunctionId;

    const dispatch = createEventDispatcher();

    $: hasChildren =
        node !== null && (node.children === null || node.children.length > 0);

    $: if (node !== null && node.children !== null) {
        node.children.sort((a, b) => {
            return -(a.total_samples - b.total_samples);
        });
    }

    $: isHot = node !== null && node.is_hot;
    $: isActive = node !== null && activeFunction != null && processId == activeFunction.process_id && node.function_id == activeFunction.function_id;

    let expanded: boolean =
        node !== null && node.children !== null && node.is_hot;
    const toggleExpansion = () => {
        expanded = !expanded;
        if (expanded && node.children === null) {
            vscode.postMessage({
                command: "expand_call_tree_node",
                processId: processId,
                nodeId: node.id,
            });
        }
    };

    function navigateToSelf() {
        dispatch("navigate", {
            functionId: {
                process_id: processId,
                function_id: node.function_id,
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
        if (event.data.type !== "call_tree_node_children") return;
        if (event.data.data["id"] !== node.id) return;
        event.data.data["children"].sort((a, b) => {
            return -(a.total_samples - b.total_samples);
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
                {processId}
                node={child}
                level={level + 1}
                {activeFunction}
            />
        {/each}
    {:else}
        <!-- Placeholder -->
        <svelte:self
            {processId}
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
    }
    .twistie.collapsed:before {
        transform: rotate(-90deg);
    }
</style>
