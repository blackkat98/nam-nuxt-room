import * as THREE from 'three'
import type { Materials } from './materials'
import { V, at, cylinder, noShadow, pick, rod, span, sphere } from './helpers'
import { bladePlant, trailingPlant } from './plants'

/** Footprint of the open shelving unit in the corner (its back is against the right wall, z = 0). */
const SHELF = { x0: 0.3, x1: 3.0, depth: 1.5, top: 4.66 }
/** Front of the shelf's top board, and the side of the quilt on the mattress. */
const SHELF_FRONT_Z = SHELF.depth + 0.04
const BED_SIDE_Z = 5.25
const NIGHTSTAND_WIDTH = 1.7
/** Nightstand body, centred between the shelf and the side of the mattress, against the left wall. */
const NIGHTSTAND = { x0: 0.12, x1: 1.8, height: 1.95, zc: (SHELF_FRONT_Z + BED_SIDE_Z) / 2 }
/** The TV standing on the nightstand: its screen centre line, bottom gap above the top, and size. */
const TV = { x: (NIGHTSTAND.x0 + NIGHTSTAND.x1) / 2 - 0.15, lift: 0.2, width: 2.6, height: 1.5 }
/** Middle of the TV's top edge, e.g. for placing a marker above it. */
export const TV_TOP = V(TV.x, NIGHTSTAND.height + TV.lift + TV.height, NIGHTSTAND.zc)
/** Distance of each TV foot from the TV's centre; must stay inside NIGHTSTAND_WIDTH / 2. */
const FOOT_OFFSET = 0.55

/** A flat-screen TV standing on two feet, facing +x (into the room) from the left wall. */
function standingTv(m: Materials, x: number, y: number, z: number): THREE.Group {
    const g = new THREE.Group()
    const { width, height } = TV
    const bottom = y + TV.lift

    g.add(span(x - 0.06, x + 0.06, bottom, bottom + height, z - width / 2, z + width / 2, m.black, 0.04))
    g.add(span(x - 0.18, x - 0.06, bottom + 0.3, bottom + height - 0.35, z - 0.6, z + 0.6, m.charcoal, 0.04))
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.12, height - 0.12), m.tvScreen)
    screen.rotation.y = Math.PI / 2
    g.add(at(screen, x + 0.062, bottom + height / 2, z))

    // V-shaped feet, set in far enough to stand on the nightstand top
    for (const fz of [z - FOOT_OFFSET, z + FOOT_OFFSET]) {
        const top = V(x, bottom + 0.04, fz)
        g.add(rod(top, V(x - 0.32, y + 0.02, fz), 0.035, m.charcoal, 8))
        g.add(rod(top, V(x + 0.32, y + 0.02, fz), 0.035, m.charcoal, 8))
        g.add(span(x - 0.36, x + 0.36, y, y + 0.03, fz - 0.05, fz + 0.05, m.charcoal, 0.01))
    }

    return g
}

export function buildNightstand(m: Materials): THREE.Group {
    const g = new THREE.Group()
    const { x0, x1, zc, height: h } = NIGHTSTAND
    const z0 = zc - NIGHTSTAND_WIDTH / 2
    const z1 = zc + NIGHTSTAND_WIDTH / 2

    for (const lx of [x0 + 0.16, x1 - 0.16]) {
        for (const lz of [z0 + 0.16, z1 - 0.16]) {
            g.add(at(cylinder(0.07, 0.05, 0.3, m.whiteWarm, 12), lx, 0.15, lz))
        }
    }

    g.add(span(x0, x1, 0.28, h, z0, z1, m.white, 0.08))
    g.add(span(x1 - 0.01, x1 + 0.01, 0.42, 0.92, z0 + 0.14, z1 - 0.14, m.whiteWarm, 0.01))
    g.add(span(x1 - 0.02, x1 + 0.05, 1.05, 1.78, z0 + 0.12, z1 - 0.12, m.whiteWarm, 0.04))
    g.add(at(sphere(0.07, m.gold, 12, 8), x1 + 0.1, 1.42, zc))

    const tv = standingTv(m, TV.x, h, zc)
    tv.userData.interactive = 'tv'
    g.add(tv)

    return g
}

function storageJar(m: Materials, x: number, y: number, z: number, radius: number, height: number, index: number): THREE.Group {
    const g = new THREE.Group()
    g.add(at(cylinder(radius * 0.9, radius * 0.9, height * 0.7, pick(m.jarContents, index), 16), x, y + height * 0.36, z))
    g.add(noShadow(at(cylinder(radius, radius, height, m.glassJar, 18), x, y + height / 2, z)))
    g.add(at(cylinder(radius * 1.03, radius * 1.03, 0.08, index % 2 === 0 ? m.gold : m.woodMid, 18), x, y + height + 0.04, z))

    return g
}

/** A row of upright books starting at x, standing on `y`. Returns the x where the row ends. */
function bookRow(g: THREE.Group, m: Materials, x: number, y: number, z0: number, depth: number, count: number, seed: number): number {
    let bx = x

    for (let i = 0; i < count; i++) {
        const t = 0.13 + ((i + seed) % 3) * 0.035
        const h = 0.62 + (((i + seed) * 37) % 5) * 0.06
        g.add(span(bx, bx + t, y, y + h, z0, z0 + depth, pick(m.books, i + seed), 0.02))
        bx += t + 0.015
    }

    return bx
}

/** A woven storage basket with a cut-out handle on its front face. */
function storageBasket(m: Materials, x0: number, x1: number, y: number, z0: number, z1: number): THREE.Group {
    const g = new THREE.Group()
    const h = 0.78
    g.add(span(x0, x1, y, y + h, z0, z1, m.tanLight, 0.06))
    g.add(span(x0 - 0.01, x1 + 0.01, y + h - 0.1, y + h - 0.04, z0 - 0.01, z1 + 0.01, m.tan, 0.02))
    const xc = (x0 + x1) / 2
    g.add(span(xc - 0.17, xc + 0.17, y + h - 0.3, y + h - 0.2, z1 - 0.02, z1 + 0.005, m.strap, 0.03))

    return g
}

/**
 * Open 4-level shelving unit against the right wall, next to the left-wall corner,
 * with a trailing plant on top.
 */
export function buildShelf(m: Materials): THREE.Group {
    const g = new THREE.Group()
    const { x0, x1, depth, top } = SHELF
    const board = 0.08
    const levels = [0.18, 1.3, 2.42, 3.54]
    const zb = 0.07
    const zf = depth - 0.02

    // carcass: sides, back, kick plate, level boards and a slightly overhanging top
    g.add(span(x0, x0 + 0.1, 0, top, 0.02, depth, m.cabinet, 0.03))
    g.add(span(x1 - 0.1, x1, 0, top, 0.02, depth, m.cabinet, 0.03))
    g.add(span(x0 + 0.1, x1 - 0.1, 0.1, top, 0.02, zb, m.cabinetDark))
    g.add(span(x0 + 0.1, x1 - 0.1, 0, 0.1, depth - 0.1, depth - 0.04, m.cabinetDark))

    for (const y of levels) {
        g.add(span(x0 + 0.1, x1 - 0.1, y - board, y, zb, zf, m.cabinetLight, 0.01))
    }

    g.add(span(x0 - 0.04, x1 + 0.04, top, top + 0.1, 0, depth + 0.04, m.cabinet, 0.03))

    // level 1: two woven baskets
    const xm = (x0 + x1) / 2
    g.add(storageBasket(m, x0 + 0.2, xm - 0.06, levels[0] ?? 0, 0.25, depth - 0.12))
    g.add(storageBasket(m, xm + 0.06, x1 - 0.2, levels[0] ?? 0, 0.25, depth - 0.12))

    // level 2: books with one lying flat
    const y2 = levels[1] ?? 0
    const end = bookRow(g, m, x0 + 0.18, y2, 0.25, 0.85, 8, 0)
    g.add(span(end + 0.08, x1 - 0.2, y2, y2 + 0.14, 0.3, 1.1, pick(m.books, 4), 0.02))
    g.add(span(end + 0.12, x1 - 0.24, y2 + 0.14, y2 + 0.26, 0.34, 1.05, pick(m.books, 1), 0.02))

    // level 3: jars
    const y3 = levels[2] ?? 0

    for (let i = 0; i < 4; i++) {
        g.add(storageJar(m, x0 + 0.45 + i * 0.6, y3, 0.8, 0.2, 0.5 + (i % 2) * 0.12, i))
    }

    // level 4: a few books and a small potted plant
    const y4 = levels[3] ?? 0
    bookRow(g, m, x0 + 0.18, y4, 0.25, 0.85, 5, 3)
    g.add(at(cylinder(0.22, 0.18, 0.32, m.potWhite, 20), x1 - 0.55, y4 + 0.16, 0.75))
    g.add(bladePlant(m, V(x1 - 0.55, y4 + 0.3, 0.75), 13, 0.75))

    // trailing plant on top
    const potX = x1 - 0.6
    const potZ = 0.75
    const potY = top + 0.1
    g.add(at(cylinder(0.33, 0.25, 0.45, m.terracotta, 24), potX, potY + 0.225, potZ))
    g.add(at(cylinder(0.36, 0.34, 0.08, m.terracotta, 24), potX, potY + 0.42, potZ))
    g.add(at(cylinder(0.31, 0.31, 0.02, m.soil, 20), potX, potY + 0.44, potZ))
    g.add(trailingPlant(m, V(potX, potY + 0.42, potZ), 42, { angleMin: -0.35, angleMax: 1.9 }))

    return g
}
