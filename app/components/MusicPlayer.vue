<script setup lang="ts">
/**
 * A small floating "now playing" card for the record player. The YouTube player stays visible inside it (that's
 * what YouTube allows); play / pause / skip are sent to it through the embed's postMessage API, and it reports back
 * its state and the current track's title.
 */
const props = defineProps<{
    open: boolean
    playing: boolean
    /** A YouTube playlist link (or a single video link). */
    url: string
}>()
const emit = defineEmits<{
    'close': []
    'update:playing': [playing: boolean]
}>()

/** YouTube player states reported by the embed. */
const YT_UNSTARTED = -1
const YT_PLAYING = 1
const YT_PAUSED = 2
const YT_CUED = 5
/**
 * After a skip, the next track can load without starting (autoplay rules) or report a pause while it switches.
 * For this long (ms) such reports don't count as the visitor pausing: the player is told to play instead.
 */
const SKIP_SETTLE = 4000
/** A beat after a skip before nudging the new track to play, in ms. */
const SKIP_NUDGE = 400

let skippedAt = Number.NEGATIVE_INFINITY
let nudgeTimer: ReturnType<typeof setTimeout> | undefined

const frame = ref<HTMLIFrameElement | null>(null)
/** The current track's title, as the player reports it. */
const title = ref('')

const embedUrl = computed(() => youtubeEmbedUrl(props.url, { autoplay: 1, enablejsapi: 1, rel: 0, playsinline: 1 }))

function send(event: string, extra: Record<string, unknown> = {}) {
    frame.value?.contentWindow?.postMessage(JSON.stringify({ event, ...extra }), '*')
}

function command(func: 'playVideo' | 'pauseVideo' | 'nextVideo' | 'previousVideo') {
    send('command', { func, args: [] })
}

/** Starts listening to the player once it has loaded, so its state and titles keep us in sync. */
function onFrameLoad() {
    send('listening', { id: 1, channel: 'widget' })
}

/** Steps through the playlist; the new track always plays, never left paused. */
function skip(step: number) {
    skippedAt = performance.now()
    command(step > 0 ? 'nextVideo' : 'previousVideo')
    emit('update:playing', true)
    clearTimeout(nudgeTimer)
    nudgeTimer = setTimeout(() => command('playVideo'), SKIP_NUDGE)
}

function play() {
    command('playVideo')
    emit('update:playing', true)
}

function pause() {
    command('pauseVideo')
    emit('update:playing', false)
}

interface PlayerInfo {
    playerState?: number
    videoData?: { title?: string }
}

function onMessage(event: MessageEvent) {
    if (!/^https:\/\/(www\.)?youtube(-nocookie)?\.com$/.test(event.origin) || typeof event.data !== 'string') {
        return
    }

    let data: { event?: string, info?: unknown }

    try {
        data = JSON.parse(event.data)
    } catch {
        return
    }

    const info = (data.event === 'infoDelivery' || data.event === 'initialDelivery') ? data.info as PlayerInfo | undefined : undefined
    const state = data.event === 'onStateChange' ? data.info : info?.playerState

    if (info?.videoData?.title) {
        title.value = info.videoData.title
    }

    const settling = performance.now() - skippedAt < SKIP_SETTLE

    if (settling && props.playing && (state === YT_PAUSED || state === YT_UNSTARTED || state === YT_CUED)) {
        // still switching tracks after a skip: keep going rather than treating it as a pause
        command('playVideo')
    } else if (state === YT_PLAYING && !props.playing) {
        emit('update:playing', true)
    } else if (state === YT_PAUSED && props.playing) {
        emit('update:playing', false)
    }
}

// changes from outside the card (the record player in the room, the TV pausing it) reach the player here
watch(() => props.playing, (playing) => {
    command(playing ? 'playVideo' : 'pauseVideo')
})

onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => {
    window.removeEventListener('message', onMessage)
    clearTimeout(nudgeTimer)
})
</script>

<template>
    <Transition name="player">
        <aside
            v-if="open"
            class="player"
            aria-label="Music player"
        >
            <header class="head">
                <span class="label">
                    <span
                        class="note"
                        :class="{ bouncing: playing }"
                        aria-hidden="true"
                    >♪</span>
                    {{ playing ? 'NOW PLAYING' : 'PAUSED' }}
                </span>
                <button
                    class="close"
                    type="button"
                    aria-label="Stop the music"
                    @click="emit('close')"
                >
                    X
                </button>
            </header>
            <div class="video">
                <iframe
                    :key="embedUrl"
                    ref="frame"
                    :src="embedUrl"
                    :title="title || 'Music player'"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    referrerpolicy="strict-origin-when-cross-origin"
                    @load="onFrameLoad"
                />
            </div>
            <p class="track">
                {{ title || 'My playlist' }}
            </p>
            <div class="controls">
                <button
                    type="button"
                    aria-label="Previous track"
                    @click="skip(-1)"
                >
                    ◀◀
                </button>
                <button
                    type="button"
                    aria-label="Play"
                    :class="{ active: playing }"
                    :aria-pressed="playing"
                    @click="play"
                >
                    ▶
                </button>
                <button
                    type="button"
                    aria-label="Pause"
                    :class="{ active: !playing }"
                    :aria-pressed="!playing"
                    @click="pause"
                >
                    ❚❚
                </button>
                <button
                    type="button"
                    aria-label="Next track"
                    @click="skip(1)"
                >
                    ▶▶
                </button>
            </div>
        </aside>
    </Transition>
</template>

<style scoped>
.player {
    position: fixed;
    right: 16px;
    bottom: 40px;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: min(260px, calc(100vw - 32px));
    padding: 12px;
    border: 3px solid #1b1b1e;
    border-radius: 12px;
    background: #fff;
    color: #1b1b1e;
    box-shadow: 0 6px 0 rgba(0, 0, 0, 0.25);
}

.head {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.label {
    display: flex;
    align-items: center;
    gap: 8px;
    font: 9px/1 'Press Start 2P', ui-monospace, monospace;
}

.note {
    font-size: 14px;
}

.note.bouncing {
    animation: bounce 0.6s ease-in-out infinite alternate;
}

.close {
    padding: 6px 7px;
    border: 2px solid #1b1b1e;
    border-radius: 6px;
    background: #fff;
    font: 9px/1 'Press Start 2P', ui-monospace, monospace;
    color: #1b1b1e;
    cursor: pointer;
}

.video {
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border: 2px solid #1b1b1e;
    border-radius: 6px;
    background: #000;
}

.video iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
}

.track {
    margin: 0;
    overflow: hidden;
    font: 9px/1.5 'Press Start 2P', ui-monospace, monospace;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.controls {
    display: flex;
    justify-content: center;
    gap: 8px;
}

.controls button {
    min-width: 44px;
    padding: 8px 10px;
    border: 2px solid #1b1b1e;
    border-radius: 8px;
    background: #fff;
    font: 10px/1 'Press Start 2P', ui-monospace, monospace;
    color: #1b1b1e;
    cursor: pointer;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.25);
}

.controls button:hover,
.controls button:focus-visible,
.close:hover,
.close:focus-visible {
    background: #86efac;
}

/* the current state (playing or paused) shows as a lit, pressed-in button */
.controls button.active {
    background: #4ade80;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
    transform: translateY(2px);
}

.player-enter-active,
.player-leave-active {
    transition: opacity 0.25s ease, transform 0.25s ease;
}

.player-enter-from,
.player-leave-to {
    opacity: 0;
    transform: translateY(16px);
}

@keyframes bounce {
    to {
        transform: translateY(-3px);
    }
}

@media (prefers-reduced-motion: reduce) {
    .note.bouncing {
        animation: none;
    }
}
</style>
