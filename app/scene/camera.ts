import * as THREE from 'three'
import { V } from './helpers'

export interface IsoCameraOptions {
    /** How far (radians) the viewer may orbit left/right of the default view. */
    azimuthRange: number
    /** How far (radians) the viewer may tilt up (towards a top-down view) from the default view. */
    polarUp: number
    /** Lowest the viewer may tilt, as an absolute polar angle; Math.PI / 2 is eye level. */
    maxPolar: number
}

const AZIMUTH_SAMPLES = 16
const POLAR_SAMPLES = 8

export interface IsoCamera {
    camera: THREE.OrthographicCamera
    minAzimuth: number
    maxAzimuth: number
    minPolar: number
    maxPolar: number
}

const DISTANCE = 60

/**
 * Builds a square orthographic camera looking at `target` from an isometric angle.
 * The frustum is sized so the `hull` points stay inside the view at every allowed orbit angle,
 * which guarantees the model never gets cropped while the user drags it around.
 */
export function createIsoCamera(target: THREE.Vector3, hull: THREE.Vector3[], options: IsoCameraOptions): IsoCamera {
    const base = new THREE.Spherical().setFromVector3(V(1, 0.86, 1))
    const probe = new THREE.OrthographicCamera()
    const point = V()
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    const minPolar = base.phi - options.polarUp
    const maxPolar = Math.max(base.phi, options.maxPolar)

    for (let i = 0; i <= AZIMUTH_SAMPLES; i++) {
        const theta = base.theta + options.azimuthRange * ((2 * i) / AZIMUTH_SAMPLES - 1)

        for (let j = 0; j <= POLAR_SAMPLES; j++) {
            const phi = minPolar + (maxPolar - minPolar) * (j / POLAR_SAMPLES)
            probe.position.setFromSphericalCoords(DISTANCE, phi, theta).add(target)
            probe.lookAt(target)
            probe.updateMatrixWorld()

            for (const p of hull) {
                point.copy(p).applyMatrix4(probe.matrixWorldInverse)
                minX = Math.min(minX, point.x)
                maxX = Math.max(maxX, point.x)
                minY = Math.min(minY, point.y)
                maxY = Math.max(maxY, point.y)
            }
        }
    }

    const half = (Math.max(maxX - minX, maxY - minY) / 2) * 1.01
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const camera = new THREE.OrthographicCamera(cx - half, cx + half, cy + half, cy - half, 1, DISTANCE * 3)
    camera.position.setFromSphericalCoords(DISTANCE, base.phi, base.theta).add(target)
    camera.lookAt(target)

    return {
        camera,
        minAzimuth: base.theta - options.azimuthRange,
        maxAzimuth: base.theta + options.azimuthRange,
        minPolar,
        maxPolar,
    }
}
