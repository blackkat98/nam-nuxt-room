import * as THREE from 'three'
import { V, at, box, cylinder, rod, sphere } from './helpers'
import { std } from './materials'
import { type Clock, buildWatch } from './clock'

/**
 * Where the character stands: in the open floor between the nightstand, the desk chair and the
 * side of the mattress, turned to face the default camera.
 */
const POSITION = V(4.9, 0, 4.1)
const FACING = Math.PI / 4

/** Body build: torso radius and depth, and the matching hip / leg / arm sizes. */
const TORSO_RADIUS = 0.64
const TORSO_DEPTH = 0.8
const HIP_X = 0.33
const SHOULDER_X = 0.74

function palette() {
    return {
        skin: std('#efc19c', { roughness: 0.6 }),
        hair: std('#1c1a1d', { roughness: 0.95 }),
        shirt: std('#363832', { roughness: 0.9 }),
        shorts: std('#1b1b1e', { roughness: 0.85 }),
        eyeWhite: std('#fbfaf7', { roughness: 0.3 }),
        iris: std('#2a1d17', { roughness: 0.3 }),
        mouth: std('#7a2f2c', { roughness: 0.6, side: THREE.DoubleSide }),
        teeth: std('#fbfaf5', { roughness: 0.4 }),
        frame: std('#17171a', { roughness: 0.35 }),
        rim: std('#8a8f96', { metalness: 0.6, roughness: 0.3 }),
        lens: std('#dfeef2', { transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false }),
        watchStrap: std('#1d1d21', { roughness: 0.6 }),
        watchCase: std('#c9ccd1', { metalness: 0.85, roughness: 0.25 }),
        watchDial: std('#f7f4ec', { roughness: 0.35 }),
        watchHands: std('#16161a', { roughness: 0.4 }),
    }
}

type Palette = ReturnType<typeof palette>

/**
 * One arm (temple) of the glasses, for the right side (x is mirrored for the left), in the glasses' own space,
 * which sits 0.05 up and 0.56 forward of the head's centre: the hinge, the point above the front of the ear,
 * over the top of the ear, and the tip hooked down behind it. Every point stays just outside the skull.
 */
const TEMPLE: [number, number, number][] = [
    [0.33, 0.07, 0],
    [0.565, 0.065, -0.48],
    [0.56, 0.03, -0.68],
    [0.54, -0.07, -0.72],
]
const TEMPLE_RADIUS = 0.018

/** Browline glasses: thick black top rims, thin metal lower rims, clear lenses. */
function glasses(p: Palette): THREE.Group {
    const g = new THREE.Group()

    for (const side of [-1, 1]) {
        const cx = side * 0.2
        g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.012, 8, 28), p.rim), cx, 0, 0))
        g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 8, 20, Math.PI), p.frame), cx, 0, 0.005))
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), p.lens)
        lens.userData.noShadow = true
        g.add(at(lens, cx, 0, -0.005))

        // the arm: from the hinge along the side of the head, over the top of the ear, then hooked down behind it
        const arm = TEMPLE.map(([x, y, z]) => V(side * x, y, z))

        for (let i = 1; i < arm.length; i++) {
            g.add(rod(arm[i - 1]!, arm[i]!, TEMPLE_RADIUS, p.frame, 6))
        }

        // round off the bends
        for (const bend of arm.slice(1, -1)) {
            g.add(at(sphere(TEMPLE_RADIUS, p.frame, 6, 4), bend.x, bend.y, bend.z))
        }
    }

    g.add(rod(V(-0.07, 0.04, 0), V(0.07, 0.04, 0), 0.02, p.frame, 6))

    return g
}

/** Buzz cut: a thin shell hugging the top and back of the skull, with the hairline above the forehead. */
function buzzCut(p: Palette): THREE.Group {
    const g = new THREE.Group()
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.575, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), p.hair)
    shell.scale.set(1.0, 1.05, 0.97)
    shell.rotation.x = -0.5
    g.add(at(shell, 0, 0.02, -0.01))

    for (const side of [-1, 1]) {
        g.add(at(box(0.04, 0.16, 0.1, p.hair, 0.015), side * 0.525, 0, 0.1))
    }

    return g
}

interface Head {
    group: THREE.Group
    /** Iris meshes with their resting positions, moved by the gaze controller. */
    irises: { mesh: THREE.Mesh, rest: THREE.Vector3 }[]
    /** Eye whites and irises, squashed vertically to blink. */
    eyes: THREE.Mesh[]
}

function head(p: Palette): Head {
    const g = new THREE.Group()
    const irises: Head['irises'] = []
    const eyes: THREE.Mesh[] = []
    const skull = sphere(0.56, p.skin, 32, 24)
    skull.scale.set(0.98, 1.04, 0.95)
    g.add(skull)

    for (const side of [-1, 1]) {
        const ear = sphere(0.12, p.skin, 12, 8)
        ear.scale.set(0.5, 1, 0.8)
        g.add(at(ear, side * 0.55, -0.02, 0))

        const white = sphere(0.075, p.eyeWhite, 16, 12)
        white.scale.z = 0.5
        g.add(at(white, side * 0.2, 0.05, 0.47))
        const iris = at(sphere(0.045, p.iris, 12, 8), side * 0.2, 0.05, 0.505)
        irises.push({ mesh: iris, rest: iris.position.clone() })
        eyes.push(white, iris)
        g.add(iris)
        const brow = box(0.2, 0.045, 0.05, p.hair, 0.02)
        brow.rotation.z = side * -0.08
        g.add(at(brow, side * 0.2, 0.24, 0.48))
    }

    const nose = sphere(0.075, p.skin, 12, 10)
    nose.scale.set(0.9, 0.8, 1)
    g.add(at(nose, 0, -0.08, 0.53))

    // big open smile with a row of teeth
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20, Math.PI, Math.PI), p.mouth)
    mouth.rotation.x = 0.4
    g.add(at(mouth, 0, -0.22, 0.49))
    const teeth = box(0.24, 0.05, 0.02, p.teeth, 0.01)
    teeth.rotation.x = 0.4
    g.add(at(teeth, 0, -0.235, 0.495))

    g.add(at(glasses(p), 0, 0.05, 0.56))
    g.add(buzzCut(p))

    return { group: g, irises, eyes }
}

const FOREARM_RADIUS = 0.165
/** How the watch face turns from straight ahead towards the outside of the wrist, so the camera can see it. */
const WATCH_TURN = 0.35

/** One arm hanging relaxed along the side of the body; `watch` is strapped on its wrist, just above the hand. */
function arm(p: Palette, side: number, watch?: Clock): THREE.Group {
    const g = new THREE.Group()
    const shoulder = V(side * SHOULDER_X, 4.35, 0)
    const elbow = V(side * (SHOULDER_X + 0.14), 3.35, -0.02)
    const wrist = V(side * (SHOULDER_X + 0.16), 2.5, 0.06)

    g.add(at(sphere(0.26, p.shirt, 16, 12), side * (SHOULDER_X - 0.12), 4.32, 0))
    g.add(rod(shoulder, shoulder.clone().lerp(elbow, 0.45), 0.25, p.shirt, 16))
    g.add(rod(shoulder, elbow, 0.2, p.skin, 14))
    g.add(at(sphere(0.185, p.skin, 14, 10), elbow.x, elbow.y, elbow.z))
    g.add(rod(elbow, wrist, FOREARM_RADIUS, p.skin, 14))

    const hand = box(0.2, 0.36, 0.26, p.skin, 0.09)
    hand.rotation.z = side * 0.05
    g.add(at(hand, wrist.x, wrist.y - 0.18, wrist.z + 0.02))

    if (watch) {
        // on the forearm a little above the wrist joint, clear of the hand
        watch.group.position.copy(wrist).lerp(elbow, 0.12)
        watch.group.rotation.y = side * WATCH_TURN
        g.add(watch.group)
    }

    return g
}

/** A bare foot: a rounded sole block with a row of toes, big toe on the inner side. */
function foot(p: Palette, side: number): THREE.Group {
    const g = new THREE.Group()
    g.add(at(box(0.36, 0.17, 0.66, p.skin, 0.08), 0, 0.085, 0.1))
    // heel and instep, so the foot meets the ankle smoothly
    g.add(at(sphere(0.17, p.skin, 14, 10), 0, 0.17, -0.08))

    const toes = [0.065, 0.05, 0.046, 0.042, 0.038]
    toes.forEach((radius, i) => {
        // big toe nearest the body's centre line, smaller ones towards the outside
        const tx = -side * (0.12 - i * 0.06)
        const tz = 0.43 - i * 0.018
        g.add(at(sphere(radius, p.skin, 10, 8), tx, radius, tz))
    })

    return g
}

/** Black shorts down to just above the knees, bare legs and bare feet: no shoes or socks indoors. */
function legs(p: Palette): THREE.Group {
    const g = new THREE.Group()

    for (const side of [-1, 1]) {
        const x = side * HIP_X
        g.add(at(foot(p, side), x, 0, 0))
        g.add(at(cylinder(0.22, 0.17, 1.55, p.skin, 18), x, 0.15 + 0.775, 0))
        g.add(at(sphere(0.23, p.skin, 16, 12), x, 1.7, 0.02))
        g.add(at(cylinder(0.36, 0.38, 1.1, p.shorts, 20), x, 2.2, 0))
    }

    // hips: an oval that tucks up inside the shirt and stays within the belly line, front and back
    const hips = cylinder(TORSO_RADIUS - 0.02, HIP_X + 0.35, 0.6, p.shorts, 28)
    hips.scale.z = 0.75
    g.add(at(hips, 0, 2.7, 0))

    return g
}

export interface Character {
    group: THREE.Group
    /** Look at a world-space point; `null` relaxes the gaze back to straight ahead. */
    lookAt: (target: THREE.Vector3 | null) => void
    /** Eases the head and eyes towards the current gaze target, and runs the idle breathing and blinking. */
    update: (dt: number) => void
    headWorldPosition: (out: THREE.Vector3) => THREE.Vector3
}

const HEAD_Y = 5.45
/** How much of the look angle the head takes (the eyes do the rest), and the head's turn limits. */
const HEAD_SHARE = 0.55
const HEAD_MAX_YAW = 0.45
const HEAD_MAX_PITCH = 0.25
/** How far the irises can shift from centre, per radian of eye rotation, and the eyes' limits. */
const IRIS_TRAVEL = 0.05
const EYE_MAX_YAW = 0.6
const EYE_MAX_PITCH = 0.5
/** Higher is snappier. */
const GAZE_SPEED = 10

/** Breathing: seconds per breath, how far the upper body rises, and how much the chest swells. */
const BREATH_PERIOD = 4.2
const BREATH_RISE = 0.03
const BREATH_SWELL = 0.018
/** Blinking: seconds between blinks (random in this range), and how long one takes. */
const BLINK_GAP: [number, number] = [2.5, 6]
const BLINK_TIME = 0.16

function clamp(value: number, limit: number): number {
    return Math.max(-limit, Math.min(limit, value))
}

function nextBlinkGap(): number {
    return BLINK_GAP[0] + Math.random() * (BLINK_GAP[1] - BLINK_GAP[0])
}

export function buildCharacter(): Character {
    const p = palette()
    const g = new THREE.Group()
    g.add(legs(p))

    // everything above the waist, so it can rise and fall with each breath
    const upper = new THREE.Group()
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(TORSO_RADIUS, 0.95, 8, 24), p.shirt)
    torso.scale.z = TORSO_DEPTH
    upper.add(at(torso, 0, 3.66, 0))
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 20), p.shirt)
    collar.rotation.x = Math.PI / 2
    upper.add(at(collar, 0, 4.7, 0))
    upper.add(at(cylinder(0.2, 0.22, 0.35, p.skin, 16), 0, 4.85, 0))

    // a wristwatch on the left wrist (+x is the character's left), showing UTC+7 like the wall clock
    const watch = buildWatch({ strap: p.watchStrap, case: p.watchCase, dial: p.watchDial, hands: p.watchHands }, FOREARM_RADIUS)
    upper.add(arm(p, -1), arm(p, 1, watch))
    const { group: headGroup, irises, eyes } = head(p)
    headGroup.rotation.order = 'YXZ'
    upper.add(at(headGroup, 0, HEAD_Y, 0))
    g.add(upper)

    g.position.copy(POSITION)
    g.rotation.y = FACING

    const desired = { yaw: 0, pitch: 0 }
    const current = { yaw: 0, pitch: 0 }
    const local = V()
    const eyeRest = eyes.map(eye => eye.scale.y)
    let clock = 0
    let blinkIn = nextBlinkGap()
    let blinkAge = -1

    const breathe = () => {
        const breath = Math.sin((clock / BREATH_PERIOD) * Math.PI * 2)
        upper.position.y = (breath + 1) * 0.5 * BREATH_RISE
        torso.scale.x = 1 + breath * BREATH_SWELL
        torso.scale.z = TORSO_DEPTH * (1 + breath * BREATH_SWELL * 1.5)
    }

    const blink = (dt: number) => {
        if (blinkAge < 0) {
            blinkIn -= dt

            if (blinkIn <= 0) {
                blinkAge = 0
            }

            return
        }

        blinkAge += dt
        const u = Math.min(blinkAge / BLINK_TIME, 1)
        // shut and open again in one smooth dip, never fully flat
        const open = 1 - Math.sin(u * Math.PI) * 0.9
        eyes.forEach((eye, i) => {
            eye.scale.y = (eyeRest[i] ?? 1) * open
        })

        if (u >= 1) {
            blinkAge = -1
            blinkIn = nextBlinkGap()
        }
    }

    return {
        group: g,
        lookAt: (target) => {
            if (!target) {
                desired.yaw = 0
                desired.pitch = 0

                return
            }

            // target relative to the head, in the body's own (unrotated) space
            g.updateMatrixWorld()
            g.worldToLocal(local.copy(target))
            local.y -= HEAD_Y
            desired.yaw = Math.atan2(local.x, local.z)
            desired.pitch = -Math.atan2(local.y, Math.hypot(local.x, local.z))
        },
        update: (dt) => {
            clock += dt
            watch.update()
            breathe()
            blink(dt)

            const k = 1 - Math.exp(-dt * GAZE_SPEED)
            current.yaw += (desired.yaw - current.yaw) * k
            current.pitch += (desired.pitch - current.pitch) * k

            const headYaw = clamp(current.yaw * HEAD_SHARE, HEAD_MAX_YAW)
            const headPitch = clamp(current.pitch * HEAD_SHARE, HEAD_MAX_PITCH)
            headGroup.rotation.set(headPitch, headYaw, 0)

            const eyeYaw = clamp(current.yaw - headYaw, EYE_MAX_YAW)
            const eyePitch = clamp(current.pitch - headPitch, EYE_MAX_PITCH)

            for (const { mesh, rest } of irises) {
                mesh.position.set(rest.x + eyeYaw * IRIS_TRAVEL, rest.y - eyePitch * IRIS_TRAVEL, rest.z)
            }
        },
        headWorldPosition: out => headGroup.getWorldPosition(out),
    }
}
