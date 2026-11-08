import * as THREE from 'three'
import type { Materials } from './materials'
import { at, box, noShadow, rng, span } from './helpers'

/**
 * Room coordinates: floor is y = 0, the room spans x/z in [0, ROOM].
 * The left wall sits at x = 0, the right wall (with the window) at z = 0.
 */
export const ROOM = 10
export const WALL_H = 9
export const WALL_T = 0.6
export const WINDOW = { x0: 3.3, x1: 5.7, y0: 5.4, y1: 8.0 }

function edgeTiles(m: Materials, seed: number, along: 'x' | 'z', limit: number): THREE.Group {
    const g = new THREE.Group()
    const r = rng(seed)
    let p = -WALL_T

    while (p < limit - 0.1) {
        const end = Math.min(limit, p + 0.8 + r() * 0.9)
        const out = 0.22 + r() * 0.3
        const a = p + 0.05
        const b = end - 0.05

        if (along === 'x') {
            g.add(span(a, b, -0.3, -0.04, ROOM, ROOM + out, m.tile, 0.04))
        } else {
            g.add(span(ROOM, ROOM + out, -0.3, -0.04, a, b, m.tile, 0.04))
        }

        p = end
    }

    return g
}

function buildWindow(m: Materials): THREE.Group {
    const g = new THREE.Group()
    const { x0, x1, y0, y1 } = WINDOW
    const w = x1 - x0
    const h = y1 - y0
    const cx = (x0 + x1) / 2
    const f = 0.14

    // reveal, sill and trim
    g.add(span(x0, x1, y0, y0 + 0.04, -WALL_T, 0, m.windowFrame))
    g.add(span(x0 - 0.25, x1 + 0.25, y0 - 0.12, y0 + 0.02, -0.1, 0.3, m.windowFrame, 0.03))
    g.add(span(x0 - f, x1 + f, y1, y1 + f, -0.05, 0.06, m.windowFrame, 0.02))
    g.add(span(x0 - f, x0, y0, y1, -0.05, 0.06, m.windowFrame, 0.02))
    g.add(span(x1, x1 + f, y0, y1, -0.05, 0.06, m.windowFrame, 0.02))

    // frosted glass in the opening (glows with daylight)
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m.windowGlass)
    g.add(noShadow(at(pane, cx, (y0 + y1) / 2, -WALL_T + 0.12)))
    // the sky outside, just in front of the glass: follows the visitor's clock (see sky.ts)
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m.skyBase)
    g.add(noShadow(at(sky, cx, (y0 + y1) / 2, -WALL_T + 0.13)))
    const skyNext = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m.skyNext)
    g.add(noShadow(at(skyNext, cx, (y0 + y1) / 2, -WALL_T + 0.135)))

    // hopper sash, hinged at the top and tilted into the room
    const pivot = new THREE.Group()
    pivot.position.set(cx, y1 - 0.02, 0.06)
    pivot.rotation.x = -0.55
    const sw = w - 0.08
    const sh = h - 0.1
    const b = 0.09
    pivot.add(span(-sw / 2, sw / 2, -b, 0, 0, 0.08, m.windowFrame))
    pivot.add(span(-sw / 2, sw / 2, -sh, -sh + b, 0, 0.08, m.windowFrame))
    pivot.add(span(-sw / 2, -sw / 2 + b, -sh, 0, 0, 0.08, m.windowFrame))
    pivot.add(span(sw / 2 - b, sw / 2, -sh, 0, 0, 0.08, m.windowFrame))
    pivot.add(span(-0.03, 0.03, -sh, 0, 0.01, 0.07, m.windowFrame))
    pivot.add(span(-sw / 2, sw / 2, -sh / 2 - 0.03, -sh / 2 + 0.03, 0.01, 0.07, m.windowFrame))
    const sashGlass = new THREE.Mesh(new THREE.PlaneGeometry(sw - 2 * b, sh - 2 * b), m.glass)
    pivot.add(noShadow(at(sashGlass, 0, -sh / 2, 0.04)))
    pivot.add(at(box(0.32, 0.06, 0.08, m.gold, 0.02), 0, -sh + 0.05, 0.13))
    g.add(pivot)

    return g
}

export function buildShell(m: Materials): THREE.Group {
    const g = new THREE.Group()
    const S = ROOM
    const T = WALL_T
    const H = WALL_H
    const { x0, x1, y0, y1 } = WINDOW

    // base slab, tiled floor and stepped edge tiles
    g.add(span(-T, S, -1.1, 0, -T, S, m.base))
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(S, S), m.floor)
    floor.rotation.x = -Math.PI / 2
    g.add(at(floor, S / 2, 0.006, S / 2))
    g.add(edgeTiles(m, 5, 'x', S + 0.4))
    g.add(edgeTiles(m, 9, 'z', S))

    // left wall, and the right wall built around the window opening
    g.add(span(-T, 0, 0, H, -T, S, m.wall))
    g.add(span(0, S, 0, y0, -T, 0, m.wall))
    g.add(span(0, S, y1, H, -T, 0, m.wall))
    g.add(span(0, x0, y0, y1, -T, 0, m.wall))
    g.add(span(x1, S, y0, y1, -T, 0, m.wall))

    // cream caps on top of the cut walls
    g.add(span(-T - 0.2, 0.25, H, H + 0.5, -T - 0.2, S + 0.12, m.wallCap, 0.04))
    g.add(span(0.25, S + 0.12, H, H + 0.5, -T - 0.2, 0.25, m.wallCap, 0.04))

    // skirting boards
    g.add(span(0, 0.06, 0, 0.28, 0, S, m.skirting))
    g.add(span(0, S, 0, 0.28, 0, 0.06, m.skirting))

    g.add(buildWindow(m))

    return g
}
