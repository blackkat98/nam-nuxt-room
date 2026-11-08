import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

type AnyMaterial = THREE.Material | THREE.Material[]

export function V(x = 0, y = 0, z = 0): THREE.Vector3 {
    return new THREE.Vector3(x, y, z)
}

/** Deterministic pseudo-random generator (mulberry32), so the room looks the same on every load. */
export function rng(seed: number): () => number {
    let a = seed >>> 0

    return () => {
        a = (a + 0x6D2B79F5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

export function pick<T>(list: readonly T[], index: number): T {
    return list[((index % list.length) + list.length) % list.length] as T
}

export function at<T extends THREE.Object3D>(object: T, x: number, y: number, z: number): T {
    object.position.set(x, y, z)

    return object
}

export function noShadow<T extends THREE.Object3D>(object: T): T {
    object.userData.noShadow = true

    return object
}

/** A box centred at the origin, with rounded edges when radius > 0. */
export function box(w: number, h: number, d: number, material: AnyMaterial, radius = 0): THREE.Mesh {
    const r = Math.min(radius, Math.min(w, h, d) / 2 - 0.001)
    const geometry = r > 0.002
        ? new RoundedBoxGeometry(w, h, d, 3, r)
        : new THREE.BoxGeometry(w, h, d)

    return new THREE.Mesh(geometry, material)
}

/** A box that fills the world-space range [x0,x1] x [y0,y1] x [z0,z1]. */
export function span(
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    material: AnyMaterial,
    radius = 0,
): THREE.Mesh {
    return at(box(x1 - x0, y1 - y0, z1 - z0, material, radius), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
}

export function cylinder(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    material: AnyMaterial,
    segments = 24,
    open = false,
): THREE.Mesh {
    return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, open), material)
}

export function sphere(radius: number, material: AnyMaterial, widthSegments = 24, heightSegments = 16): THREE.Mesh {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, widthSegments, heightSegments), material)
}

/** A cylinder stretched between two points. */
export function rod(from: THREE.Vector3, to: THREE.Vector3, radius: number, material: AnyMaterial, segments = 12): THREE.Mesh {
    const direction = to.clone().sub(from)
    const mesh = cylinder(radius, radius, direction.length(), material, segments)
    mesh.position.copy(from).add(to).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(V(0, 1, 0), direction.normalize())

    return mesh
}

export function disposeObject(root: THREE.Object3D): void {
    root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) {
            return
        }

        object.geometry.dispose()
        const materials: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material]

        for (const material of materials) {
            for (const value of Object.values(material)) {
                if (value instanceof THREE.Texture) {
                    value.dispose()
                }
            }

            material.dispose()
        }

        if (object instanceof THREE.InstancedMesh) {
            object.dispose()
        }
    })
}
