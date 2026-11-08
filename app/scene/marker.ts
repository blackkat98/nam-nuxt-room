import * as THREE from 'three'
import { noShadow } from './helpers'

export interface MarkerOptions {
    color?: THREE.ColorRepresentation
    /** Width of the triangle's top edge. */
    size?: number
    /** Seconds; offsets the spin and bob so neighbouring markers don't move in lockstep. */
    phase?: number
    /** Id of the interactive thing this marker belongs to, so clicking the marker counts as clicking it. */
    interactive?: string
    /** Which way the tip points (default straight down); it spins around and bobs along this direction. */
    direction?: THREE.Vector3
}

export interface Marker {
    group: THREE.Group
    /** `time` in seconds. */
    update: (time: number) => void
}

/** Turns per second around the vertical axis. */
const SPIN_SPEED = 0.45
const BOB_HEIGHT = 0.1
const BOB_SPEED = 2.4
const DOWN = new THREE.Vector3(0, -1, 0)

function triangleGeometry(size: number): THREE.ExtrudeGeometry {
    const half = size / 2
    const height = (size * Math.sqrt(3)) / 2
    const shape = new THREE.Shape()
    shape.moveTo(-half, height)
    shape.lineTo(half, height)
    shape.lineTo(0, 0)
    shape.closePath()

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: size * 0.22,
        bevelEnabled: true,
        bevelThickness: size * 0.06,
        bevelSize: size * 0.06,
        bevelSegments: 3,
    })
    geometry.center()

    return geometry
}

/**
 * A video-game style "something to click here" marker: an upside-down triangle that spins around the vertical
 * axis (or around `direction`) and bobs gently, with its tip hovering at `position`. Unlit-looking glow and a dark outline keep it
 * readable against any part of the room.
 */
export function createMarker(position: THREE.Vector3, options: MarkerOptions = {}): Marker {
    const { color = '#4ade80', size = 0.55, phase = 0, interactive, direction } = options
    const geometry = triangleGeometry(size)
    const height = (size * Math.sqrt(3)) / 2 + size * 0.06

    const body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.45,
        roughness: 0.35,
        metalness: 0.05,
    }))
    const outline = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(0.3),
        side: THREE.BackSide,
    }))
    outline.scale.setScalar(1.14)

    // The marker floats above things; a moving shadow on the walls would only distract.
    const spin = new THREE.Group()
    spin.add(noShadow(body), noShadow(outline))

    const group = new THREE.Group()
    group.position.copy(position)

    // the spin and bob run along the group's local y axis; turn it so the tip faces `direction`
    if (direction) {
        group.quaternion.setFromUnitVectors(DOWN, direction.clone().normalize())
    }

    group.add(spin)
    group.userData.marker = true
    group.userData.interactive = interactive

    return {
        group,
        update: (time) => {
            const t = time + phase
            spin.rotation.y = t * SPIN_SPEED * Math.PI * 2
            spin.position.y = height / 2 + (Math.sin(t * BOB_SPEED) + 1) * BOB_HEIGHT
        },
    }
}
