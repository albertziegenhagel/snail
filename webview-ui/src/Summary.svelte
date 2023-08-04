<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Pane from "./components/Pane.svelte";
    import FunctionTable from "./components/FunctionTable.svelte";
    import FunctionTableRow from "./components/FunctionTableRow.svelte";
    import TimeLine from "./components/TimeLine.svelte";
    import InfoTable from "./components/InfoTable.svelte";
    import type {
        FunctionId,
        ProcessFunction,
        ProcessInfo,
        TimeSpan,
    } from "./utilities/types";

    export let processes: ProcessInfo[] = null;
    export let totalTime: TimeSpan = null;
    export let sessionInfo = null;
    export let systemInfo = null;

    export let hotFunctions: ProcessFunction[] = null;
    export let activeFunction: FunctionId;

    const dispatch = createEventDispatcher();
</script>

<div class="container">
    <Pane title="Timeline">
        <TimeLine {processes} {totalTime} />
    </Pane>
    <Pane title="Hot spots">
        <FunctionTable>
            {#if hotFunctions !== null}
                {#each hotFunctions as func}
                    <FunctionTableRow
                        on:navigate={() =>
                            dispatch("navigate", {
                                functionId: {
                                    processKey: func.processKey,
                                    functionId: func.function.id,
                                },
                            })}
                        func={func.function}
                        isHot={true}
                        isActive={func.processKey ==
                            activeFunction?.processKey &&
                            func.function.id == activeFunction?.functionId}
                    />
                {/each}
            {:else}
                <!-- Placeholders -->
                <FunctionTableRow func={null} isHot={true} />
                <FunctionTableRow func={null} isHot={true} />
                <FunctionTableRow func={null} isHot={true} />
                <FunctionTableRow func={null} isHot={true} />
            {/if}
        </FunctionTable>
    </Pane>
    <Pane title="Session Info">
        <InfoTable entries={sessionInfo} />
    </Pane>
    <Pane title="System Info">
        <InfoTable entries={systemInfo} />
    </Pane>
</div>

<style>
</style>
