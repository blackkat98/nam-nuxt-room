<script setup lang="ts">
import type { BubbleMetrics } from '~/composables/useStageLayout'

const props = withDefaults(defineProps<{
    text: string
    width: number
    metrics: BubbleMetrics
    /** Where the tail's tip should point, in px from the bubble's left edge; centred when omitted. */
    tailX?: number
    /** ms per character. */
    charDelay?: number
}>(), { charDelay: 45, tailX: undefined })

/** Extra beat after punctuation, like old RPG text boxes. */
const PUNCTUATION_DELAY = 280
const START_DELAY = 400
/** Tail width relative to its height, and where along that width its tip sits. */
const TAIL_WIDTH = 1.4
const TAIL_TIP = 0.3

const shown = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined

const typed = computed(() => props.text.slice(0, shown.value))
// The untyped rest is laid out invisibly so words never jump to the next line mid-typing.
const pending = computed(() => props.text.slice(shown.value))
const done = computed(() => shown.value >= props.text.length)

const style = computed(() => {
    const m = props.metrics
    const tailWidth = m.tail * TAIL_WIDTH
    // keep the tail on the straight part of the bottom edge, clear of the rounded corners
    const minTip = m.border + m.radius + tailWidth * TAIL_TIP
    const maxTip = props.width - m.border - m.radius - tailWidth * (1 - TAIL_TIP)
    const tip = Math.min(maxTip, Math.max(minTip, props.tailX ?? props.width / 2))

    return {
        'width': `${props.width}px`,
        'height': `${m.height}px`,
        'padding': `${m.padY}px ${m.padX}px`,
        'borderWidth': `${m.border}px`,
        'borderRadius': `${m.radius}px`,
        'fontSize': `${m.fontSize}px`,
        'lineHeight': `${m.lineHeight}px`,
        '--tail': `${m.tail}px`,
        // absolute children are placed from the padding box, i.e. inside the left border
        '--tail-left': `${tip - m.border - tailWidth * TAIL_TIP}px`,
        '--border': `${m.border}px`,
    }
})

function stop() {
    clearTimeout(timer)
    timer = undefined
}

function step() {
    if (done.value) {
        return
    }

    shown.value++
    const delay = /[.,!?]/.test(props.text[shown.value - 1] ?? '') ? PUNCTUATION_DELAY : props.charDelay
    timer = setTimeout(step, delay)
}

function start() {
    stop()

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        shown.value = props.text.length

        return
    }

    shown.value = 0
    timer = setTimeout(step, START_DELAY)
}

onMounted(async () => {
    // Wait for the pixel font so the first characters don't flash in the fallback font.
    await document.fonts?.ready.catch(() => undefined)
    start()
})
watch(() => props.text, start)
onBeforeUnmount(stop)
</script>

<template>
    <div
        class="bubble"
        :style="style"
    >
        <p
            class="text"
            :aria-label="text"
        >
            <span aria-hidden="true">{{ typed }}</span><span
                class="pending"
                aria-hidden="true"
            >{{ pending }}</span>
        </p>
        <span
            v-if="done"
            class="next"
            aria-hidden="true"
        />
        <svg
            class="tail"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            <polygon
                points="0,0 100,0 30,100"
                fill="#fff"
            />
            <polyline
                points="0,0 30,100 100,0"
                fill="none"
                stroke="#1b1b1e"
                vector-effect="non-scaling-stroke"
                :stroke-width="metrics.border"
                stroke-linejoin="miter"
            />
        </svg>
    </div>
</template>

<style scoped>
.bubble {
    position: relative;
    box-sizing: border-box;
    border-style: solid;
    border-color: #1b1b1e;
    background: #fff;
    box-shadow: 0 6px 0 rgba(80, 40, 25, 0.18);
    font-family: 'Press Start 2P', ui-monospace, monospace;
    color: #1b1b1e;
    user-select: none;
}

.text {
    height: 100%;
    margin: 0;
    overflow: hidden;
    overflow-wrap: break-word;
    -webkit-font-smoothing: none;
}

.pending {
    visibility: hidden;
}

/* Blinking "more" arrow once the line has finished typing. */
.next {
    position: absolute;
    right: calc(var(--tail) * 0.6);
    bottom: calc(var(--tail) * 0.35);
    width: calc(var(--tail) * 0.55);
    height: calc(var(--tail) * 0.35);
    background: #1b1b1e;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    animation: blink 1s steps(1) infinite;
}

/* Positioned against the padding box, so it starts on the inner edge of the bottom border and hides it. */
.tail {
    position: absolute;
    top: 100%;
    left: var(--tail-left);
    width: calc(var(--tail) * 1.4);
    height: calc(var(--tail) + var(--border));
    overflow: visible;
}

@keyframes blink {
    50% {
        opacity: 0;
    }
}
</style>
