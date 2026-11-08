import * as THREE from 'three'
import type { Materials } from './materials'
import { V, at, box, pick, rod, span } from './helpers'
import { chessKnight, xiangqiHorse } from './chess'
import { GALLERY } from '~/data/gallery'

/** Height of the left wall shelf's top board. */
const SHELF_TOP = 6.27
/** Where the chess knight stands on the shelf (it links to my Chess.com profile). */
export const KNIGHT = V(0.48, SHELF_TOP, 7.95)

/**
 * Swaps the poster's art for the image at `src` once it loads, cropped to fill a frame of `aspect` (width / height)
 * like `object-fit: cover`. Until then (or if it fails) the painted placeholder stays.
 */
function loadArt(material: THREE.MeshStandardMaterial, src: string, aspect: number): void {
    new THREE.TextureLoader().load(src, (texture) => {
        const image = texture.image as { width: number, height: number }
        const imageAspect = image.width / image.height
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 8

        if (imageAspect > aspect) {
            texture.repeat.set(aspect / imageAspect, 1)
        } else {
            texture.repeat.set(1, imageAspect / aspect)
        }

        texture.offset.set((1 - texture.repeat.x) / 2, (1 - texture.repeat.y) / 2)
        material.map?.dispose()
        material.map = texture
        material.needsUpdate = true
    })
}

/** A framed print on the left wall (x = 0), facing +x; clicking it opens gallery picture `index`. */
function leftPoster(m: Materials, z0: number, z1: number, y0: number, y1: number, art: THREE.MeshStandardMaterial, index: number): THREE.Group {
    const g = new THREE.Group()
    g.add(span(0, 0.07, y0, y1, z0, z1, m.white, 0.02))
    const width = z1 - z0 - 0.16
    const height = y1 - y0 - 0.16
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), art)
    plane.rotation.y = Math.PI / 2
    g.add(at(plane, 0.075, (y0 + y1) / 2, (z0 + z1) / 2))
    g.userData.interactive = `poster:${index}`

    const src = GALLERY[index]?.src

    if (src) {
        loadArt(art, src, width / height)
    }

    return g
}

function leftShelf(m: Materials): THREE.Group {
    const g = new THREE.Group()
    const y = SHELF_TOP - 0.12
    g.add(span(0, 0.95, y, y + 0.12, 5.9, 9.25, m.woodMid, 0.03))
    g.add(span(0, 0.95, y + 0.12, y + 0.48, 5.9, 6.0, m.woodMid, 0.03))
    g.add(span(0, 0.95, y + 0.12, y + 0.48, 9.15, 9.25, m.woodMid, 0.03))

    for (const z of [6.3, 8.85]) {
        g.add(span(0, 0.12, y - 0.45, y, z - 0.05, z + 0.05, m.woodMid, 0.02))
        g.add(rod(V(0.05, y - 0.4, z), V(0.6, y - 0.02, z), 0.04, m.woodMid))
    }

    // books standing on the shelf, with one leaning
    const books = [
        { t: 0.3, h: 0.98, color: 0 },
        { t: 0.22, h: 0.86, color: 1 },
        { t: 0.26, h: 0.92, color: 2 },
        { t: 0.18, h: 0.74, color: 3 },
    ]
    let z = 6.05

    for (const b of books) {
        g.add(span(0.1, 0.82, y + 0.12, y + 0.12 + b.h, z, z + b.t, pick(m.books, b.color), 0.025))
        z += b.t + 0.015
    }

    const leaning = box(0.7, 0.8, 0.18, pick(m.books, 8), 0.025)
    leaning.rotation.x = 0.42
    g.add(at(leaning, 0.46, y + 0.5, z + 0.25))

    // a chess knight (side on, so its head reads) and a Chinese chess horse (face on, so its 馬 does)
    const knight = chessKnight(m, KNIGHT, 0.7)
    knight.userData.interactive = 'chess'
    g.add(knight)
    g.add(xiangqiHorse(m, V(0.42, SHELF_TOP, 8.75), V(1, 0.22, 0.45)))

    return g
}

export function buildDecor(m: Materials): THREE.Group {
    const g = new THREE.Group()
    g.add(leftShelf(m))
    // indexes match the order of GALLERY
    g.add(leftPoster(m, 3.55, 5.25, 4.3, 7.0, m.posterBig, 0))
    g.add(leftPoster(m, 2.05, 2.95, 6.25, 7.4, m.posterSmallA, 1))
    g.add(leftPoster(m, 2.05, 2.95, 4.9, 6.0, m.posterSmallB, 2))

    return g
}
