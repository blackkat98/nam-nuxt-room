<script setup lang="ts">
import { CV } from '~/data/socials'

/**
 * A preview of my CV in the browser's own PDF viewer, with buttons to download it or open it in a new tab.
 * Browsers that can't show PDFs inline (e.g. Chrome on Android) get a short note and the same buttons instead.
 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

/** Wide enough to read an A4 page, never wider than the viewport. */
const CV_WIDTH = 'min(100%, 760px)'

/** Whether this browser can show the PDF inside the page; assumed yes until it says otherwise. */
const canPreview = ref(true)

onMounted(() => {
    canPreview.value = navigator.pdfViewerEnabled !== false
})
</script>

<template>
    <ModalShell
        :open="open"
        label="My CV"
        close-label="Close the CV"
        :width="CV_WIDTH"
        @close="emit('close')"
    >
        <section class="cv">
            <header class="bar">
                <span class="file">{{ CV.filename }}</span>
                <div class="actions">
                    <a
                        class="button"
                        :href="CV.href"
                        target="_blank"
                        rel="noopener"
                    >Open</a>
                    <a
                        class="button primary"
                        :href="CV.href"
                        :download="CV.filename"
                    >Download</a>
                </div>
            </header>
            <iframe
                v-if="canPreview"
                class="page"
                :src="`${CV.href}#navpanes=0&view=FitH`"
                title="My CV"
            />
            <div
                v-else
                class="page fallback"
            >
                <p class="icon">
                    📄
                </p>
                <p>This browser can't show the PDF here.</p>
                <p>Open it or download it with the buttons above.</p>
            </div>
        </section>
    </ModalShell>
</template>

<style scoped>
.cv {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 3px solid #1b1b1e;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.25);
}

.bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border-bottom: 3px solid #1b1b1e;
}

.file {
    min-width: 0;
    overflow: hidden;
    font: 10px/1.4 'Press Start 2P', ui-monospace, monospace;
    color: #1b1b1e;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.actions {
    display: flex;
    gap: 8px;
}

.button {
    padding: 8px 10px;
    border: 2px solid #1b1b1e;
    border-radius: 8px;
    background: #fff;
    font: 10px/1 'Press Start 2P', ui-monospace, monospace;
    color: #1b1b1e;
    text-decoration: none;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.25);
}

.button.primary {
    background: #4ade80;
}

.button:hover,
.button:focus-visible {
    background: #86efac;
}

.page {
    display: block;
    width: 100%;
    height: calc(100dvh - 180px);
    border: 0;
    background: #e5e5e5;
}

.fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: auto;
    padding: 40px 20px;
    font: 14px/1.5 system-ui, sans-serif;
    color: #444;
    text-align: center;
}

.fallback p {
    margin: 0;
}

.fallback .icon {
    font-size: 40px;
}
</style>
