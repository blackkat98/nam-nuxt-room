<script setup lang="ts">
const props = withDefaults(defineProps<{
    open: boolean
    /** YouTube URLs (watch, youtu.be, shorts or embed links), one per channel. */
    channels?: string[]
}>(), { channels: () => [] })
const emit = defineEmits<{ close: [] }>()

/** How long the static burst and the channel number stay up after switching, in ms. */
const STATIC_TIME = 350
const OSD_TIME = 2500
/** 16:9 screen plus the bezel, the feet and the close button, never taller than the viewport. */
const TV_WIDTH = 'min(100%, 1000px, calc((100dvh - 32px - 100px - clamp(18px, 4vh, 36px)) * 16 / 9))'

// Kept while the TV is off, so it comes back on the last channel watched.
const channel = ref(0)
const showStatic = ref(false)
const showOsd = ref(false)
let staticTimer: ReturnType<typeof setTimeout> | undefined
let osdTimer: ReturnType<typeof setTimeout> | undefined

const { play } = useSound()

const videoIds = computed(() => props.channels.map(youtubeId))
const videoId = computed(() => videoIds.value[channel.value])
const embedUrl = computed(() => `https://www.youtube-nocookie.com/embed/${videoId.value}?autoplay=1&rel=0&playsinline=1`)
const channelLabel = computed(() => `CH ${String(channel.value + 1).padStart(2, '0')}`)

function flash() {
    clearTimeout(staticTimer)
    clearTimeout(osdTimer)
    showStatic.value = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    showOsd.value = true
    staticTimer = setTimeout(() => (showStatic.value = false), STATIC_TIME)
    osdTimer = setTimeout(() => (showOsd.value = false), OSD_TIME)
}

/** Moves `step` channels along, wrapping around at either end. */
function zap(step: number) {
    const count = videoIds.value.length

    if (!count) {
        return
    }

    channel.value = (channel.value + step + count) % count
    flash()
    play('static')
}

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        zap(1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        zap(-1)
    }
}

watch(() => props.open, (open) => {
    if (open) {
        window.addEventListener('keydown', onKeydown)
        // the set crackles as it comes on
        play('static')
        showOsd.value = true
        clearTimeout(osdTimer)
        osdTimer = setTimeout(() => (showOsd.value = false), OSD_TIME)
    } else {
        window.removeEventListener('keydown', onKeydown)
    }
})

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    clearTimeout(staticTimer)
    clearTimeout(osdTimer)
})
</script>

<template>
    <ModalShell
        :open="open"
        label="TV"
        close-label="Turn off the TV"
        :width="TV_WIDTH"
        @close="emit('close')"
    >
        <div class="bezel">
            <div class="screen">
                <iframe
                    v-if="videoId"
                    :key="videoId"
                    class="video"
                    :src="embedUrl"
                    :title="`TV channel ${channel + 1}`"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                />
                <slot v-else />
                <div
                    v-if="showStatic"
                    class="static"
                    aria-hidden="true"
                />
                <Transition name="osd">
                    <p
                        v-if="showOsd && videoId"
                        class="osd"
                        aria-live="polite"
                    >
                        {{ channelLabel }}
                    </p>
                </Transition>
            </div>
            <div class="controls">
                <template v-if="videoIds.length > 1">
                    <button
                        class="channel"
                        type="button"
                        aria-label="Previous channel"
                        @click="zap(-1)"
                    >
                        <span class="arrow prev" />CH
                    </button>
                    <button
                        class="channel"
                        type="button"
                        aria-label="Next channel"
                        @click="zap(1)"
                    >
                        CH<span class="arrow next" />
                    </button>
                </template>
                <span
                    class="led"
                    aria-hidden="true"
                />
            </div>
        </div>
        <svg
            class="stand"
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            <polyline
                v-for="x in [20, 80]"
                :key="x"
                :points="`${x - 8},10 ${x},0 ${x + 8},10`"
                fill="none"
                stroke="#1d1d21"
                stroke-width="6"
                stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
            />
        </svg>
    </ModalShell>
</template>

<style scoped>
.bezel {
    position: relative;
    --chin: clamp(32px, 5%, 48px);

    padding: clamp(6px, 1.2%, 14px) clamp(6px, 1.2%, 14px) var(--chin);
    border: 1px solid #3a3a40;
    border-radius: 12px;
    background: linear-gradient(180deg, #2b2b30 0%, #151518 100%);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        inset 0 -2px 0 rgba(0, 0, 0, 0.5),
        0 24px 60px rgba(0, 0, 0, 0.45);
}

.screen {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border: 2px solid #0a0a0b;
    border-radius: 3px;
    background: #050506;
    color: #f2f2f2;
}

/* A faint diagonal reflection on the glass. */
.screen::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 35%, transparent 36%);
    pointer-events: none;
}

/* Old-school power-on: a bright line that opens up into the picture, then fades. */
.screen::after {
    content: '';
    position: absolute;
    inset: 0;
    background: #fff;
    opacity: 0;
    pointer-events: none;
    animation: power-on 0.55s ease-out;
}

/* Bottom bezel ("chin"): channel buttons and the power LED. */
.controls {
    position: absolute;
    right: 3%;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: clamp(6px, 1%, 12px);
    height: var(--chin);
}

.channel {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: calc(var(--chin) - 12px);
    padding: 0 10px;
    border: 1px solid #3c3c43;
    border-radius: 5px;
    background: linear-gradient(180deg, #2f2f35 0%, #1c1c20 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 1px 0 rgba(0, 0, 0, 0.6);
    font: 9px/1 'Press Start 2P', ui-monospace, monospace;
    color: #c9c9d1;
    cursor: pointer;
}

.channel:hover,
.channel:focus-visible {
    color: #4ade80;
    border-color: #4ade80;
}

.channel:focus-visible {
    outline: none;
}

.channel:active {
    transform: translateY(1px);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.6);
}

.arrow {
    width: 6px;
    height: 8px;
    background: currentcolor;
}

.arrow.prev {
    clip-path: polygon(100% 0, 100% 100%, 0 50%);
}

.arrow.next {
    clip-path: polygon(0 0, 100% 50%, 0 100%);
}

.led {
    width: 6px;
    height: 6px;
    margin-left: 4px;
    border-radius: 50%;
    background: #ff4d4d;
    box-shadow: 0 0 6px #ff4d4d;
}

.video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
}

/* A burst of static between channels. */
.static {
    position: absolute;
    inset: -50%;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    animation: static-jitter 0.12s steps(3) infinite;
    pointer-events: none;
}

/* On-screen channel number, top right, like a TV's OSD. */
.osd {
    position: absolute;
    top: 5%;
    right: 4%;
    margin: 0;
    font: clamp(12px, 2.6vw, 26px)/1 'Press Start 2P', ui-monospace, monospace;
    color: #4ade80;
    text-shadow: 2px 2px 0 #000;
    pointer-events: none;
}

.stand {
    display: block;
    width: 100%;
    height: clamp(18px, 4vh, 36px);
}

@keyframes power-on {
    0% {
        opacity: 1;
        transform: scale(1, 0.004);
    }

    40% {
        opacity: 1;
        transform: scale(1, 1);
    }

    100% {
        opacity: 0;
        transform: scale(1, 1);
    }
}

@keyframes static-jitter {
    0% {
        transform: translate(0, 0);
    }

    33% {
        transform: translate(-12%, 8%);
    }

    66% {
        transform: translate(9%, -10%);
    }
}

.osd-leave-active {
    transition: opacity 0.4s ease;
}

.osd-leave-to {
    opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
    .screen::after {
        animation: none;
    }
}
</style>
