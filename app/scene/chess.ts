import * as THREE from 'three'
import type { Materials } from './materials'
import { V, cylinder } from './helpers'

/**
 * Side profile of a Staunton knight's head and neck, facing +x, from the collar (y = 0) up to the ear tip.
 * The outline runs from the front of the collar, up the chest, round the muzzle and ears, and down the mane.
 */
const KNIGHT_PROFILE = [
    [0.14, 0.06], [0.11, 0.17], [0.15, 0.27], [0.23, 0.34], [0.29, 0.4], [0.28, 0.47], [0.2, 0.53],
    [0.11, 0.6], [0.06, 0.69], [0.0, 0.62], [-0.1, 0.57], [-0.17, 0.45], [-0.18, 0.3], [-0.2, 0.12],
]
const KNIGHT_DEPTH = 0.16
/** Height of the turned base the head stands on. */
const KNIGHT_BASE = 0.2

/** A black Staunton chess knight standing on `base`, its head turned by `turn` (radians around y). */
export function chessKnight(m: Materials, base: THREE.Vector3, turn: number): THREE.Group {
    const g = new THREE.Group()

    // felt pad, foot, and the turned collar
    g.add(cylinder(0.21, 0.21, 0.015, m.chessFelt, 24).translateY(0.008))
    g.add(cylinder(0.18, 0.21, 0.08, m.chessBlack, 24).translateY(0.055))
    g.add(cylinder(0.15, 0.17, 0.07, m.chessBlack, 24).translateY(0.13))
    g.add(cylinder(0.16, 0.15, 0.03, m.chessBlack, 24).translateY(KNIGHT_BASE - 0.015))

    // the head: the profile extruded and rounded off, centred on the base
    const shape = new THREE.Shape()
    shape.moveTo(-0.19, 0)
    shape.lineTo(0.15, 0)
    shape.splineThru(KNIGHT_PROFILE.map(([x, y]) => new THREE.Vector2(x, y)))
    shape.lineTo(-0.19, 0)
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: KNIGHT_DEPTH,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.025,
        bevelSegments: 3,
        curveSegments: 6,
    })
    geometry.translate(0, 0, -KNIGHT_DEPTH / 2)
    const head = new THREE.Mesh(geometry, m.chessBlack)
    head.position.y = KNIGHT_BASE
    g.add(head)

    g.position.copy(base)
    g.rotation.y = turn

    return g
}

/** Size of the Chinese chess piece: a thick wooden disc. */
const XIANGQI_RADIUS = 0.22
const XIANGQI_THICKNESS = 0.12

/**
 * A Chinese chess (xiangqi) horse, stood on its edge on `base` and leaning back slightly, its 馬 face turned
 * towards `facing`.
 */
export function xiangqiHorse(m: Materials, base: THREE.Vector3, facing: THREE.Vector3): THREE.Group {
    // built facing +z: the disc's axis along z, with the carved face on its front
    const disc = new THREE.Group()
    const body = cylinder(XIANGQI_RADIUS, XIANGQI_RADIUS, XIANGQI_THICKNESS, m.xiangqiWood, 32)
    body.rotation.x = Math.PI / 2
    const face = new THREE.Mesh(new THREE.CircleGeometry(XIANGQI_RADIUS * 0.94, 32), m.xiangqiFace)
    face.position.z = XIANGQI_THICKNESS / 2 + 0.002
    disc.add(body, face)

    // lookAt turns the face (+z) to `facing` and keeps the 馬 upright; leaning back by `tilt` lowers the rim
    // a little and brings the back edge down, so the lowest point sits exactly on the shelf
    const tilt = Math.asin(facing.clone().normalize().y)
    const lowest = XIANGQI_RADIUS * Math.cos(tilt) + (XIANGQI_THICKNESS / 2) * Math.sin(tilt)
    disc.position.copy(base).add(V(0, lowest, 0))
    disc.lookAt(disc.position.clone().add(facing))

    const g = new THREE.Group()
    g.add(disc)

    return g
}
