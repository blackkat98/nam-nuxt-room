<script setup lang="ts">
/** The mute button in the top-right corner: a pixel speaker, with sound waves when on and a cross when muted. */
const { muted, toggleMute } = useSound()

/** A 5 × 5 pixel X beside the speaker, for muted. */
const CROSS = [0, 1, 2, 3, 4].flatMap(i => [[11 + i, 5 + i], [15 - i, 5 + i]])
</script>

<template>
    <button
        class="sound"
        type="button"
        :aria-label="muted ? 'Turn sound on' : 'Mute sound'"
        :aria-pressed="muted"
        :title="muted ? 'Sound off' : 'Sound on'"
        @click="toggleMute"
    >
        <svg
            viewBox="0 0 16 16"
            width="20"
            height="20"
            aria-hidden="true"
            shape-rendering="crispEdges"
        >
            <!-- the speaker -->
            <path
                d="M1 6h3l4-4h1v12H8l-4-4H1z"
                fill="currentColor"
            />
            <g v-if="!muted">
                <rect
                    x="11"
                    y="6"
                    width="1"
                    height="4"
                    fill="currentColor"
                />
                <rect
                    x="13"
                    y="4"
                    width="1"
                    height="8"
                    fill="currentColor"
                />
            </g>
            <g
                v-else
                fill="currentColor"
            >
                <rect
                    v-for="[x, y] in CROSS"
                    :key="`${x},${y}`"
                    :x="x"
                    :y="y"
                    width="1"
                    height="1"
                />
            </g>
        </svg>
    </button>
</template>

<style scoped>
.sound {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 6;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 3px solid #1b1b1e;
    border-radius: 10px;
    background: #fff;
    color: #1b1b1e;
    cursor: pointer;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25);
}

.sound:hover,
.sound:focus-visible {
    background: #4ade80;
}

.sound[aria-pressed='true'] {
    background: #f1f1f1;
    color: #8a8a8f;
}

.sound:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
}
</style>
