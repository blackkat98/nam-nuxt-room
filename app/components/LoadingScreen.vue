<script setup lang="ts">
/**
 * Covers the page while the 3D room starts up: an 8-bit segmented bar that fills as the scene reports progress.
 * It's server-rendered, so it shows from the very first paint, before any script has loaded.
 */
const props = defineProps<{
    /** 0 to 1. */
    progress: number
    /** The room is on screen: the bar fills up and the screen fades away. */
    done: boolean
}>()

/** Blocks in the bar. */
const SEGMENTS = 12
/** The screen stays at least this long (ms), so a fast load doesn't just flicker. */
const MIN_VISIBLE = 600
/** How long the full bar stays up before fading, in ms. */
const FULL_HOLD = 250
/** The fade-out, in ms (matches the CSS transition). */
const FADE = 400

const visible = ref(true)
const fading = ref(false)
const shownAt = ref(0)
const filled = computed(() => Math.round((props.done ? 1 : props.progress) * SEGMENTS))
const percent = computed(() => Math.round((props.done ? 1 : props.progress) * 100))

let hideTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
    shownAt.value = performance.now()
})

watch(() => props.done, (done) => {
    if (done) {
        const wait = Math.max(FULL_HOLD, MIN_VISIBLE - (performance.now() - shownAt.value))
        // fade, then remove on a timer rather than on transitionend, which isn't guaranteed to fire
        hideTimer = setTimeout(() => {
            fading.value = true
            hideTimer = setTimeout(() => {
                visible.value = false
            }, FADE)
        }, wait)
    }
})

onBeforeUnmount(() => clearTimeout(hideTimer))
</script>

<template>
    <div
        v-if="visible"
        class="loading"
        :class="{ fading }"
        role="status"
        aria-live="polite"
    >
        <p class="title">
            Loading room<span
                class="dots"
                aria-hidden="true"
            ><span>.</span><span>.</span><span>.</span></span>
        </p>
        <div
            class="bar"
            role="progressbar"
            aria-label="Loading the room"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="percent"
        >
            <span
                v-for="i in SEGMENTS"
                :key="i"
                class="segment"
                :class="{ on: i <= filled, next: i === filled + 1 && !done }"
            />
        </div>
        <p class="percent">
            {{ percent }}%
        </p>
        <p class="credit">
            Powered by Nuxt and ThreeJS
        </p>
    </div>
</template>

<style scoped>
.loading {
    --ink: #3b2219;
    --lit: #4ade80;
    --unlit: rgba(59, 34, 25, 0.15);

    position: fixed;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 16px;
    isolation: isolate;
    background: var(--bg-gradient);
    color: var(--ink);
    font-family: 'Press Start 2P', ui-monospace, monospace;
    text-align: center;
}

/* the night gradient on top, the same way the page background does it */
.loading::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: var(--bg-gradient-dark);
    opacity: 0;
}

:root[data-theme='dark'] .loading {
    --ink: #e6e2ff;
    --unlit: rgba(230, 226, 255, 0.14);
}

:root[data-theme='dark'] .loading::before {
    opacity: 1;
}

.title {
    margin: 0;
    font-size: clamp(14px, 4vw, 20px);
    line-height: 1.4;
}

.dots span {
    animation: blink 1.2s steps(1) infinite;
}

.dots span:nth-child(2) {
    animation-delay: 0.2s;
}

.dots span:nth-child(3) {
    animation-delay: 0.4s;
}

.bar {
    display: flex;
    gap: 4px;
    width: min(100%, 336px);
    padding: 5px;
    border: 3px solid var(--ink);
    border-radius: 4px;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.2);
}

.segment {
    flex: 1;
    height: 18px;
    background: var(--unlit);
    transition: background-color 0.15s steps(1);
}

.segment.on {
    background: var(--lit);
    box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.18);
}

/* the block being worked on flickers, so a slow step doesn't look frozen */
.segment.next {
    animation: pending 0.8s steps(1) infinite;
}

.percent {
    margin: 0;
    font-size: 10px;
}

.credit {
    position: absolute;
    bottom: 24px;
    left: 16px;
    right: 16px;
    margin: 0;
    font-size: 8px;
    line-height: 1.6;
    letter-spacing: 0.06em;
    opacity: 0.6;
}

.loading.fading {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s ease;
}

@keyframes blink {
    50% {
        opacity: 0;
    }
}

@keyframes pending {
    50% {
        background: color-mix(in srgb, var(--lit) 45%, transparent);
    }
}

@media (prefers-reduced-motion: reduce) {
    .dots span,
    .segment.next {
        animation: none;
    }
}
</style>
