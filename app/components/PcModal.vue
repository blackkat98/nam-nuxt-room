<script setup lang="ts">
import { PC_FILES } from '~/data/pc-files'
import { type CodeLanguage, type CodeToken, tokenize } from '~/utils/code-highlight'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
    close: []
    /** Whether a file is being typed out right now (the room's keyboard plays along). */
    typing: [typing: boolean]
}>()

/** 16:9 screen plus the bezel, the stand and the close button, never taller than the viewport. */
const PC_WIDTH = 'min(100%, 1100px, calc((100dvh - 32px - 100px - 80px) * 16 / 9))'
/** Typing speed for a file's first opening, in characters per second. */
const TYPING_SPEED = 300

const BADGES: Record<CodeLanguage, { label: string, color: string }> = {
    md: { label: 'M↓', color: '#519aba' },
    ts: { label: 'TS', color: '#3b82f6' },
    json: { label: '{}', color: '#cbcb41' },
}

const active = ref(0)
const shown = ref(0)
const typedOnce = new Set<number>()
let frame = 0
let typingStart = 0

const file = computed(() => PC_FILES[active.value]!)
const tokens = computed(() => tokenize(file.value.content, file.value.language))
const typing = computed(() => shown.value < file.value.content.length)
const typedText = computed(() => file.value.content.slice(0, shown.value))
const lineCount = computed(() => typedText.value.split('\n').length)
const column = computed(() => typedText.value.length - typedText.value.lastIndexOf('\n'))

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function tokenHtml(token: CodeToken, text: string): string {
    const body = `<span class="tok-${token.kind}">${escapeHtml(text)}</span>`

    if (!token.href) {
        return body
    }

    const external = token.href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''

    return `<a href="${escapeHtml(token.href)}"${external}>${body}</a>`
}

/** The highlighted code typed so far, as HTML (every piece of text is escaped). */
const codeHtml = computed(() => {
    let left = shown.value
    let html = ''

    for (const token of tokens.value) {
        if (left <= 0) {
            break
        }

        html += tokenHtml(token, token.text.slice(0, left))
        left -= token.text.length
    }

    return html
})

function stopTyping() {
    cancelAnimationFrame(frame)
}

function finishTyping() {
    stopTyping()
    shown.value = file.value.content.length
}

function step(now: number) {
    const elapsed = (now - typingStart) / 1000
    shown.value = Math.min(Math.floor(elapsed * TYPING_SPEED), file.value.content.length)

    if (typing.value) {
        frame = requestAnimationFrame(step)
    }
}

/** Opens a file: typed out the first time, shown in full after that. */
function select(index: number) {
    stopTyping()
    active.value = index

    if (typedOnce.has(index) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        shown.value = file.value.content.length

        return
    }

    typedOnce.add(index)
    shown.value = 0
    typingStart = performance.now()
    frame = requestAnimationFrame(step)
}

watch(() => props.open && typing.value, value => emit('typing', value))

watch(() => props.open, (open) => {
    if (open && !typedOnce.size) {
        select(0)
    } else if (!open) {
        finishTyping()
    }
})

onBeforeUnmount(stopTyping)
</script>

<template>
    <ModalShell
        :open="open"
        label="PC"
        close-label="Close the PC"
        :width="PC_WIDTH"
        @close="emit('close')"
    >
        <div class="monitor">
            <div class="screen">
                <div class="editor">
                    <header class="titlebar">
                        <span
                            class="lights"
                            aria-hidden="true"
                        ><i /><i /><i /></span>
                        <span class="title">{{ file.name }} — nuxt-room</span>
                    </header>
                    <div class="body">
                        <nav
                            class="sidebar"
                            aria-label="Files"
                        >
                            <p class="explorer">EXPLORER</p>
                            <p class="folder">▾ NAM</p>
                            <button
                                v-for="(f, i) in PC_FILES"
                                :key="f.name"
                                class="file"
                                :class="{ active: i === active }"
                                type="button"
                                @click="select(i)"
                            >
                                <span
                                    class="badge"
                                    :style="{ color: BADGES[f.language].color }"
                                >{{ BADGES[f.language].label }}</span>{{ f.name }}
                            </button>
                        </nav>
                        <section class="main">
                            <div
                                class="tabs"
                                role="tablist"
                            >
                                <button
                                    v-for="(f, i) in PC_FILES"
                                    :key="f.name"
                                    class="tab"
                                    :class="{ active: i === active }"
                                    type="button"
                                    role="tab"
                                    :aria-selected="i === active"
                                    @click="select(i)"
                                >
                                    <span
                                        class="badge"
                                        :style="{ color: BADGES[f.language].color }"
                                    >{{ BADGES[f.language].label }}</span>{{ f.name }}
                                </button>
                            </div>
                            <div
                                class="code"
                                :title="typing ? 'Click to skip' : undefined"
                                @click="finishTyping"
                            >
                                <ol
                                    class="gutter"
                                    aria-hidden="true"
                                >
                                    <li
                                        v-for="n in lineCount"
                                        :key="n"
                                        :class="{ current: n === lineCount }"
                                    >
                                        {{ n }}
                                    </li>
                                </ol>
                                <!-- eslint-disable vue/no-v-html -- built from escaped tokens -->
                                <pre><code
                                    :class="{ blink: !typing }"
                                    v-html="codeHtml"
                                /></pre>
                                <!-- eslint-enable vue/no-v-html -->
                            </div>
                        </section>
                    </div>
                    <footer class="statusbar">
                        <span>⎇ main ✓</span>
                        <span>Ln {{ lineCount }}, Col {{ column }}</span>
                        <span class="lang">{{ { md: 'Markdown', ts: 'TypeScript', json: 'JSON' }[file.language] }}</span>
                    </footer>
                </div>
            </div>
            <span
                class="power"
                aria-hidden="true"
            />
        </div>
        <div
            class="neck"
            aria-hidden="true"
        />
        <div
            class="base"
            aria-hidden="true"
        />
    </ModalShell>
</template>

<style scoped>
.monitor {
    position: relative;
    padding: 10px 10px 18px;
    border: 1px solid #34343a;
    border-radius: 12px;
    background: linear-gradient(180deg, #232327 0%, #121214 100%);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.08),
        0 24px 60px rgba(0, 0, 0, 0.45);
}

.screen {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border: 2px solid #050506;
    border-radius: 3px;
    background: #1e1f24;
    container-type: inline-size;
}

/* A faint reflection on the glass, over everything but not catching clicks. */
.screen::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 35%, transparent 36%);
    pointer-events: none;
}

.power {
    position: absolute;
    left: 50%;
    bottom: 6px;
    width: 5px;
    height: 5px;
    margin-left: -2px;
    border-radius: 50%;
    background: #e8e8ee;
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.7);
}

.neck {
    width: 9%;
    height: clamp(22px, 5vh, 46px);
    margin: 0 auto;
    background: linear-gradient(90deg, #1a1a1d 0%, #2c2c31 50%, #1a1a1d 100%);
}

.base {
    width: 30%;
    height: 10px;
    margin: 0 auto;
    border-radius: 6px 6px 3px 3px;
    background: linear-gradient(180deg, #2c2c31 0%, #141416 100%);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}

/* Editor: sized off the screen width so it reads the same on every display. */
.editor {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100%;
    font: clamp(9px, 1.3cqi, 14px)/1.6 ui-monospace, 'Cascadia Code', Consolas, Menlo, monospace;
    color: #abb2bf;
}

.titlebar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.2em;
    background: #18191d;
    border-bottom: 1px solid #111214;
    color: #7f848e;
    font-size: 0.9em;
}

.lights {
    position: absolute;
    left: 0.9em;
    display: flex;
    gap: 0.5em;
}

.lights i {
    width: 0.8em;
    height: 0.8em;
    border-radius: 50%;
    background: #ff5f57;
}

.lights i:nth-child(2) {
    background: #febc2e;
}

.lights i:nth-child(3) {
    background: #28c840;
}

.body {
    display: grid;
    grid-template-columns: minmax(9em, 22%) 1fr;
    min-height: 0;
}

.sidebar {
    padding: 0.4em 0;
    overflow: hidden;
    background: #1a1b1f;
    border-right: 1px solid #111214;
}

.explorer,
.folder {
    margin: 0;
    padding: 0.2em 1em;
    font-size: 0.85em;
    letter-spacing: 0.06em;
    color: #7f848e;
}

.folder {
    font-weight: 700;
    color: #c8ccd4;
}

.file,
.tab {
    display: flex;
    align-items: center;
    gap: 0.5em;
    border: 0;
    background: none;
    font: inherit;
    color: #9da5b4;
    white-space: nowrap;
    cursor: pointer;
}

.file {
    width: 100%;
    padding: 0.15em 1em 0.15em 1.8em;
    text-align: left;
}

.file:hover,
.tab:hover {
    color: #e6e6e6;
    background: rgba(255, 255, 255, 0.04);
}

.file.active {
    color: #fff;
    background: rgba(74, 222, 128, 0.12);
}

.file:focus-visible,
.tab:focus-visible {
    outline: 1px solid #4ade80;
    outline-offset: -1px;
}

.badge {
    flex: none;
    min-width: 1.8em;
    font-size: 0.8em;
    font-weight: 700;
}

.main {
    display: grid;
    grid-template-rows: auto 1fr;
    min-width: 0;
    min-height: 0;
}

.tabs {
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    background: #18191d;
}

.tab {
    padding: 0.45em 1em;
    border-right: 1px solid #111214;
    border-top: 2px solid transparent;
}

.tab.active {
    color: #fff;
    background: #1e1f24;
    border-top-color: #4ade80;
}

.code {
    display: flex;
    overflow: auto;
    padding: 0.6em 0;
    cursor: text;
    scrollbar-color: #3a3d45 transparent;
}

.gutter {
    flex: none;
    min-width: 2.5em;
    margin: 0;
    padding: 0 1em 0 0.5em;
    list-style: none;
    text-align: right;
    color: #4b5263;
    user-select: none;
}

.gutter .current {
    color: #c8ccd4;
}

pre {
    flex: 1;
    margin: 0;
    font: inherit;
    white-space: pre;
}

code {
    font: inherit;
}

/* The cursor, after the last typed character. */
code::after {
    content: '';
    display: inline-block;
    width: 0.55em;
    height: 1.15em;
    vertical-align: text-bottom;
    background: #4ade80;
}

code.blink::after {
    animation: blink 1s steps(1) infinite;
}

.statusbar {
    display: flex;
    gap: 1.5em;
    padding: 0.2em 1em;
    background: #16a34a;
    color: #f0fdf4;
    font-size: 0.85em;
}

.statusbar .lang {
    margin-left: auto;
}

/* syntax colours; :deep because the code is injected as HTML */
.code :deep(.tok-keyword) {
    color: #c678dd;
}

.code :deep(.tok-string) {
    color: #98c379;
}

.code :deep(.tok-number) {
    color: #d19a66;
}

.code :deep(.tok-key) {
    color: #e06c75;
}

.code :deep(.tok-comment) {
    color: #7f848e;
    font-style: italic;
}

.code :deep(.tok-heading) {
    color: #e5c07b;
    font-weight: 700;
}

.code :deep(.tok-punct) {
    color: #abb2bf;
}

.code :deep(.tok-bold) {
    color: #d19a66;
    font-weight: 700;
}

.code :deep(.tok-link) {
    color: #61afef;
}

.code :deep(a) {
    text-decoration: underline;
    text-decoration-color: rgba(152, 195, 121, 0.5);
    text-underline-offset: 2px;
}

.code :deep(a:hover) {
    text-decoration-color: currentcolor;
}

/* Narrow screens (phones): drop the sidebar, the tabs still switch files. */
@container (max-width: 560px) {
    .body {
        grid-template-columns: 1fr;
    }

    .sidebar,
    .lights {
        display: none;
    }
}

@keyframes blink {
    50% {
        opacity: 0;
    }
}
</style>
