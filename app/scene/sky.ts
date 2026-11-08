import * as THREE from 'three'
import type { Materials } from './materials'
import type { SkyPhase } from './textures'

/**
 * The sky through the window over a day, by the visitor's local hour: each phase holds between two keys and
 * cross-fades into the next one. Night 20:00 - 5:00, sunrise around 6:30, day 8:00 - 17:00, sunset around 18:30.
 */
const KEYS: [hour: number, phase: SkyPhase][] = [
    [0, 'night'],
    [5, 'night'],
    [6.5, 'dawn'],
    [8, 'day'],
    [17, 'day'],
    [18.5, 'dusk'],
    [20, 'night'],
    [24, 'night'],
]

/** Light falling in through the window at each phase: warm sun, golden hours, cool moonlight. */
const SUN: Record<SkyPhase, { color: THREE.Color, intensity: number }> = {
    night: { color: new THREE.Color('#a5bcff'), intensity: 260 },
    dawn: { color: new THREE.Color('#ffb27a'), intensity: 450 },
    day: { color: new THREE.Color('#ffdcae'), intensity: 650 },
    dusk: { color: new THREE.Color('#ff9466'), intensity: 400 },
}

/** Which phase the sky is in at `hour` (0 - 24), and how far (0 - 1) it has faded towards the next. */
export function skyAt(hour: number): { from: SkyPhase, to: SkyPhase, t: number } {
    const h = ((hour % 24) + 24) % 24

    for (let i = 0; i < KEYS.length - 1; i++) {
        const [h0, from] = KEYS[i]!
        const [h1, to] = KEYS[i + 1]!

        if (h >= h0 && h < h1) {
            return { from, to, t: from === to ? 0 : (h - h0) / (h1 - h0) }
        }
    }

    return { from: 'night', to: 'night', t: 0 }
}

export interface Sky {
    /** Shows the sky (and sets the sunlight) for `hour`, 0 - 24 in local time. */
    setHour: (hour: number) => void
}

/** Drives the window's two sky layers and the sunlight; independent of the room's light switch. */
export function buildSky(m: Materials, sun: THREE.SpotLight): Sky {
    return {
        setHour: (hour) => {
            const { from, to, t } = skyAt(hour)
            m.skyBase.map = m.skyTextures[from]
            m.skyNext.map = m.skyTextures[to]
            m.skyNext.opacity = t
            m.skyNext.visible = t > 0
            sun.color.lerpColors(SUN[from].color, SUN[to].color, t)
            sun.intensity = THREE.MathUtils.lerp(SUN[from].intensity, SUN[to].intensity, t)
        },
    }
}
