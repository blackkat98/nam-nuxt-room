<script setup lang="ts">
import { GALLERY } from '~/data/gallery'

const props = defineProps<{
    open: boolean
    /** Which picture is showing (an index into GALLERY). */
    index: number
}>()
const emit = defineEmits<{
    'close': []
    'update:index': [index: number]
}>()

/** The frame and its label, never wider than the viewport. */
const GALLERY_WIDTH = 'min(100%, 620px)'

const item = computed(() => GALLERY[props.index] ?? GALLERY[0])

/** Images fetched and decoded (or failed), by src, so each is only fetched once. */
const loads = new Map<string, Promise<void>>()

function preload(src: string): Promise<void> {
    let load = loads.get(src)

    if (!load) {
        const image = new Image()
        image.src = src
        // a broken image still counts as done, so the gallery never waits on it forever
        load = image.decode().catch(() => undefined)
        loads.set(src, load)
    }

    return load
}

/**
 * The picture on show. It only switches once the next image is ready, so the frame never sits empty; until the
 * first one arrives, the frame shows a loading message instead.
 */
const shown = ref<typeof item.value>()
const loading = computed(() => shown.value?.src !== item.value?.src)

watch(item, (next) => {
    if (!next || import.meta.server) {
        return
    }

    preload(next.src).then(() => {
        if (item.value === next) {
            shown.value = next
        }
    })
}, { immediate: true })

// fetch every picture up front, so clicking one (or browsing) is instant
onMounted(() => GALLERY.forEach(picture => preload(picture.src)))

/** Moves `step` pictures along, wrapping around at either end. */
function go(step: number) {
    const count = GALLERY.length
    emit('update:index', (props.index + step + count) % count)
}

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
        go(-1)
    } else if (event.key === 'ArrowRight') {
        go(1)
    }
}

watch(() => props.open, (open) => {
    if (open) {
        window.addEventListener('keydown', onKeydown)
    } else {
        window.removeEventListener('keydown', onKeydown)
    }
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
    <ModalShell
        :open="open"
        label="Gallery"
        close-label="Close the gallery"
        :width="GALLERY_WIDTH"
        @close="emit('close')"
    >
        <figure
            class="gallery"
            :aria-busy="loading"
        >
            <div
                class="frame"
                :class="{ loading }"
            >
                <img
                    v-if="shown"
                    :key="shown.src"
                    :src="shown.src"
                    :alt="shown.title"
                >
                <p
                    v-else
                    class="placeholder"
                >
                    Loading...
                </p>
            </div>
            <figcaption
                v-if="shown"
                class="plaque"
            >
                <strong>{{ shown.title }}</strong>
                <span v-if="shown.caption">{{ shown.caption }}</span>
            </figcaption>
        </figure>
        <div
            v-if="GALLERY.length > 1"
            class="nav"
        >
            <button
                type="button"
                aria-label="Previous picture"
                @click="go(-1)"
            >
                ◀
            </button>
            <span class="count">{{ index + 1 }} / {{ GALLERY.length }}</span>
            <button
                type="button"
                aria-label="Next picture"
                @click="go(1)"
            >
                ▶
            </button>
        </div>
    </ModalShell>
</template>

<style scoped>
.gallery {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    margin: 0;
}

/* a dark wooden frame around a cream mat, like the prints on the wall */
.frame {
    display: grid;
    place-items: center;
    max-width: 100%;
    padding: clamp(12px, 4vw, 26px);
    border: clamp(8px, 2.4vw, 14px) solid #3b2a20;
    border-radius: 4px;
    background: #f6f1e8;
    box-shadow:
        inset 0 0 0 2px rgba(0, 0, 0, 0.12),
        0 14px 30px rgba(0, 0, 0, 0.45);
}

.frame img {
    display: block;
    max-width: 100%;
    max-height: calc(100dvh - 400px);
    object-fit: contain;
    animation: fade-in 0.3s ease;
}

/* waiting on the next picture: dim the current one a touch */
.frame.loading img {
    opacity: 0.6;
    transition: opacity 0.2s ease;
}

.placeholder {
    display: grid;
    place-items: center;
    width: min(60vw, 320px);
    height: min(calc(100dvh - 400px), 400px);
    margin: 0;
    font: 11px/1 'Press Start 2P', ui-monospace, monospace;
    color: #8a7a68;
}

.plaque {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 100%;
    padding: 10px 14px;
    border: 3px solid #1b1b1e;
    border-radius: 8px;
    background: #fff;
    color: #1b1b1e;
    text-align: center;
}

.plaque strong {
    font: 12px/1.4 'Press Start 2P', ui-monospace, monospace;
}

.plaque span {
    font: 13px/1.4 system-ui, sans-serif;
    color: #555;
}

.nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: 12px;
}

.nav button {
    padding: 8px 12px;
    border: 3px solid #1b1b1e;
    border-radius: 8px;
    background: #fff;
    font: 12px/1 'Press Start 2P', ui-monospace, monospace;
    color: #1b1b1e;
    cursor: pointer;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25);
}

.nav button:hover,
.nav button:focus-visible {
    background: #4ade80;
}

.count {
    font: 11px/1 'Press Start 2P', ui-monospace, monospace;
    color: #fff;
}

@keyframes fade-in {
    from {
        opacity: 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .frame img {
        animation: none;
    }
}
</style>
