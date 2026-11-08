import * as THREE from 'three'
import { at, box, cylinder, noShadow } from './helpers'

/** Every clock in the room shows Vietnam time (UTC+7), wherever the visitor is. */
export const UTC_OFFSET_HOURS = 7

const TAU = Math.PI * 2
const SECONDS_PER_DAY = 86_400

/** Seconds since midnight in UTC+7 (with the fraction of the current second). */
function secondsOfDay(now = Date.now()): number {
    return (((now / 1000 + UTC_OFFSET_HOURS * 3600) % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY
}

export interface ClockAngles {
    /** Clockwise from 12, in radians; both hands sweep smoothly. */
    hour: number
    minute: number
}

/** Hand angles for the current time in UTC+7. */
export function clockAngles(now = Date.now()): ClockAngles {
    const seconds = secondsOfDay(now)

    return {
        hour: ((seconds / 3600) % 12) / 12 * TAU,
        minute: ((seconds / 60) % 60) / 60 * TAU,
    }
}

export interface ClockReading {
    /** 1 - 12 */
    hour: number
    minute: number
    pm: boolean
    /** The colon is lit for the first half of every second, so it blinks once a second. */
    colon: boolean
}

/** The current UTC+7 time as a 12-hour clock reads it. */
export function clockReading(now = Date.now()): ClockReading {
    const seconds = secondsOfDay(now)
    const hour24 = Math.floor(seconds / 3600)

    return {
        hour: hour24 % 12 || 12,
        minute: Math.floor(seconds / 60) % 60,
        pm: hour24 >= 12,
        colon: seconds % 1 < 0.5,
    }
}

export interface Clock {
    group: THREE.Group
    /** Brings the clock up to the current UTC+7 time. */
    update: () => void
}

/* ---------- digital wall clock ---------- */

/** Lit and unlit LED colours (unlit segments stay faintly visible, like a real display). */
const LED_ON = '#ff4136'
const LED_OFF = 'rgba(255, 65, 54, 0.1)'
/** Which of the seven segments (a top, b top right, c bottom right, d bottom, e bottom left, f top left, g middle) each digit lights. */
const DIGIT_SEGMENTS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg']
/** Display canvas size, and one digit's box and segment thickness, in canvas px. */
const DISPLAY = { w: 640, h: 176 }
const DIGIT = { w: 60, h: 118, top: 29, thickness: 15, gap: 3 }
/** Left edges of the four digit slots (hh:mm); the colon sits centred in the wide gap between the pairs. */
const DIGIT_X = [24, 112, 272, 360]
const COLON_X = 222
/** Colon dot size; big enough to catch the eye as it blinks. */
const COLON_DOT = 24
/** AM / PM column: centre, width available, and the letters' height (half a digit, minus a small gap between the two). */
const MERIDIEM = { x: 540, maxWidth: 140, height: DIGIT.h / 2 - 3 }

/** One segment: a long hexagon from (x0, y0) to (x1, y1), horizontal or vertical. */
function segment(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
    const t = DIGIT.thickness / 2
    ctx.beginPath()

    if (y0 === y1) {
        ctx.moveTo(x0, y0)
        ctx.lineTo(x0 + t, y0 - t)
        ctx.lineTo(x1 - t, y0 - t)
        ctx.lineTo(x1, y0)
        ctx.lineTo(x1 - t, y0 + t)
        ctx.lineTo(x0 + t, y0 + t)
    } else {
        ctx.moveTo(x0, y0)
        ctx.lineTo(x0 + t, y0 + t)
        ctx.lineTo(x0 + t, y1 - t)
        ctx.lineTo(x0, y1)
        ctx.lineTo(x0 - t, y1 - t)
        ctx.lineTo(x0 - t, y0 + t)
    }

    ctx.closePath()
    ctx.fill()
}

/** Draws one 7-segment digit at slot `x`; `null` leaves every segment unlit (a blank leading digit). */
function drawDigit(ctx: CanvasRenderingContext2D, x: number, digit: number | null): void {
    const { w, h, top, gap } = DIGIT
    const mid = top + h / 2
    const bottom = top + h
    const lit = digit === null ? '' : DIGIT_SEGMENTS[digit] ?? ''
    const segments: Record<string, [number, number, number, number]> = {
        a: [x + gap, top, x + w - gap, top],
        g: [x + gap, mid, x + w - gap, mid],
        d: [x + gap, bottom, x + w - gap, bottom],
        f: [x, top + gap, x, mid - gap],
        b: [x + w, top + gap, x + w, mid - gap],
        e: [x, mid + gap, x, bottom - gap],
        c: [x + w, mid + gap, x + w, bottom - gap],
    }

    for (const [name, [x0, y0, x1, y1]] of Object.entries(segments)) {
        ctx.fillStyle = lit.includes(name) ? LED_ON : LED_OFF
        ctx.shadowBlur = lit.includes(name) ? 14 : 0
        segment(ctx, x0, y0, x1, y1)
    }
}

function drawDisplay(ctx: CanvasRenderingContext2D, reading: ClockReading): void {
    const { w, h } = DISPLAY
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#120a0a'
    ctx.fillRect(0, 0, w, h)
    ctx.shadowColor = LED_ON
    // a slight forward lean, like classic LED clocks
    ctx.setTransform(1, 0, -0.08, 1, 8, 0)

    const tens = Math.floor(reading.hour / 10)
    drawDigit(ctx, DIGIT_X[0]!, tens || null)
    drawDigit(ctx, DIGIT_X[1]!, reading.hour % 10)
    drawDigit(ctx, DIGIT_X[2]!, Math.floor(reading.minute / 10))
    drawDigit(ctx, DIGIT_X[3]!, reading.minute % 10)

    ctx.fillStyle = reading.colon ? LED_ON : LED_OFF
    ctx.shadowBlur = reading.colon ? 14 : 0

    for (const y of [DIGIT.top + DIGIT.h * 0.3, DIGIT.top + DIGIT.h * 0.7]) {
        ctx.fillRect(COLON_X - COLON_DOT / 2, y - COLON_DOT / 2, COLON_DOT, COLON_DOT)
    }

    // AM / PM indicator, stacked beside the minutes, each half as tall as a digit; the current one lit.
    // The font is sized from the measured capital height, so the letters come out exactly that tall.
    const family = 'ui-monospace, Consolas, monospace'
    ctx.font = `bold 100px ${family}`
    const capHeight = ctx.measureText('M').actualBoundingBoxAscent || 72
    ctx.font = `bold ${(100 * MERIDIEM.height) / capHeight}px ${family}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    const rows = [
        ['AM', DIGIT.top + MERIDIEM.height, !reading.pm],
        ['PM', DIGIT.top + DIGIT.h, reading.pm],
    ] as const

    for (const [label, baseline, on] of rows) {
        ctx.fillStyle = on ? LED_ON : LED_OFF
        ctx.shadowBlur = on ? 12 : 0
        ctx.fillText(label, MERIDIEM.x, baseline, MERIDIEM.maxWidth)
    }
}

/**
 * A digital LED wall clock facing +z, its back on the wall at `position`: 12-hour time with an AM / PM light and a
 * colon that blinks every second. `height` is the height of the housing; its width follows the display.
 */
export function buildDigitalClock(housing: THREE.Material, position: THREE.Vector3, height: number): Clock {
    const g = new THREE.Group()
    g.position.copy(position)
    const screenHeight = height * 0.78
    const screenWidth = screenHeight * (DISPLAY.w / DISPLAY.h)
    g.add(at(box(screenWidth + (height - screenHeight), height, 0.14, housing, 0.06), 0, 0, 0.07))

    const canvas = document.createElement('canvas')
    canvas.width = DISPLAY.w
    canvas.height = DISPLAY.h
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    // unlit and not tone mapped, so the LEDs keep glowing in the dark
    const screenMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), screenMaterial)
    g.add(noShadow(at(screen, 0, 0, 0.141)))

    let shown = ''

    return {
        group: g,
        update: () => {
            const reading = clockReading()
            const key = `${reading.hour}:${reading.minute}:${reading.pm}:${reading.colon}`

            // repaint only when something on the display changes (twice a second, for the colon)
            if (key === shown || !ctx) {
                return
            }

            shown = key
            drawDisplay(ctx, reading)
            texture.needsUpdate = true
        },
    }
}

/* ---------- analog wristwatch ---------- */

/** A watch hand pivoting at its base: a thin box reaching `length` up from the pivot, plus a short tail. */
function hand(width: number, length: number, tail: number, depth: number, material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(width, length + tail, depth)
    geometry.translate(0, (length - tail) / 2, 0)

    return new THREE.Mesh(geometry, material)
}

export interface WatchMaterials {
    strap: THREE.Material
    case: THREE.Material
    dial: THREE.Material
    hands: THREE.Material
}

/**
 * A wristwatch around a limb running along y: the strap loops around it at `wristRadius`, and the face sits on the
 * +z side, facing +z. Rotate the group about y to turn the face where it should be.
 */
export function buildWatch(mat: WatchMaterials, wristRadius: number): Clock {
    const g = new THREE.Group()
    const strap = new THREE.Mesh(new THREE.TorusGeometry(wristRadius + 0.01, 0.028, 8, 28), mat.strap)
    strap.rotation.x = Math.PI / 2
    strap.scale.z = 1.6
    g.add(strap)

    const faceZ = wristRadius + 0.03
    const watchCase = cylinder(0.095, 0.095, 0.04, mat.case, 28)
    watchCase.rotation.x = Math.PI / 2
    g.add(at(watchCase, 0, 0, faceZ))
    g.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.078, 28), mat.dial), 0, 0, faceZ + 0.021))
    // crown on the side
    const crown = cylinder(0.015, 0.015, 0.03, mat.case, 10)
    crown.rotation.z = Math.PI / 2
    g.add(at(crown, 0.105, 0, faceZ))

    const hourHand = at(hand(0.014, 0.04, 0.008, 0.004, mat.hands), 0, 0, faceZ + 0.024)
    const minuteHand = at(hand(0.009, 0.062, 0.01, 0.004, mat.hands), 0, 0, faceZ + 0.028)
    g.add(hourHand, minuteHand)

    return {
        group: g,
        update: () => {
            // a face built facing +z reads clockwise from the front
            const { hour, minute } = clockAngles()
            hourHand.rotation.z = -hour
            minuteHand.rotation.z = -minute
        },
    }
}
