import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { Materials } from './materials'
import { V, at, box, cylinder, noShadow, rod, span, sphere } from './helpers'

const DX0 = 5.45
const DX1 = 9.7
const DZ0 = 0.05
const DZ1 = 2.35
const DH = 2.55
/** Height of the desk top, for things standing on it. */
export const DESK_TOP = DH
/** Monitor: centre x, and the centre height of its panel above the desk top. */
const MONITOR = { x: 7.3, panelY: 1.5, panelHeight: 1.7, panelZ: 0.55 }
/** Middle of the monitor's top edge, e.g. for placing a marker above it. */
export const MONITOR_TOP = V(MONITOR.x, DH + MONITOR.panelY + MONITOR.panelHeight / 2, MONITOR.panelZ)
/** The wall clock on the back wall, centred above the monitor (and above the monitor's marker). */
export const WALL_CLOCK = { position: V(MONITOR.x, 6.5, 0), height: 0.8 }
/** The PC tower under the desk: its x / z extent and height. Its front (with the fans) faces +z. */
export const PC_TOWER = { x0: 8.55, x1: 9.38, z0: 0.3, z1: 2.0, height: 2.0 }

export interface Animated {
    group: THREE.Group
    update: (time: number) => void
}

function deskFrame(m: Materials): THREE.Group {
    const g = new THREE.Group()
    const top = 0.18
    const under = DH - top
    g.add(span(DX0, DX1, under, DH, DZ0, DZ1, m.woodLight, 0.06))

    for (const x of [DX0 + 0.16, DX1 - 0.16]) {
        for (const z of [DZ0 + 0.18, DZ1 - 0.18]) {
            g.add(span(x - 0.13, x + 0.13, 0, under, z - 0.13, z + 0.13, m.woodLight, 0.03))
        }
    }

    g.add(span(DX0 + 0.1, DX1 - 0.1, under - 0.32, under, DZ1 - 0.26, DZ1 - 0.1, m.woodLight, 0.02))
    g.add(span(DX0 + 0.06, DX0 + 0.22, under - 0.32, under, DZ0 + 0.1, DZ1 - 0.1, m.woodLight, 0.02))
    g.add(span(DX1 - 0.22, DX1 - 0.06, under - 0.32, under, DZ0 + 0.1, DZ1 - 0.1, m.woodLight, 0.02))
    g.add(span(DX0 + 0.1, DX1 - 0.1, 0.35, 0.47, DZ0 + 0.12, DZ0 + 0.24, m.woodLight, 0.02))

    return g
}

function monitor(m: Materials): THREE.Group {
    const g = new THREE.Group()
    const cx = MONITOR.x
    g.add(span(cx - 0.42, cx + 0.42, DH, DH + 0.05, 0.3, 0.9, m.black, 0.025))
    const neck = box(0.34, 1.0, 0.07, m.black, 0.03)
    neck.rotation.x = -0.12
    g.add(at(neck, cx, DH + 0.52, 0.42))
    g.add(at(box(1.3, 0.9, 0.12, m.black, 0.05), cx, DH + 1.45, 0.47))
    g.add(at(box(2.75, MONITOR.panelHeight, 0.1, m.black, 0.05), cx, DH + MONITOR.panelY, MONITOR.panelZ))
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 1.32), m.monitorScreen)
    g.add(at(screen, cx, DH + 1.62, 0.601))

    return g
}

/** Key presses while the PC is typing: seconds between presses, how long a key stays down, and how far it sinks. */
const KEY_INTERVAL = 0.045
const KEY_DOWN_TIME = 0.1
const KEY_TRAVEL = 0.03
/** One press in this many lands on the space bar. */
const SPACE_ODDS = 7

interface Keyboard {
    group: THREE.Group
    /** Presses random keys while `typing` is on; pressed keys always spring back. */
    update: (dt: number, typing: boolean) => void
}

function keyboard(m: Materials): Keyboard {
    const g = new THREE.Group()
    const kx = 7.25
    const kz = 1.6
    const pitch = 0.128
    const y = DH + 0.115
    g.add(at(box(1.8, 0.09, 0.66, m.keyboard, 0.035), kx, DH + 0.045, kz))

    const positions: THREE.Vector3[] = []

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 13; col++) {
            if (row === 3 && col > 2 && col < 10) {
                continue
            }

            positions.push(V(kx - 6 * pitch + col * pitch, y, kz - 1.5 * pitch + row * pitch))
        }
    }

    const keys = new THREE.InstancedMesh(new RoundedBoxGeometry(0.1, 0.055, 0.1, 2, 0.02), m.keycap, positions.length)
    const matrix = new THREE.Matrix4()
    positions.forEach((p, i) => keys.setMatrixAt(i, matrix.makeTranslation(p)))

    g.add(keys)
    const space = at(box(0.86, 0.055, 0.1, m.keycap, 0.02), kx, y, kz + 1.5 * pitch)
    g.add(space)

    // how far down each key is (0 = up, 1 = fully pressed); the last slot is the space bar
    const down = new Float32Array(positions.length + 1)
    let sincePress = 0

    return {
        group: g,
        update: (dt, typing) => {
            if (typing) {
                sincePress += dt

                while (sincePress >= KEY_INTERVAL) {
                    sincePress -= KEY_INTERVAL
                    const slot = Math.random() * SPACE_ODDS < 1 ? positions.length : Math.floor(Math.random() * positions.length)
                    down[slot] = 1
                }
            }

            let moved = false

            for (let i = 0; i < down.length; i++) {
                const value = down[i] ?? 0

                if (value <= 0) {
                    continue
                }

                const next = Math.max(0, value - dt / KEY_DOWN_TIME)
                down[i] = next
                // stay fully down for the first half, then spring back up
                const sink = Math.min(1, next * 2) * KEY_TRAVEL

                if (i === positions.length) {
                    space.position.y = y - sink
                } else {
                    const p = positions[i]!
                    keys.setMatrixAt(i, matrix.makeTranslation(p.x, p.y - sink, p.z))
                    moved = true
                }
            }

            if (moved) {
                keys.instanceMatrix.needsUpdate = true
            }
        },
    }
}

function mouseAndPad(m: Materials): THREE.Group {
    const g = new THREE.Group()
    g.add(span(8.15, 8.85, DH, DH + 0.015, 1.15, 1.95, m.mousePad))
    const mouse = sphere(1, m.mouse, 20, 12)
    mouse.scale.set(0.14, 0.07, 0.21)
    g.add(at(mouse, 8.5, DH + 0.03, 1.55))

    return g
}

function fan(m: Materials, x: number, y: number, z: number): { group: THREE.Group, rotor: THREE.Group } {
    const group = new THREE.Group()
    group.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 10, 36), m.rgb), x, y, z + 0.02))
    const disc = cylinder(0.25, 0.25, 0.02, m.black, 28)
    disc.rotation.x = Math.PI / 2
    group.add(at(disc, x, y, z))

    const rotor = new THREE.Group()
    rotor.position.set(x, y, z + 0.03)
    const hub = cylinder(0.07, 0.07, 0.04, m.charcoal, 16)
    hub.rotation.x = Math.PI / 2
    rotor.add(hub)

    for (let i = 0; i < 6; i++) {
        const pivot = new THREE.Group()
        pivot.rotation.z = (i / 6) * Math.PI * 2
        const blade = box(0.17, 0.07, 0.01, m.charcoal)
        blade.rotation.x = 0.4
        pivot.add(at(blade, 0.14, 0, 0))
        rotor.add(pivot)
    }

    group.add(rotor)

    return { group, rotor }
}

function pcTower(m: Materials): Animated {
    const g = new THREE.Group()
    const { x0, x1, z0, z1, height: y1 } = PC_TOWER
    const y0 = 0.08
    const xc = (x0 + x1) / 2

    for (const fx of [x0 + 0.1, x1 - 0.1]) {
        for (const fz of [z0 + 0.12, z1 - 0.12]) {
            g.add(span(fx - 0.06, fx + 0.06, 0, y0, fz - 0.06, fz + 0.06, m.black, 0.02))
        }
    }

    // case: back panel, top, bottom, rear, front, and a tempered-glass side
    g.add(span(x0, x0 + 0.05, y0, y1, z0, z1, m.charcoal, 0.02))
    g.add(span(x0, x1, y1 - 0.05, y1, z0, z1, m.charcoal, 0.02))
    g.add(span(x0, x1, y0, y0 + 0.08, z0, z1, m.charcoal, 0.02))
    g.add(span(x0, x1, y0, y1, z0, z0 + 0.05, m.charcoal))
    g.add(span(x0, x1, y0, y1, z1 - 0.06, z1, m.black, 0.02))
    const side = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0 - 0.12, y1 - y0 - 0.14), m.glassDark)
    side.rotation.y = Math.PI / 2
    g.add(noShadow(at(side, x1 - 0.01, (y0 + y1) / 2, (z0 + z1) / 2 - 0.02)))

    // internals
    g.add(span(x0 + 0.05, x0 + 0.08, 0.5, 1.88, z0 + 0.12, z1 - 0.2, m.pcBoard))
    g.add(span(x0 + 0.05, x1 - 0.05, y0 + 0.08, 0.45, z0 + 0.05, z1 - 0.06, m.charcoal))
    g.add(span(x0 + 0.08, x1 - 0.15, 0.7, 0.92, z0 + 0.2, z1 - 0.35, m.charcoal, 0.02))
    g.add(span(x1 - 0.16, x1 - 0.14, 0.76, 0.86, z0 + 0.3, z1 - 0.5, m.rgb))
    const cooler = cylinder(0.18, 0.18, 0.14, m.metal, 20)
    cooler.rotation.z = Math.PI / 2
    g.add(at(cooler, x0 + 0.16, 1.45, 1.0))
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 28), m.rgb)
    ring.rotation.y = Math.PI / 2
    g.add(at(ring, x0 + 0.24, 1.45, 1.0))

    for (const z of [1.38, 1.46]) {
        g.add(span(x0 + 0.08, x0 + 0.22, 1.2, 1.72, z, z + 0.04, m.black))
        g.add(span(x0 + 0.08, x0 + 0.22, 1.72, 1.76, z, z + 0.04, m.rgb))
    }

    // front fans and power LED
    const fans = [fan(m, xc, 0.85, z1), fan(m, xc, 1.5, z1)]
    fans.forEach(f => g.add(f.group))
    g.add(at(sphere(0.03, m.rgb, 8, 6), x1 - 0.12, y1 - 0.12, z1 + 0.01))

    return {
        group: g,
        update: (time) => {
            m.rgb.color.setHSL((time * 0.06) % 1, 0.85, 0.62)
            fans.forEach((f) => {
                f.rotor.rotation.z = -time * 7
            })
        },
    }
}

/** Peak strength of the night-time glows: the monitor's wall backlight, and the PC fans' wash on the floor. */
const BACKLIGHT = 3.5
const FAN_GLOW = 4

interface NightGlow {
    group: THREE.Group
    /** `night` is 0 by day and 1 at night; the glows follow the PC's RGB colour. */
    update: (night: number) => void
}

/**
 * Gamer-room touches that only show at night: an LED strip along the front edge of the desk top, a backlight behind
 * the monitor that paints the wall, and the PC fans' colour spilling onto the floor.
 */
function nightGlow(m: Materials): NightGlow {
    const g = new THREE.Group()
    const strip = new THREE.MeshBasicMaterial({ color: '#000000' })
    g.add(noShadow(span(DX0 + 0.12, DX1 - 0.12, DH - 0.12, DH - 0.07, DZ1, DZ1 + 0.012, strip)))

    const backlight = new THREE.PointLight('#ffffff', 0, 4, 1.8)
    backlight.position.set(MONITOR.x, DH + MONITOR.panelY + 0.2, 0.18)
    const fanGlow = new THREE.PointLight('#ffffff', 0, 4, 1.6)
    fanGlow.position.set(8.97, 0.9, 2.55)
    g.add(backlight, fanGlow)

    return {
        group: g,
        update: (night) => {
            backlight.color.copy(m.rgb.color)
            fanGlow.color.copy(m.rgb.color)
            backlight.intensity = BACKLIGHT * night
            fanGlow.intensity = FAN_GLOW * night
            // a dim coloured line by day, a bright one at night
            strip.color.copy(m.rgb.color).multiplyScalar(0.25 + 0.75 * night)
        },
    }
}

export interface Desk {
    group: THREE.Group
    /** `night` is 0 by day and 1 at night; `typing` makes the keyboard keys go. */
    update: (time: number, dt: number, night: number, typing: boolean) => void
}

/** Backrest outline: narrower at the bottom, with a rounded top. */
function backrestShape(): THREE.Shape {
    const shape = new THREE.Shape()
    shape.moveTo(-0.46, 0)
    shape.quadraticCurveTo(0, -0.08, 0.46, 0)
    shape.lineTo(0.56, 0.95)
    shape.quadraticCurveTo(0.58, 1.3, 0, 1.32)
    shape.quadraticCurveTo(-0.58, 1.3, -0.56, 0.95)
    shape.lineTo(-0.46, 0)

    return shape
}

function slab(shape: THREE.Shape, depth: number, bevel: number, material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 4,
        curveSegments: 24,
    })
    geometry.translate(0, 0, -depth / 2)

    return new THREE.Mesh(geometry, material)
}

/** Closed loop armrest, built in the chair's local space (front of the chair is -z). */
function loopArm(m: Materials, side: number): THREE.Group {
    const g = new THREE.Group()
    const x = side * 0.72
    const outline: [number, number][] = [
        [1.5, 0.3],
        [1.85, 0.38],
        [2.2, 0.25],
        [2.25, -0.1],
        [2.2, -0.42],
        [1.98, -0.48],
        [1.75, -0.3],
        [1.52, -0.05],
    ]
    const curve = new THREE.CatmullRomCurve3(outline.map(([y, z]) => V(x, y, z)), true, 'centripetal')
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.055, 10, true), m.black))
    g.add(at(box(0.16, 0.06, 0.55, m.black, 0.03), x, 2.27, -0.1))
    g.add(at(box(0.25, 0.1, 0.45, m.black, 0.03), side * 0.62, 1.4, 0.12))

    return g
}

/** Office task chair: fabric seat and back, loop arms, gas lift and a five-star base on casters. */
function chair(m: Materials): THREE.Group {
    const g = new THREE.Group()
    g.position.set(7.35, 0, 3.2)
    g.rotation.y = 0.18

    // five-star base with casters
    g.add(at(cylinder(0.16, 0.18, 0.16, m.black, 20), 0, 0.3, 0))

    for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Group()
        spoke.rotation.y = -((i / 5) * Math.PI * 2 + 0.3)
        const leg = box(0.85, 0.09, 0.13, m.black, 0.04)
        leg.rotation.z = -0.08
        spoke.add(at(leg, 0.48, 0.28, 0))
        spoke.add(at(box(0.13, 0.11, 0.15, m.black, 0.04), 0.88, 0.24, 0))
        spoke.add(at(sphere(0.06, m.charcoal, 12, 8), 0.9, 0.17, 0))
        const wheel = cylinder(0.085, 0.085, 0.09, m.charcoal, 18)
        wheel.rotation.x = Math.PI / 2
        spoke.add(at(wheel, 0.94, 0.085, 0))
        g.add(spoke)
    }

    // gas lift, mechanism and height lever
    g.add(at(cylinder(0.1, 0.11, 0.55, m.black, 18), 0, 0.6, 0))
    g.add(at(cylinder(0.065, 0.065, 0.45, m.charcoal, 16), 0, 1.05, 0))
    g.add(at(box(0.5, 0.12, 0.55, m.black, 0.03), 0, 1.31, 0))
    g.add(rod(V(0.25, 1.3, -0.1), V(0.72, 1.2, -0.22), 0.025, m.black, 8))
    g.add(at(sphere(0.055, m.black, 12, 8), 0.74, 1.2, -0.23))

    // seat: black shell under a thick fabric cushion
    g.add(at(box(1.3, 0.1, 1.22, m.black, 0.05), 0, 1.42, -0.02))
    g.add(at(box(1.28, 0.22, 1.2, m.chairFabric, 0.1), 0, 1.57, -0.02))

    // back bracket and backrest
    g.add(span(-0.09, 0.09, 1.3, 1.4, 0.3, 0.92, m.black, 0.03))
    g.add(span(-0.09, 0.09, 1.3, 2.3, 0.84, 0.94, m.black, 0.03))
    const back = new THREE.Group()
    back.position.set(0, 1.85, 0.68)
    back.rotation.x = 0.1
    back.add(slab(backrestShape(), 0.12, 0.06, m.chairFabric))
    back.add(at(slab(backrestShape(), 0.03, 0.03, m.black), 0, 0, 0.13))
    g.add(back)

    g.add(loopArm(m, -1), loopArm(m, 1))

    return g
}

export function buildDesk(m: Materials): Desk {
    const g = new THREE.Group()
    const pc = pcTower(m)
    const screen = monitor(m)
    const keys = keyboard(m)
    const glow = nightGlow(m)
    // the monitor opens the code editor; the tower opens a look inside the case
    screen.userData.interactive = 'pc'
    pc.group.userData.interactive = 'case'
    g.add(deskFrame(m), screen, keys.group, mouseAndPad(m), pc.group, chair(m), glow.group)

    return {
        group: g,
        update: (time, dt, night, typing) => {
            pc.update(time)
            keys.update(dt, typing)
            glow.update(night)
        },
    }
}
