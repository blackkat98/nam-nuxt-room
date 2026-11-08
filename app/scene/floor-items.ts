import * as THREE from 'three'
import type { Materials } from './materials'
import { at, box, span } from './helpers'

/** The top of the backpack, leaning on the bed, e.g. for its marker. */
export const BACKPACK = { x: 6.85, z: 7.4, height: 1.75 }
/** Where its bottom back edge rests on the floor, beside the foot end of the bed, and how far it leans back. */
const FOOT = { x: 7.12, z: 7.4 }
const LEAN = 0.2
/** Half the bag's depth: the pivot sits on its back edge, so it rocks back onto that edge, not into the floor. */
const HALF_DEPTH = 0.31

/** The backpack, its straps against the side of the bed and its top resting on the quilt. */
function backpack(m: Materials): THREE.Group {
    // turned so its back (straps, -z) faces the bed (-x), then tipped back from its bottom back edge
    const stand = new THREE.Group()
    stand.position.set(FOOT.x, 0, FOOT.z)
    stand.rotation.y = Math.PI / 2 - 0.1
    const tilt = new THREE.Group()
    tilt.rotation.x = -LEAN
    stand.add(tilt)
    const bag = new THREE.Group()
    bag.position.z = HALF_DEPTH
    tilt.add(bag)
    bag.add(at(box(1.15, 1.7, 0.62, m.backpack, 0.25), 0, 0.85, 0))
    bag.add(at(box(0.85, 0.75, 0.22, m.backpackPocket, 0.12), 0, 0.55, 0.35))
    bag.add(at(box(0.7, 0.03, 0.03, m.backpackStrap), 0, 0.9, 0.46))
    bag.add(at(box(0.9, 0.03, 0.03, m.backpackStrap), 0, 1.55, 0.3))
    bag.add(at(box(0.06, 0.12, 0.03, m.metal, 0.01), 0.3, 0.86, 0.47))

    for (const side of [-1, 1]) {
        bag.add(at(box(0.14, 1.35, 0.08, m.backpackStrap, 0.03), side * 0.3, 0.9, -0.34))
        bag.add(at(box(0.12, 0.7, 0.32, m.backpackPocket, 0.06), side * 0.6, 0.55, 0))
    }

    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 16, Math.PI), m.backpackStrap)
    bag.add(at(handle, 0, 1.68, 0))
    // clicking the backpack opens the CV
    stand.userData.interactive = 'cv'

    return stand
}

export function buildFloorItems(m: Materials): THREE.Group {
    const g = new THREE.Group()
    g.add(span(4.3, 9.7, 0, 0.04, 5.5, 9.75, m.rug, 0.02))
    g.add(backpack(m))

    return g
}
