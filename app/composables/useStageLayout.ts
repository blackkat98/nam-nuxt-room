const MOBILE_BREAKPOINT = 768
const GUTTER = 16
/** Desktop room size relative to "a quarter of the viewport area". */
const DESKTOP_SCALE = 1.1
/** Space between the bubble's tail tip and the room. */
const GAP = 4

/** Speech bubble geometry, everything in px. Font size scales with the room so the line capacity stays steady. */
export interface BubbleMetrics {
    fontSize: number
    lines: number
    lineHeight: number
    padX: number
    padY: number
    border: number
    radius: number
    /** Height of the tail below the box. */
    tail: number
    /** Outer height of the box, borders included. */
    height: number
}

export interface StageLayout {
    /** Side length of the square room canvas; also the bubble's width. */
    side: number
    bubble: BubbleMetrics
}

export function bubbleMetrics(side: number, mobile: boolean): BubbleMetrics {
    const lines = mobile ? 4 : 2
    const fontSize = Math.round(Math.min(20, Math.max(10, side / (mobile ? 30 : 38))))
    const lineHeight = Math.round(fontSize * 1.8)
    const padY = Math.round(fontSize * 1.1)
    const padX = Math.round(fontSize * 1.4)
    const border = 3

    return {
        fontSize,
        lines,
        lineHeight,
        padX,
        padY,
        border,
        radius: Math.round(fontSize * 1.1),
        tail: Math.round(fontSize * 1.3),
        height: lines * lineHeight + padY * 2 + border * 2,
    }
}

/**
 * Room side length and bubble metrics for the current viewport: the room takes a quarter of the viewport area
 * (scaled by DESKTOP_SCALE) on larger screens and nearly the full width on phones, and the bubble stacked above it
 * never pushes the pair past the viewport.
 */
export function measureStage(width: number, height: number): StageLayout {
    const mobile = width < MOBILE_BREAKPOINT
    const availW = Math.max(0, width - GUTTER * 2)
    const availH = Math.max(0, height - GUTTER * 2)
    let side = mobile ? availW : Math.min(availW, Math.sqrt((width * height) / 4) * DESKTOP_SCALE)

    const extra = (s: number) => {
        const b = bubbleMetrics(s, mobile)

        return b.height + b.tail + GAP
    }

    // The bubble only shrinks with the room, so one correction is enough to fit.
    side = Math.floor(Math.max(0, Math.min(side, availH - extra(side))))

    return { side, bubble: bubbleMetrics(side, mobile) }
}

export function useStageLayout() {
    const layout = shallowRef<StageLayout>({ side: 0, bubble: bubbleMetrics(0, false) })

    const measure = () => {
        layout.value = measureStage(window.innerWidth, window.innerHeight)
    }

    onMounted(() => {
        measure()
        window.addEventListener('resize', measure)
    })
    onBeforeUnmount(() => window.removeEventListener('resize', measure))

    return layout
}
