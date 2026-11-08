import * as THREE from 'three'
import type { Materials } from './materials'
import { V, at, box, cylinder, rod, span, sphere } from './helpers'
import { DESK_TOP } from './desk'

/** The turntable on the left end of the desk: centre of the platter. */
export const RECORD_PLAYER = { x: 5.88, z: 0.8 }
/** The phone lying on the quilt, near the pillow. */
export const PHONE = { x: 3.0, y: 2.0, z: 8.2 }

/** 33⅓ rpm, in radians per second, and how quickly the platter and tonearm get there (higher is snappier). */
const SPIN_SPEED = (33.3 / 60) * Math.PI * 2
const SPIN_EASE = 2.5
const ARM_EASE = 4
/** Tonearm swing around its post: parked beside the platter, and resting on the record. */
const ARM_PARKED = 0.12
const ARM_PLAYING = -0.45

export interface RecordPlayer {
    group: THREE.Group
    /** Spins the record up and lowers the arm onto it, or parks the arm and lets the record spin down. */
    setPlaying: (playing: boolean) => void
    update: (dt: number) => void
}

/** How quickly the glow ring under the platter fades in and out (higher is snappier). */
const GLOW_EASE = 3
const LED_OFF = new THREE.Color('#3a3a3a')

/**
 * A modern minimalist turntable: a slim matte white plinth on small feet, an aluminium platter with a light ring
 * underneath that glows in the PC's RGB colour while it plays, and a straight tonearm that swings over the record.
 */
export function buildRecordPlayer(m: Materials): RecordPlayer {
    const g = new THREE.Group()
    const { x, z } = RECORD_PLAYER
    const feet = 0.03
    const base = DESK_TOP + feet + 0.06

    for (const fx of [x - 0.29, x + 0.43]) {
        for (const fz of [z - 0.32, z + 0.32]) {
            g.add(at(cylinder(0.035, 0.035, feet, m.black, 12), fx, DESK_TOP + feet / 2, fz))
        }
    }

    g.add(span(x - 0.35, x + 0.49, DESK_TOP + feet, base, z - 0.38, z + 0.38, m.deviceWhite, 0.025))

    // light ring around the foot of the platter
    const glowMaterial = new THREE.MeshBasicMaterial({ color: LED_OFF })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.308, 0.016, 6, 48), glowMaterial)
    ring.rotation.x = Math.PI / 2
    g.add(at(ring, x, base + 0.004, z))
    g.add(at(cylinder(0.3, 0.3, 0.03, m.metal, 48), x, base + 0.015, z))

    // the record spins as one piece; the off-centre dot on the label makes the spin readable
    const record = new THREE.Group()
    record.position.set(x, base + 0.036, z)
    record.add(cylinder(0.285, 0.285, 0.012, m.vinyl, 40))

    for (const radius of [0.17, 0.215, 0.255]) {
        const groove = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.004, 4, 48), m.vinylGroove)
        groove.rotation.x = Math.PI / 2
        record.add(at(groove, 0, 0.007, 0))
    }

    record.add(at(cylinder(0.095, 0.095, 0.014, m.recordLabel, 28), 0, 0.001, 0))
    record.add(at(sphere(0.018, m.white, 8, 6), 0.055, 0.008, 0))
    record.add(at(cylinder(0.008, 0.008, 0.05, m.metal, 8), 0, 0.02, 0))
    g.add(record)

    // tonearm: a slim black post at the back right with a straight arm swinging around it
    const pivotX = x + 0.37
    const pivotZ = z - 0.3
    g.add(at(cylinder(0.04, 0.045, 0.08, m.black, 20), pivotX, base + 0.04, pivotZ))
    g.add(at(cylinder(0.03, 0.03, 0.012, m.metal, 20), pivotX, base + 0.086, pivotZ))
    const arm = new THREE.Group()
    arm.position.set(pivotX, base + 0.1, pivotZ)
    arm.add(rod(V(0, 0, -0.1), V(0, 0, 0.42), 0.008, m.black, 8))
    arm.add(rod(V(0, 0, 0.42), V(0, -0.03, 0.42), 0.008, m.black, 6))
    arm.add(at(box(0.04, 0.022, 0.08, m.black, 0.008), 0, -0.04, 0.44))
    const weight = cylinder(0.03, 0.03, 0.06, m.black, 16)
    weight.rotation.x = Math.PI / 2
    arm.add(at(weight, 0, 0, -0.12))
    arm.rotation.y = ARM_PARKED
    g.add(arm)

    // two small status LEDs on the front edge
    const led = new THREE.MeshBasicMaterial({ color: LED_OFF })
    g.add(at(sphere(0.012, led, 8, 6), x + 0.3, base, z + 0.33))
    g.add(at(sphere(0.012, m.charcoal, 8, 6), x + 0.36, base, z + 0.33))

    g.userData.interactive = 'music'

    let playing = false
    let speed = 0
    let glow = 0

    return {
        group: g,
        setPlaying: (on) => {
            playing = on
            led.color.set(on ? '#4ade80' : LED_OFF)
        },
        update: (dt) => {
            speed += ((playing ? SPIN_SPEED : 0) - speed) * (1 - Math.exp(-dt * SPIN_EASE))
            record.rotation.y -= speed * dt
            const target = playing ? ARM_PLAYING : ARM_PARKED
            arm.rotation.y += (target - arm.rotation.y) * (1 - Math.exp(-dt * ARM_EASE))
            glow += ((playing ? 1 : 0) - glow) * (1 - Math.exp(-dt * GLOW_EASE))
            glowMaterial.color.lerpColors(LED_OFF, m.rgb.color, glow)
        },
    }
}

/** A phone lying face up on the bed, lock screen glowing; clicking it opens the contact links. */
export function buildPhone(m: Materials): THREE.Group {
    const g = new THREE.Group()
    g.add(at(box(0.44, 0.05, 0.86, m.black, 0.05), 0, 0.025, 0))
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.78), m.phoneScreen)
    screen.rotation.x = -Math.PI / 2
    g.add(at(screen, 0, 0.0515, 0))
    g.position.set(PHONE.x, PHONE.y, PHONE.z)
    g.rotation.y = 0.55
    g.userData.interactive = 'phone'

    return g
}

/** The game controller on the right end of the desk, opposite the record player: its centre on the desk. */
export const GAMEPAD = { x: 9.05, z: 0.8 }

/**
 * A generic game controller lying on the desk, its front turned towards the room: two grips, twin sticks, a
 * d-pad, four coloured face buttons, shoulder bumpers and a home button lit in the PC's RGB colour.
 */
export function buildGamepad(m: Materials): THREE.Group {
    const g = new THREE.Group()
    g.position.set(GAMEPAD.x, DESK_TOP, GAMEPAD.z)
    g.rotation.y = 0.6
    // the controller faces +z

    g.add(at(box(0.46, 0.1, 0.26, m.gamepad, 0.05), 0, 0.07, 0))

    for (const side of [-1, 1]) {
        // a grip sweeping down and back towards the player
        const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.16, 4, 12), m.gamepad)
        grip.rotation.set(Math.PI / 2 - 0.25, side * 0.35, 0)
        g.add(at(grip, side * 0.2, 0.07, 0.1))
        // shoulder bumper
        g.add(at(box(0.14, 0.04, 0.05, m.padDark, 0.015), side * 0.15, 0.1, -0.13))
        // thumbstick: a well, then the cap
        g.add(at(cylinder(0.045, 0.045, 0.02, m.padDark, 16), side * 0.08, 0.125, 0.07))
        g.add(at(cylinder(0.038, 0.034, 0.035, m.gamepad, 16), side * 0.08, 0.15, 0.07))
    }

    // d-pad on the left
    g.add(at(box(0.1, 0.022, 0.032, m.padDark, 0.008), -0.15, 0.128, -0.02))
    g.add(at(box(0.032, 0.022, 0.1, m.padDark, 0.008), -0.15, 0.128, -0.02))

    // face buttons on the right, in a diamond
    const buttons: [THREE.Material, number, number][] = [
        [m.padGreen, 0, 0.042],
        [m.padRed, 0.042, 0],
        [m.padBlue, -0.042, 0],
        [m.padYellow, 0, -0.042],
    ]

    for (const [material, dx, dz] of buttons) {
        const button = sphere(0.019, material, 12, 8)
        button.scale.y = 0.6
        g.add(at(button, 0.15 + dx, 0.124, -0.02 + dz))
    }

    // home button
    g.add(at(sphere(0.024, m.rgb, 14, 10), 0, 0.124, -0.075))
    g.userData.interactive = 'game'

    return g
}
