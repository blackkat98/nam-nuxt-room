import * as THREE from 'three'
import { V } from './helpers'
import { createMaterials } from './materials'
import { buildShell } from './shell'
import { buildLogos } from './logos'
import { buildBed } from './bed'
import { TV_TOP, buildNightstand, buildShelf } from './storage'
import { DESK_TOP, MONITOR_TOP, PC_TOWER, WALL_CLOCK, buildDesk } from './desk'
import { buildDigitalClock } from './clock'
import { KNIGHT, buildDecor } from './decor'
import { BACKPACK, buildFloorItems } from './floor-items'
import { SWITCH, buildLighting } from './lights'
import { type Character, buildCharacter } from './character'
import { createMarker } from './marker'
import { GAMEPAD, PHONE, RECORD_PLAYER, buildGamepad, buildPhone, buildRecordPlayer } from './extras'
import { CAT, buildCat } from './cat'
import { buildSky } from './sky'

/** The point the camera orbits around. */
export const ROOM_TARGET = V(4.85, 4.3, 4.85)

/** Outline points of the model, used to fit the camera so nothing is cropped. */
export const ROOM_HULL: THREE.Vector3[] = [
    V(-0.6, -1.1, -0.6),
    V(10.45, -1.1, -0.6),
    V(-0.6, -1.1, 10.55),
    V(10.55, -1.1, 10.55),
    V(10.55, 0, 10.55),
    V(10.55, 0, -0.6),
    V(-0.6, 0, 10.55),
    V(-0.8, 9.5, -0.8),
    V(10.12, 9.5, -0.8),
    V(-0.8, 9.5, 10.12),
    V(10.12, 9.5, 0.25),
    V(0.25, 9.5, 10.12),
    V(6.0, 10.9, 3.4),
]

export interface RoomScene {
    scene: THREE.Scene
    character: Character
    /** `time` and `dt` are in seconds. */
    update: (time: number, dt: number) => void
    /** Pendant on/off, with the room's day/night ambience; `instant` skips the fade. */
    setLightsOn: (on: boolean, instant?: boolean) => void
    /** While on, the desk keyboard's keys press away (matches the PC screen typing). */
    setTyping: (typing: boolean) => void
    /** Spins the record player (it only animates; the music itself plays in the page). */
    setMusicPlaying: (playing: boolean) => void
    /** Lets things in the room react to being clicked (e.g. the cat wakes up); `id` is the clicked tag. */
    poke: (id: string) => void
}

export interface RoomOptions {
    /** Fixes the time of day shown through the window (0 - 24); otherwise the visitor's local clock is used. */
    hour?: number
}

/** How often the window re-checks the clock, in seconds. */
const CLOCK_CHECK = 30

/** Plant sway: radians of tilt, and speed (radians of phase per second). */
const SWAY_ANGLE = 0.022
const SWAY_SPEED = 0.9

function localHour(): number {
    const now = new Date()

    return now.getHours() + now.getMinutes() / 60
}

export function createRoomScene(options: RoomOptions = {}): RoomScene {
    const scene = new THREE.Scene()
    const m = createMaterials()
    const desk = buildDesk(m)
    const character = buildCharacter()
    const lighting = buildLighting(scene, m)
    const sky = buildSky(m, lighting.sun)
    const recordPlayer = buildRecordPlayer(m)
    const wallClock = buildDigitalClock(m.black, WALL_CLOCK.position, WALL_CLOCK.height)
    const hourNow = () => options.hour ?? localHour()
    sky.setHour(hourNow())
    // Spinning "click me" markers over interactive things.
    const markers = [
        createMarker(TV_TOP.clone().add(V(0, 0.35, 0)), { interactive: 'tv' }),
        createMarker(MONITOR_TOP.clone().add(V(0, 0.35, 0)), { interactive: 'pc', phase: 1.1 }),
        // the tower sits under the desk, so its marker floats in front of it and points back at it
        createMarker(V((PC_TOWER.x0 + PC_TOWER.x1) / 2, PC_TOWER.height * 0.55, PC_TOWER.z1 + 0.3), {
            interactive: 'case',
            size: 0.45,
            phase: 0.9,
            direction: V(0, 0, -1),
        }),
        // smaller, and held off the wall so it doesn't clip into it while spinning
        createMarker(V(0.4, SWITCH.y + 0.7, SWITCH.z), { interactive: 'light', size: 0.4, phase: 2.3 }),
        createMarker(V(0.5, 7.55, 4.4), { interactive: 'poster:0', size: 0.45, phase: 0.6 }),
        createMarker(V(RECORD_PLAYER.x + 0.07, DESK_TOP + 0.75, RECORD_PLAYER.z), { interactive: 'music', size: 0.45, phase: 1.7 }),
        createMarker(V(BACKPACK.x, BACKPACK.height + 0.5, BACKPACK.z), { interactive: 'cv', phase: 2.9 }),
        createMarker(V(PHONE.x, PHONE.y + 0.65, PHONE.z), { interactive: 'phone', size: 0.45, phase: 0.3 }),
        createMarker(V(CAT.x, CAT.y + 1.35, CAT.z), { interactive: 'cat', size: 0.45, phase: 1.4 }),
        createMarker(V(GAMEPAD.x, DESK_TOP + 0.75, GAMEPAD.z), { interactive: 'game', size: 0.4, phase: 2.6 }),
        createMarker(KNIGHT.clone().add(V(0, 1.1, 0)), { interactive: 'chess', size: 0.35, phase: 2.1 }),
    ]

    const logos = buildLogos()
    const cat = buildCat(m)

    scene.add(
        buildShell(m),
        logos.group,
        buildBed(m),
        buildNightstand(m),
        buildShelf(m),
        desk.group,
        buildDecor(m),
        buildFloorItems(m),
        recordPlayer.group,
        wallClock.group,
        buildPhone(m),
        buildGamepad(m),
        cat.group,
        lighting.group,
        character.group,
        ...markers.map(marker => marker.group),
    )

    // things tagged `userData.sway` (a phase) rock gently around their own origin, like plants in a draught
    const swaying: THREE.Object3D[] = []

    scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.castShadow = !object.userData.noShadow
            object.receiveShadow = true
        }

        if (typeof object.userData.sway === 'number') {
            swaying.push(object)
        }
    })

    let typing = false
    let nextClockCheck = CLOCK_CHECK

    return {
        scene,
        character,
        update: (time, dt) => {
            lighting.update(dt)
            desk.update(time, dt, lighting.night(), typing)
            logos.update(lighting.night())
            character.update(dt)
            recordPlayer.update(dt)
            cat.update(time, dt)
            wallClock.update()

            if (time >= nextClockCheck) {
                nextClockCheck = time + CLOCK_CHECK
                sky.setHour(hourNow())
            }

            for (const marker of markers) {
                marker.update(time)
            }

            for (const object of swaying) {
                const phase = time * SWAY_SPEED + object.userData.sway
                object.rotation.z = Math.sin(phase) * SWAY_ANGLE
                object.rotation.x = Math.sin(phase * 0.77 + 1.3) * SWAY_ANGLE * 0.7
            }
        },
        setLightsOn: lighting.setLightsOn,
        setTyping: (on) => {
            typing = on
        },
        setMusicPlaying: recordPlayer.setPlaying,
        poke: (id) => {
            if (id === 'cat') {
                cat.wake()
            }
        },
    }
}
