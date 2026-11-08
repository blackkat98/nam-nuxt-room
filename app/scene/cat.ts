import * as THREE from 'three'
import type { Materials } from './materials'
import { V, at, noShadow, sphere } from './helpers'

/** Where the cat sleeps: on the quilt near the foot of the bed, and which way its head points (radians around y). */
export const CAT = { x: 5.0, y: 2.0, z: 6.55, turn: -0.95 }

/** Seconds per breath while asleep. */
const BREATH_PERIOD = 3.2
const BREATH_SWELL = 0.05
/** How long a poke keeps the cat awake, and how fast its head moves between sleeping and alert. */
const AWAKE_FOR = 3.2
const HEAD_EASE = 5
/** The "z"s drifting up while it sleeps: how many, seconds each takes to rise, and how high they go. */
const SNORES = 3
const SNORE_RISE = 3
const SNORE_HEIGHT = 0.6

/** Head pose asleep (resting on the paws, nose down) and awake (lifted, turned towards the room). */
const HEAD_ASLEEP = { y: 0.2, tilt: -0.3, turn: 0 }
const HEAD_AWAKE = { y: 0.32, tilt: 0.12, turn: 0.55 }

export interface Cat {
    group: THREE.Group
    update: (time: number, dt: number) => void
    /** Wakes the cat for a moment (it was clicked). */
    wake: () => void
}

/** A sprite texture of a single "z". */
function snoreTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')

    if (ctx) {
        ctx.font = 'bold 48px "Press Start 2P", ui-monospace, monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineWidth = 8
        ctx.strokeStyle = '#2b2233'
        ctx.strokeText('z', 32, 34)
        ctx.fillStyle = '#ffffff'
        ctx.fillText('z', 32, 34)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace

    return texture
}

/** A sphere squashed into an ellipsoid with the given radii. */
function blob(radii: THREE.Vector3, material: THREE.Material, position: THREE.Vector3): THREE.Mesh {
    const mesh = sphere(1, material, 20, 14)
    mesh.scale.copy(radii)
    mesh.position.copy(position)

    return mesh
}

function buildHead(m: Materials): { group: THREE.Group, eyesOpen: THREE.Group, eyesShut: THREE.Group, ears: THREE.Mesh[] } {
    const g = new THREE.Group()
    // the head faces +x
    g.add(blob(V(0.19, 0.16, 0.18), m.catFurPlain, V()))
    g.add(blob(V(0.08, 0.06, 0.1), m.catCream, V(0.15, -0.05, 0)))
    g.add(at(sphere(0.022, m.catNose, 10, 8), 0.225, -0.01, 0))

    const ears = [-1, 1].map((side) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.13, 4), m.catFurPlain)
        ear.position.set(-0.01, 0.15, side * 0.09)
        ear.rotation.set(side * 0.35, 0, 0)
        g.add(ear)

        return ear
    })

    // shut: two little dark slits; open: green eyes with dark pupils
    const eyesShut = new THREE.Group()
    const eyesOpen = new THREE.Group()

    for (const side of [-1, 1]) {
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.06), m.catDark)
        slit.position.set(0.165, 0.03, side * 0.075)
        slit.rotation.y = side * 0.5
        eyesShut.add(slit)
        eyesOpen.add(at(sphere(0.032, m.catEye, 10, 8), 0.155, 0.035, side * 0.075))
        eyesOpen.add(at(sphere(0.016, m.catDark, 8, 6), 0.182, 0.035, side * 0.078))
    }

    eyesOpen.visible = false
    g.add(eyesShut, eyesOpen)

    return { group: g, eyesOpen, eyesShut, ears }
}

/**
 * An orange tabby curled up asleep on the bed: it breathes, flicks an ear and twitches its tail now and then,
 * and a few "z"s float up. Clicking it wakes it: the head comes up, the eyes open and it looks around, then it
 * settles back to sleep.
 */
export function buildCat(m: Materials): Cat {
    const g = new THREE.Group()
    g.position.set(CAT.x, CAT.y, CAT.z)
    g.rotation.y = CAT.turn
    g.userData.interactive = 'cat'

    // the curled body breathes as one; its poles run along the spine so the tabby stripes ring the back
    const body = new THREE.Group()
    const torso = sphere(1, m.catFur, 24, 16)
    torso.rotation.z = Math.PI / 2
    torso.scale.set(0.26, 0.5, 0.4)
    torso.position.y = 0.24
    body.add(torso)
    body.add(blob(V(0.3, 0.24, 0.3), m.catFur, V(-0.24, 0.25, -0.1)))
    // tucked front paws
    body.add(blob(V(0.09, 0.05, 0.07), m.catCream, V(0.42, 0.05, 0.04)))
    body.add(blob(V(0.09, 0.05, 0.07), m.catCream, V(0.4, 0.05, 0.18)))
    g.add(body)

    // the tail wraps round the front of the body; its cream tip twitches
    const tailPath = new THREE.CatmullRomCurve3([
        V(-0.5, 0.14, -0.05),
        V(-0.42, 0.07, 0.28),
        V(-0.05, 0.06, 0.44),
        V(0.3, 0.06, 0.4),
    ])
    g.add(new THREE.Mesh(new THREE.TubeGeometry(tailPath, 20, 0.055, 8), m.catFurPlain))
    const tailTip = new THREE.Group()
    tailTip.position.copy(tailPath.getPoint(1))
    const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.12, 4, 8), m.catCream)
    tip.rotation.z = -Math.PI / 2
    tip.position.x = 0.08
    tailTip.add(tip)
    tailTip.rotation.y = 0.35
    g.add(tailTip)

    const head = buildHead(m)
    head.group.position.set(0.36, HEAD_ASLEEP.y, 0.2)
    // a big, cute head, chibi style
    head.group.scale.setScalar(1.3)
    g.add(head.group)

    // the floating z's: each its own material, so each can fade on its own
    const snoreMap = snoreTexture()
    const snores = Array.from({ length: SNORES }, () => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: snoreMap, transparent: true, depthWrite: false }))
        g.add(noShadow(sprite))

        return sprite
    })

    let awake = 0
    // 0 = asleep, 1 = fully alert; eased towards where it should be
    let alert = 0
    let nextTwitch = 2
    let twitch = 0
    let nextFlick = 4
    let flick = 0

    return {
        group: g,
        update: (time, dt) => {
            awake = Math.max(0, awake - dt)
            alert += ((awake > 0 ? 1 : 0) - alert) * Math.min(1, dt * HEAD_EASE)

            // breathing slows and shrinks while it's awake
            const breath = Math.sin((time / BREATH_PERIOD) * Math.PI * 2) * BREATH_SWELL * (1 - alert * 0.6)
            body.scale.set(1, 1 + breath, 1 + breath * 0.6)

            // head: between resting and alert, with a slow look around while awake
            const look = Math.sin(time * 1.6) * 0.35 * alert
            head.group.position.y = THREE.MathUtils.lerp(HEAD_ASLEEP.y, HEAD_AWAKE.y, alert) + breath * 0.3
            head.group.rotation.z = THREE.MathUtils.lerp(HEAD_ASLEEP.tilt, HEAD_AWAKE.tilt, alert)
            head.group.rotation.y = THREE.MathUtils.lerp(HEAD_ASLEEP.turn, HEAD_AWAKE.turn, alert) + look
            head.eyesOpen.visible = alert > 0.5
            head.eyesShut.visible = !head.eyesOpen.visible

            // the tail tip twitches every few seconds (more often when awake)
            if (time >= nextTwitch) {
                twitch = 1
                nextTwitch = time + (awake > 0 ? 0.8 : 3 + Math.random() * 4)
            }

            twitch = Math.max(0, twitch - dt * 2.5)
            tailTip.rotation.y = 0.35 + Math.sin(twitch * Math.PI * 3) * 0.5 * twitch

            // an ear flicks now and then
            if (time >= nextFlick) {
                flick = 1
                nextFlick = time + 4 + Math.random() * 6
            }

            flick = Math.max(0, flick - dt * 5)
            head.ears[0]!.rotation.z = Math.sin(flick * Math.PI) * 0.5

            // the z's rise and fade in turn, and vanish when it wakes
            snores.forEach((sprite, i) => {
                const t = ((time / SNORE_RISE) + i / SNORES) % 1
                sprite.position.set(0.4 + t * 0.2, 0.8 + t * SNORE_HEIGHT, 0.2 + Math.sin(t * Math.PI * 2) * 0.08)
                sprite.scale.setScalar(0.16 + t * 0.16)
                sprite.material.opacity = Math.sin(t * Math.PI) * (1 - alert)
                sprite.visible = alert < 0.95
            })
        },
        wake: () => {
            awake = AWAKE_FOR
            twitch = 1
            flick = 1
        },
    }
}
