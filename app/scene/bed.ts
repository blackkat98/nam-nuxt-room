import * as THREE from 'three'
import type { Materials } from './materials'
import { V, at, box, span } from './helpers'

const Z0 = 5.3
const Z1 = 9.5
const ZC = (Z0 + Z1) / 2
const X0 = 0.1
const X1 = 6.5
const TOP = 1.8
const HEM = 0.52

function scallops(m: Materials): THREE.InstancedMesh {
    const points: THREE.Vector3[] = []

    for (let x = 2.15; x < 6.6; x += 0.24) {
        points.push(V(x, HEM, Z1 + 0.06))
    }

    for (let z = Z0 + 0.1; z < Z1 - 0.05; z += 0.24) {
        points.push(V(X1 + 0.26, HEM, z))
    }

    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 10, 8), m.quiltEdge, points.length)
    const matrix = new THREE.Matrix4()
    const rotation = new THREE.Quaternion()
    const scale = V(1, 0.7, 1)
    points.forEach((p, i) => mesh.setMatrixAt(i, matrix.compose(p, rotation, scale)))

    return mesh
}

/** A thick mattress lying directly on the floor, pushed against the left wall. */
export function buildBed(m: Materials): THREE.Group {
    const g = new THREE.Group()

    // mattress with piped seams along the top and bottom edges
    g.add(span(X0, X1, 0, TOP, Z0 + 0.1, Z1 - 0.1, m.mattress, 0.18))

    for (const y of [0.12, TOP - 0.12]) {
        g.add(span(X0 + 0.04, X1 + 0.015, y - 0.025, y + 0.025, Z0 + 0.14, Z1 - 0.085, m.quiltEdge, 0.02))
    }

    // quilt with a turned-down fold and a scalloped hem
    g.add(span(1.95, X1 + 0.25, HEM, TOP + 0.2, Z0 - 0.05, Z1 + 0.05, m.quilt, 0.3))
    g.add(span(1.72, 2.36, TOP + 0.13, TOP + 0.37, Z0 - 0.08, Z1 + 0.08, m.quilt, 0.11))
    g.add(scallops(m))

    // a single pillow leaning against the wall
    const pillow = box(0.55, 1.3, 2.25, m.plaid, 0.26)
    pillow.rotation.set(0, -0.05, 0.38)
    g.add(at(pillow, 0.6, 2.38, ZC))

    return g
}
