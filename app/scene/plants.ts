import * as THREE from 'three'
import type { Materials } from './materials'
import { V, rng } from './helpers'

type Random = () => number

function leafMatrix(r: Random, position: THREE.Vector3, size: number): THREE.Matrix4 {
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * Math.PI, r() * Math.PI * 2, r() * Math.PI))

    return new THREE.Matrix4().compose(position, rotation, V(size, size * 0.22, size * 0.62))
}

/** Splits leaf transforms across two instanced meshes, alternating dark and light greens. */
function leafMeshes(m: Materials, matrices: THREE.Matrix4[]): THREE.InstancedMesh[] {
    const geometry = new THREE.SphereGeometry(1, 10, 6)
    const dark = new THREE.InstancedMesh(geometry, m.leaf, Math.ceil(matrices.length / 2))
    const light = new THREE.InstancedMesh(geometry, m.leafLight, Math.floor(matrices.length / 2))

    matrices.forEach((matrix, i) => {
        if (i % 2 === 0) {
            dark.setMatrixAt(i / 2, matrix)
        } else {
            light.setMatrixAt((i - 1) / 2, matrix)
        }
    })

    return [dark, light]
}

export interface TrailingPlantOptions {
    angleMin: number
    angleMax: number
    vines?: number
}

/**
 * A pothos-like plant whose vines reach out from `base` and fall over an edge.
 * Angles are measured around +y, starting at +z and turning towards +x.
 * The returned group pivots at `base` and is tagged `userData.sway` (a phase), so the room can sway it gently.
 */
export function trailingPlant(m: Materials, base: THREE.Vector3, seed: number, options: TrailingPlantOptions): THREE.Group {
    const pivot = new THREE.Group()
    pivot.position.copy(base)
    pivot.userData.sway = seed % 7
    const g = new THREE.Group()
    g.position.copy(base).negate()
    pivot.add(g)
    const r = rng(seed)
    const leaves: THREE.Matrix4[] = []
    const vines = options.vines ?? 10

    for (let i = 0; i < 36; i++) {
        const a = r() * Math.PI * 2
        const radius = r() * 0.42
        const p = V(base.x + Math.cos(a) * radius, base.y + 0.05 + r() * 0.32 * (1 - radius), base.z + Math.sin(a) * radius)
        leaves.push(leafMatrix(r, p, 0.15 + r() * 0.06))
    }

    for (let v = 0; v < vines; v++) {
        const a = options.angleMin + (options.angleMax - options.angleMin) * (v / (vines - 1)) + (r() - 0.5) * 0.25
        const dir = V(Math.sin(a), 0, Math.cos(a))
        const perp = V(dir.z, 0, -dir.x)
        const reach = 1.0 + r() * 0.3
        const length = 0.7 + r() * 2.0
        const steps = 14 + Math.round(length * 8)
        const points: THREE.Vector3[] = []

        for (let s = 0; s <= steps; s++) {
            const u = (s / steps) * (reach + length)
            const out = Math.min(u, reach)
            const drop = Math.max(0, u - reach)
            const sway = Math.sin(u * 2.4 + v) * (drop > 0 ? 0.07 : 0.02)
            const y = base.y + 0.18 - drop - 0.1 * (out / reach) ** 2
            points.push(V(base.x + dir.x * out + perp.x * sway, y, base.z + dir.z * out + perp.z * sway))
        }

        const curve = new THREE.CatmullRomCurve3(points)
        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, steps * 2, 0.014, 5, false), m.stem))

        points.forEach((p, s) => {
            if (s < 3) {
                return
            }

            const side = s % 2 === 0 ? 1 : -1
            const offset = perp.clone().multiplyScalar(side * 0.07)
            leaves.push(leafMatrix(r, p.clone().add(offset), 0.12 + r() * 0.06))
        })
    }

    g.add(...leafMeshes(m, leaves))

    return pivot
}

/** Upright blade-like leaves, like a small snake plant. */
export function bladePlant(m: Materials, base: THREE.Vector3, seed: number, scale = 1): THREE.Group {
    const g = new THREE.Group()
    const r = rng(seed)

    for (let i = 0; i < 8; i++) {
        const h = (0.5 + r() * 0.5) * scale
        const geometry = new THREE.ConeGeometry(0.075 * scale, h, 6)
        geometry.translate(0, h / 2, 0)
        const blade = new THREE.Mesh(geometry, i % 2 === 0 ? m.leaf : m.leafLight)
        blade.scale.z = 0.35
        blade.position.set(base.x + (r() - 0.5) * 0.14 * scale, base.y, base.z + (r() - 0.5) * 0.14 * scale)
        blade.rotation.set((r() - 0.5) * 0.6, r() * Math.PI, (r() - 0.5) * 0.6)
        g.add(blade)
    }

    return g
}
