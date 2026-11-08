import * as THREE from 'three'
import { at, noShadow } from './helpers'
import { WALL_H } from './shell'

/** Canvas size for each logo decal, and its size on the wall (same 3.2 : 1 shape). */
const CANVAS = { w: 1024, h: 320 }
const DECAL = { w: 2.6, h: 0.8125 }
/** How far the decals sit from the shared corner, and how far below the wall caps (centres). */
const FROM_CORNER = 1.55
const BELOW_CAP = 0.5
/** A hair in front of the wall, so the decal never flickers into it; the glow sits a hair in front of that. */
const LIFT = 0.012
const GLOW_LIFT = 0.024
/** Space left at the corner end of each decal, in canvas px. */
const EDGE = 40
const WORDMARK_FONT = '600 150px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

/** The colours a logo is drawn in, and how far its halo spreads (canvas px; 0 for none). */
interface Palette {
    ink: string
    green: string
    halo: number
}

/** Painted on the wall: dark ink, Nuxt green. */
const PAINT: Palette = { ink: '#20202a', green: '#00dc82', halo: 0 }
/** The night-time glow: pale neon with a soft halo. */
const NEON: Palette = { ink: '#dfe4ff', green: '#4dffb0', halo: 18 }

/** How bright the glow gets with the lights fully off (0 to 1). */
const GLOW_STRENGTH = 0.95

/** The Nuxt mark (its two peaks), in its own coordinates: about 424 wide and 283 tall, from (44, 115). */
const NUXT_MARK = 'M281.44 397.667H438.32C443.326 397.667 448.118 395.908 452.453 393.427C456.789 390.946 461.258 387.831 463.76 383.533C466.262 379.236 468.002 374.36 468 369.399C467.998 364.437 466.266 359.563 463.76 355.268L357.76 172.947C355.258 168.65 352.201 165.534 347.867 163.053C343.532 160.573 337.325 158.813 332.32 158.813C327.315 158.813 322.521 160.573 318.187 163.053C313.852 165.534 310.795 168.65 308.293 172.947L281.44 219.587L227.733 129.13C225.229 124.834 222.176 120.307 217.84 117.827C213.504 115.346 208.713 115 203.707 115C198.701 115 193.909 115.346 189.573 117.827C185.238 120.307 180.771 124.834 178.267 129.13L46.8267 355.268C44.3208 359.563 44.0022 364.437 44 369.399C43.9978 374.36 44.3246 379.236 46.8267 383.533C49.3288 387.83 53.7979 390.946 58.1333 393.427C62.4688 395.908 67.2603 397.667 72.2667 397.667H171.2C210.401 397.667 238.934 380.082 258.827 346.787L307.04 263.4L332.32 219.587L410.053 352.44H307.04L281.44 397.667ZM169.787 352.44H100.533L203.707 174.36L256.24 263.4L221.548 323.467C208.298 345.071 193.264 352.44 169.787 352.44Z'

type Draw = (ctx: CanvasRenderingContext2D, palette: Palette) => void

function logoTexture(draw: Draw, palette: Palette): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS.w
    canvas.height = CANVAS.h
    const ctx = canvas.getContext('2d')

    if (ctx) {
        ctx.shadowBlur = palette.halo
        draw(ctx, palette)
    }

    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 8

    return map
}

/** Sets the fill, stroke and halo colour together, so the halo always matches what's drawn. */
function useColor(ctx: CanvasRenderingContext2D, color: string): void {
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.shadowColor = color
}

function wordmark(ctx: CanvasRenderingContext2D, palette: Palette, text: string, x: number): void {
    useColor(ctx, palette.ink)
    ctx.font = WORDMARK_FONT
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x, CANVAS.h / 2 + 6)
}

/**
 * The green Nuxt mark and "Nuxt", pushed to the right-hand end: on the left wall that's the end at the corner,
 * so the logo hugs the corner the way three.js does from the other side.
 */
const drawNuxt: Draw = (ctx, palette) => {
    const markWidth = 250
    const gap = 40
    ctx.font = WORDMARK_FONT
    const start = CANVAS.w - EDGE - ctx.measureText('Nuxt').width - gap - markWidth
    const scale = markWidth / 424
    ctx.save()
    ctx.translate(start - 44 * scale, (CANVAS.h - 283 * scale) / 2 - 115 * scale)
    ctx.scale(scale, scale)
    useColor(ctx, palette.green)
    ctx.fill(new Path2D(NUXT_MARK))
    ctx.restore()
    wordmark(ctx, palette, 'Nuxt', start + markWidth + gap)
}

/** Outlines `triangle` and, `depth` levels down, the inner triangles of a Sierpinski split. */
function sierpinski(ctx: CanvasRenderingContext2D, [a, b, c]: THREE.Vector2[], depth: number): void {
    ctx.beginPath()
    ctx.moveTo(a!.x, a!.y)
    ctx.lineTo(b!.x, b!.y)
    ctx.lineTo(c!.x, c!.y)
    ctx.closePath()
    ctx.stroke()

    if (depth > 0) {
        const ab = a!.clone().lerp(b!, 0.5)
        const bc = b!.clone().lerp(c!, 0.5)
        const ca = c!.clone().lerp(a!, 0.5)
        sierpinski(ctx, [a!, ab, ca], depth - 1)
        sierpinski(ctx, [ab, b!, bc], depth - 1)
        sierpinski(ctx, [ca, bc, c!], depth - 1)
    }
}

/** A wireframe triangle, split up like the three.js logo, and "three.js". */
const drawThree: Draw = (ctx, palette) => {
    useColor(ctx, palette.ink)
    ctx.lineWidth = 7
    ctx.lineJoin = 'round'
    // a tilted triangle filling a ~250px square at the left
    sierpinski(ctx, [new THREE.Vector2(EDGE, 30), new THREE.Vector2(270, 150), new THREE.Vector2(70, 290)], 2)
    wordmark(ctx, palette, 'three.js', 300)
}

/** How far from a painted pixel (canvas px) a click still counts as on the logo, so thin lines are easy to hit. */
const HIT_MARGIN = 14

/**
 * A raycast for a decal plane that only reports hits on (or near) its painted pixels, read from the alpha of
 * `map`'s canvas; clicks on the transparent rest of the plane go through to the wall.
 */
function onlyOnInk(map: THREE.CanvasTexture): THREE.Mesh['raycast'] {
    const canvas = map.image as HTMLCanvasElement
    const alpha = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data

    const inked = (u: number, v: number) => {
        const x = Math.round(u * canvas.width)
        const y = Math.round((1 - v) * canvas.height)

        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height || !alpha) {
            return false
        }

        return alpha[(y * canvas.width + x) * 4 + 3]! > 40
    }

    const offsets = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [dx! * HIT_MARGIN / canvas.width, dy! * HIT_MARGIN / canvas.height])

    return function (this: THREE.Mesh, raycaster, intersects) {
        const hits: THREE.Intersection[] = []
        THREE.Mesh.prototype.raycast.call(this, raycaster, hits)

        for (const hit of hits) {
            if (hit.uv && offsets.some(([du, dv]) => inked(hit.uv!.x + du!, hit.uv!.y + dv!))) {
                intersects.push(hit)
            }
        }
    }
}

export interface Logos {
    group: THREE.Group
    /** Fades the glow in with `night` (0 = lights on, 1 = lights off). */
    update: (night: number) => void
}

/**
 * "Built with" logos painted near the top of the walls, either side of the corner where they meet:
 * Nuxt on the left wall, three.js on the back wall. With the lights off they glow like neon signs.
 */
export function buildLogos(): Logos {
    const g = new THREE.Group()
    const geometry = new THREE.PlaneGeometry(DECAL.w, DECAL.h)
    const y = WALL_H - BELOW_CAP
    // the neon copies, which all fade together
    const neons: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = []

    // the paint, and in front of it the neon copy, added on top of whatever is behind it; each logo is clickable
    // (its `interactive` tag), linking to its site, with no marker: they're a quiet extra
    const logo = (draw: Draw, id: string): THREE.Group => {
        const decal = new THREE.Group()
        decal.userData.interactive = id
        const paintMap = logoTexture(draw, PAINT)
        const paint = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            map: paintMap,
            transparent: true,
            roughness: 0.9,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
        }))
        const neon = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
            map: logoTexture(draw, NEON),
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
            polygonOffset: true,
            polygonOffsetFactor: -4,
        }))
        neon.position.z = GLOW_LIFT - LIFT
        neon.visible = false
        // always drawn after the paint, so it lands on top
        neon.renderOrder = 1
        neons.push(neon)
        // only the painted shapes take clicks, not the empty wall around them
        const raycast = onlyOnInk(paintMap)
        paint.raycast = raycast
        neon.raycast = raycast
        decal.add(noShadow(paint), noShadow(neon))

        return decal
    }

    // left wall (x = 0), facing +x; read left to right, it runs from the front of the room towards the corner
    const nuxt = logo(drawNuxt, 'nuxt')
    nuxt.rotation.y = Math.PI / 2
    g.add(at(nuxt, LIFT, y, FROM_CORNER))

    // back wall (z = 0), facing +z
    g.add(at(logo(drawThree, 'three'), FROM_CORNER, y, LIFT))

    return {
        group: g,
        update: (night) => {
            for (const neon of neons) {
                neon.material.opacity = night * GLOW_STRENGTH
                // skip drawing the glow entirely in daylight
                neon.visible = night > 0.01
            }
        },
    }
}
