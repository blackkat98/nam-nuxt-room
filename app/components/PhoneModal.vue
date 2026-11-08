<script setup lang="ts">
import { SOCIALS } from '~/data/socials'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

/** A 9:19.5 phone, never taller than the viewport (minus the close button). */
const PHONE_WIDTH = 'min(100%, 340px, calc((100dvh - 32px - 70px) * 9 / 19.5))'
/** How often the lock-screen clock refreshes while open, in ms. */
const CLOCK_TICK = 10_000

const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | undefined

const time = computed(() => now.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }))
const date = computed(() => now.value.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))

watch(() => props.open, (open) => {
    clearInterval(timer)

    if (open) {
        now.value = new Date()
        timer = setInterval(() => (now.value = new Date()), CLOCK_TICK)
    }
})

onBeforeUnmount(() => clearInterval(timer))

function isExternal(href: string): boolean {
    return href.startsWith('http')
}
</script>

<template>
    <ModalShell
        :open="open"
        label="Phone"
        close-label="Put the phone down"
        :width="PHONE_WIDTH"
        @close="emit('close')"
    >
        <div class="phone">
            <div class="screen">
                <div class="status">
                    <span>{{ time }}</span>
                    <span
                        class="island"
                        aria-hidden="true"
                    />
                    <span aria-hidden="true">▂▄▆ ▮</span>
                </div>
                <p class="lock">🔓</p>
                <p class="clock">{{ time }}</p>
                <p class="date">{{ date }}</p>
                <ul class="notes">
                    <li
                        v-for="social in SOCIALS"
                        :key="social.name"
                    >
                        <a
                            class="note"
                            :href="social.href"
                            :target="isExternal(social.href) ? '_blank' : undefined"
                            :rel="isExternal(social.href) ? 'noopener noreferrer' : undefined"
                        >
                            <span
                                class="badge"
                                :style="{ background: social.color }"
                            >{{ social.badge }}</span>
                            <span class="text">
                                <span class="name">{{ social.name }}</span>
                                <span class="handle">{{ social.handle }}</span>
                            </span>
                            <span class="when">now</span>
                        </a>
                    </li>
                </ul>
                <span
                    class="home"
                    aria-hidden="true"
                />
            </div>
        </div>
    </ModalShell>
</template>

<style scoped>
.phone {
    padding: 10px;
    border-radius: 48px;
    background: #141416;
    box-shadow:
        inset 0 0 0 2px #3a3a40,
        0 20px 40px rgba(0, 0, 0, 0.5);
    animation: wake 0.35s ease;
    container-type: inline-size;
}

.screen {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    aspect-ratio: 9 / 19.5;
    overflow: hidden auto;
    padding: 0 6cqw 8cqw;
    border-radius: 38px;
    background: linear-gradient(160deg, #6d4bd8 0%, #b052b8 55%, #e45a9a 100%);
    color: #fff;
}

.status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    align-self: stretch;
    padding: 4cqw 2cqw 0;
    font: 600 4cqw/1 system-ui, sans-serif;
}

.island {
    width: 28cqw;
    height: 7.5cqw;
    border-radius: 99px;
    background: #000;
}

.lock {
    margin: 7cqw 0 0;
    font-size: 5cqw;
}

.clock {
    margin: 3cqw 0 0;
    font: 15cqw/1 'Press Start 2P', ui-monospace, monospace;
    text-shadow: 0 1cqw 0 rgba(0, 0, 0, 0.18);
}

.date {
    margin: 4cqw 0 0;
    font: 500 4.4cqw/1.2 system-ui, sans-serif;
    opacity: 0.9;
}

.notes {
    display: flex;
    flex-direction: column;
    gap: 3cqw;
    align-self: stretch;
    margin: 10cqw 0 0;
    padding: 0;
    list-style: none;
}

.note {
    display: flex;
    align-items: center;
    gap: 3.5cqw;
    padding: 3.5cqw;
    border-radius: 5cqw;
    background: rgba(255, 255, 255, 0.22);
    backdrop-filter: blur(6px);
    color: inherit;
    text-decoration: none;
    transition: background 0.15s ease, transform 0.15s ease;
}

.note:hover,
.note:focus-visible {
    background: rgba(255, 255, 255, 0.36);
    transform: translateY(-1px);
}

.note:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
}

.badge {
    display: grid;
    flex: none;
    place-items: center;
    width: 10cqw;
    height: 10cqw;
    border-radius: 2.6cqw;
    font: 700 4.2cqw/1 system-ui, sans-serif;
    color: #fff;
}

.text {
    display: flex;
    flex-direction: column;
    gap: 1.4cqw;
    min-width: 0;
}

.name {
    font: 3.2cqw/1.2 'Press Start 2P', ui-monospace, monospace;
}

.handle {
    overflow: hidden;
    font: 3.8cqw/1.2 system-ui, sans-serif;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.9;
}

.when {
    align-self: flex-start;
    margin-left: auto;
    font: 3.2cqw/1 system-ui, sans-serif;
    opacity: 0.7;
}

.home {
    position: absolute;
    bottom: 2.5cqw;
    left: 50%;
    width: 34cqw;
    height: 1.4cqw;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.85);
    transform: translateX(-50%);
}

@keyframes wake {
    from {
        filter: brightness(0.2);
    }
}

@media (prefers-reduced-motion: reduce) {
    .phone {
        animation: none;
    }
}
</style>
