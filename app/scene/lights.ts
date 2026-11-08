import * as THREE from 'three'
import type { Materials } from './materials'
import { V, at, box, cylinder, noShadow, rod, span, sphere } from './helpers'

/**
 * The wall light switch: on the left wall (x = 0) above the bed, between the top of the pillow and the wall shelf,
 * on the nightstand side.
 */
export const SWITCH = { y: 4.0, z: 6.3 }
/** Rocker tilt; positive tips the top out of the wall, which reads as "off". */
const ROCKER_TILT = 0.16

/** Room ambience with the light on (day) and off (night), blended by the lighting rig. */
const DAY = {
    sky: new THREE.Color('#fff3e8'),
    ground: new THREE.Color('#d39a82'),
    ambient: 1.5,
    keyColor: new THREE.Color('#fff0df'),
    key: 2.2,
    windowColor: new THREE.Color('#ffffff'),
    window: 0.85,
}

const NIGHT = {
    sky: new THREE.Color('#7f8fcc'),
    ground: new THREE.Color('#3b2c40'),
    ambient: 0.6,
    keyColor: new THREE.Color('#9fb2ff'),
    key: 0.5,
    windowColor: new THREE.Color('#8fa8e6'),
    window: 0.3,
}

const BULB_ON = { glow: 2.5, light: 9 }
/** Higher is snappier; the bulb itself reacts faster than the room ambience. */
const AMBIENCE_SPEED = 7
const BULB_SPEED = 30

function pendant(m: Materials): { group: THREE.Group, light: THREE.PointLight } {
    const g = new THREE.Group()
    const x = 6.0
    const z = 3.4
    g.add(rod(V(x, 10.9, z), V(x, 7.75, z), 0.015, m.black, 6))
    g.add(at(cylinder(0.08, 0.12, 0.2, m.black, 16), x, 7.65, z))
    g.add(at(cylinder(0.13, 0.13, 0.06, m.gold, 16), x, 7.53, z))
    const bulb = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.45, 8, 20), m.bulbGlass)
    g.add(noShadow(at(bulb, x, 7.05, z)))
    g.add(noShadow(at(cylinder(0.02, 0.02, 0.5, m.bulb, 6), x, 7.05, z)))
    g.add(noShadow(at(sphere(0.12, m.bulb, 12, 8), x, 6.95, z)))

    const light = new THREE.PointLight('#ffc27a', BULB_ON.light, 14, 1.6)
    g.add(at(light, x, 6.85, z))

    return { group: g, light }
}

/** A white rocker switch plate on the left wall, facing into the room; clicking it toggles the lights. */
function lightSwitch(m: Materials): { group: THREE.Group, rocker: THREE.Mesh } {
    // built facing +z around the origin, then turned to face +x from the left wall
    const g = new THREE.Group()
    g.add(span(-0.26, 0.26, -0.4, 0.4, 0, 0.05, m.white, 0.02))
    g.add(span(-0.15, 0.15, -0.23, 0.23, 0.05, 0.07, m.whiteWarm, 0.01))

    const rocker = box(0.22, 0.36, 0.08, m.white, 0.025)
    g.add(at(rocker, 0, 0, 0.09))

    for (const sy of [-0.31, 0.31]) {
        g.add(at(cylinder(0.025, 0.025, 0.02, m.metal, 8), 0, sy, 0.055).rotateX(Math.PI / 2))
    }

    g.position.set(0, SWITCH.y, SWITCH.z)
    g.rotation.y = Math.PI / 2
    g.userData.interactive = 'light'

    return { group: g, rocker }
}

export interface Lighting {
    /** The pendant lamp and the wall switch, to add to the scene. */
    group: THREE.Group
    /** Turns the pendant on or off, and moves the room between day and night ambience. */
    setLightsOn: (on: boolean, instant?: boolean) => void
    update: (dt: number) => void
    /** How far into night the room is: 0 by day, 1 at night (follows the fade). */
    night: () => number
    /** Light through the window; its colour and strength follow the clock (sky.ts), not the switch. */
    sun: THREE.SpotLight
}

export function buildLighting(scene: THREE.Scene, m: Materials): Lighting {
    const hemi = new THREE.HemisphereLight(DAY.sky, DAY.ground, DAY.ambient)

    // soft key light from the viewer's side so shadows fall onto the walls
    const key = new THREE.DirectionalLight(DAY.keyColor, DAY.key)
    key.position.set(17, 22, 14)
    key.target.position.set(5, 0, 5)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -11
    key.shadow.camera.right = 11
    key.shadow.camera.top = 11
    key.shadow.camera.bottom = -11
    key.shadow.camera.near = 5
    key.shadow.camera.far = 60
    key.shadow.bias = -0.0005
    key.shadow.normalBias = 0.03
    key.shadow.radius = 4

    // daylight (or moonlight) through the window, casting a patch onto the floor; sky.ts sets it from the clock
    const sun = new THREE.SpotLight('#ffdcae', 650, 0, 0.32, 0.6, 2)
    sun.position.set(4.4, 15.4, -6.5)
    sun.target.position.set(4.6, 0, 4.5)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.near = 2
    sun.shadow.camera.far = 40
    sun.shadow.bias = -0.0005
    sun.shadow.normalBias = 0.03
    sun.shadow.radius = 3

    scene.add(hemi, key, key.target, sun, sun.target)

    const lamp = pendant(m)
    const toggle = lightSwitch(m)
    const group = new THREE.Group()
    group.add(lamp.group, toggle.group)

    // 1 = day / bulb on, 0 = night / bulb off
    let ambience = 1
    let bulb = 1
    let target = 1

    const apply = () => {
        hemi.color.lerpColors(NIGHT.sky, DAY.sky, ambience)
        hemi.groundColor.lerpColors(NIGHT.ground, DAY.ground, ambience)
        hemi.intensity = THREE.MathUtils.lerp(NIGHT.ambient, DAY.ambient, ambience)
        key.color.lerpColors(NIGHT.keyColor, DAY.keyColor, ambience)
        key.intensity = THREE.MathUtils.lerp(NIGHT.key, DAY.key, ambience)
        m.windowGlass.emissive.lerpColors(NIGHT.windowColor, DAY.windowColor, ambience)
        m.windowGlass.emissiveIntensity = THREE.MathUtils.lerp(NIGHT.window, DAY.window, ambience)

        lamp.light.intensity = BULB_ON.light * bulb
        m.bulb.emissiveIntensity = BULB_ON.glow * bulb
        toggle.rocker.rotation.x = THREE.MathUtils.lerp(ROCKER_TILT, -ROCKER_TILT, bulb)
    }

    apply()

    return {
        group,
        setLightsOn: (on, instant = false) => {
            target = on ? 1 : 0

            if (instant) {
                ambience = target
                bulb = target
                apply()
            }
        },
        update: (dt) => {
            if (ambience === target && bulb === target) {
                return
            }

            ambience += (target - ambience) * (1 - Math.exp(-dt * AMBIENCE_SPEED))
            bulb += (target - bulb) * (1 - Math.exp(-dt * BULB_SPEED))

            // snap once close enough, so the rig goes idle
            if (Math.abs(target - ambience) < 0.002) {
                ambience = target
            }

            if (Math.abs(target - bulb) < 0.002) {
                bulb = target
            }

            apply()
        },
        night: () => 1 - ambience,
        sun,
    }
}
