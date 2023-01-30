<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { getModuleDisplayName } from "../utilities/path";
    import type { FunctionNode } from "../utilities/types";
    import Placeholder from "./Placeholder.svelte";

    export let func: FunctionNode;
    export let isHot: boolean = false;
    export let isActive: boolean = false;

    const dispatch = createEventDispatcher();
</script>

<tr class:active={isActive}>
    <td>
        <div class="function-name">
            <slot name="function-name-prefix" />
            {#if isHot}
                <div class="hot"><i class="codicon codicon-flame" /></div>
            {/if}
            {#if func !== null}
                <span
                    on:click={() => {
                        dispatch("navigate");
                    }}
                    on:keypress={() => {
                        dispatch("navigate");
                    }}
                    class="function-name-text clickable"
                    title={func.name}>{func.name}</span
                >
            {:else}
                <Placeholder />
            {/if}
        </div>
    </td>
    <td>
        <div class="total-samples">
            <slot name="total-samples-prefix" />
            {#if func !== null}
                <span class="total-samples-text"
                    >{func.total_samples} ({func.total_percent.toFixed(
                        2
                    )}%)</span
                >
            {:else}
                <Placeholder />
            {/if}
        </div>
    </td>
    <td>
        <div class="self-samples">
            <slot name="self-samples-prefix" />
            {#if func !== null}
                <span class="self-samples-text"
                    >{func.self_samples} ({func.self_percent.toFixed(2)}%)</span
                >
            {:else}
                <Placeholder />
            {/if}
        </div>
    </td>
    <td>
        <div class="modules">
            <slot name="modules-prefix" />
            {#if func !== null}
                <span class="modules-text" title={func.module}
                    >{getModuleDisplayName(func.module)}</span
                >
            {:else}
                <Placeholder />
            {/if}
        </div>
    </td>
</tr>

<style>
    tr {
        white-space: nowrap;
        line-height: 22px;
    }
    tr:hover {
        background-color: var(--vscode-list-hoverBackground);
        color: var(--vscode-list-hoverForeground);
    }
    tr.active {
        background-color: var(--vscode-list-inactiveSelectionBackground);
    }

    .function-name-text.clickable {
        cursor: pointer;
    }

    .function-name-text.clickable:hover {
        text-decoration: underline;
    }

    td > div {
        display: flex;
        margin-left: 2px;
        margin-right: 2px;
    }

    td > div > span {
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .total-samples,
    .self-samples {
        justify-content: right;
    }

    .hot {
        display: flex;
        align-items: center;
        color: var(--vscode-notificationsErrorIcon-foreground);
        padding-right: 4px;
    }
</style>
