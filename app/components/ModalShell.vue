<script setup lang="ts">
/**
 * Shared frame for the device modals (TV, PC): a dimmed, blurred backdrop, the device itself in the middle, and a
 * pixel-font X button above its top-right corner. Closes only via that button or Escape, not by clicking outside.
 */
const props = defineProps<{
    open: boolean
    /** Accessible name of the dialog. */
    label: string
    closeLabel: string
    /** CSS width of the device; it should keep the device inside the viewport. */
    width: string
}>()
const emit = defineEmits<{ close: [] }>()

const closeButton = ref<HTMLButtonElement | null>(null)

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
        emit('close')
    }
}

watch(() => props.open, async (open) => {
    if (open) {
        window.addEventListener('keydown', onKeydown)
        await nextTick()
        closeButton.value?.focus()
    } else {
        window.removeEventListener('keydown', onKeydown)
    }
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div
                v-if="open"
                class="backdrop"
            >
                <div
                    class="device"
                    role="dialog"
                    aria-modal="true"
                    :aria-label="label"
                    :style="{ width }"
                >
                    <button
                        ref="closeButton"
                        class="close"
                        type="button"
                        :aria-label="closeLabel"
                        @click="emit('close')"
                    >
                        X
                    </button>
                    <slot />
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(40, 20, 14, 0.55);
    backdrop-filter: blur(3px);
}

.device {
    position: relative;
}

.close {
    position: absolute;
    right: 0;
    bottom: calc(100% + 12px);
    padding: 10px 12px;
    border: 3px solid #1b1b1e;
    border-radius: 8px;
    background: #fff;
    font: 12px/1 'Press Start 2P', ui-monospace, monospace;
    color: #1b1b1e;
    cursor: pointer;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25);
}

.close:hover,
.close:focus-visible {
    background: #4ade80;
}

.close:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
}

.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.25s ease;
}

.modal-enter-active .device,
.modal-leave-active .device {
    transition: transform 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .device,
.modal-leave-to .device {
    transform: scale(0.94);
}
</style>
