<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createIsoCamera } from '~/scene/camera'
import { disposeObject } from '~/scene/helpers'
import { ROOM_HULL, ROOM_TARGET, createRoomScene } from '~/scene/room'

/**
 * How far in front of the character's face (towards the viewer) the gaze target sits.
 * Smaller values make the eyes swing further for the same pointer movement.
 */
const GAZE_DEPTH = 8

const props = defineProps<{
    size: number
    /** The pendant lamp (and with it the room's day / night look). */
    lightsOn: boolean
    /** The PC screen is typing, so the desk keyboard should too. */
    typing?: boolean
    /** Music is playing, so the record player spins. */
    musicPlaying?: boolean
}>()
const emit = defineEmits<{
    /** Horizontal position of the character's head, in px from the canvas' left edge. */
    head: [x: number]
    /** A click (not a drag) landed on something tagged `userData.interactive`; carries that tag. */
    interact: [id: string]
    /** How far along the scene is in starting up, 0 to 1. */
    progress: [fraction: number]
    /** The first frame is on screen. */
    ready: []
}>()

/** A press that moves less than this (px) and is released within CLICK_TIME (ms) is a click, not a drag. */
const CLICK_SLOP = 6
const CLICK_TIME = 600

const hovering = ref(false)

const host = ref<HTMLDivElement | null>(null)
let teardown: (() => void) | undefined
let unmounted = false

/** Lets the browser paint (e.g. the loading bar) before the next heavy step. */
function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve))
}

onMounted(async () => {
    // .client components render their template after mount, so wait a tick for the ref.
    await nextTick()
    const el = host.value

    if (!el) {
        return
    }

    // the page script has loaded and hydrated by now
    emit('progress', 0.35)
    await nextFrame()

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap

    // `?hour=19.5` previews the window at that time of day instead of the visitor's clock
    const hourParam = new URLSearchParams(location.search).get('hour')
    const hour = hourParam === null ? Number.NaN : Number(hourParam)
    const { scene, character, update, setLightsOn, setTyping, setMusicPlaying, poke } = createRoomScene({
        hour: Number.isFinite(hour) ? hour : undefined,
    })
    setLightsOn(props.lightsOn, true)
    const stopLights = watch(() => props.lightsOn, on => setLightsOn(on))
    const stopTyping = watch(() => props.typing, on => setTyping(!!on), { immediate: true })
    const stopMusic = watch(() => props.musicPlaying, on => setMusicPlaying(!!on), { immediate: true })
    // ±45° left/right and down to eye level, so either wall can be viewed square-on.
    const iso = createIsoCamera(ROOM_TARGET, ROOM_HULL, { azimuthRange: Math.PI / 4, polarUp: 0.12, maxPolar: Math.PI / 2 })
    emit('progress', 0.6)
    await nextFrame()

    // compile every shader up front, so the first frame doesn't freeze the page
    await renderer.compileAsync(scene, iso.camera)

    if (unmounted) {
        stopLights()
        stopTyping()
        stopMusic()
        disposeObject(scene)
        renderer.dispose()

        return
    }

    emit('progress', 0.9)
    el.appendChild(renderer.domElement)

    const controls = new OrbitControls(iso.camera, renderer.domElement)
    controls.target.copy(ROOM_TARGET)
    controls.enableZoom = false
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.5
    controls.minAzimuthAngle = iso.minAzimuth
    controls.maxAzimuthAngle = iso.maxAzimuth
    controls.minPolarAngle = iso.minPolar
    controls.maxPolarAngle = iso.maxPolar
    controls.update()

    const stopResize = watch(() => props.size, size => renderer.setSize(size, size), { immediate: true })

    // Gaze tracking: follow the mouse anywhere on the page, but not while the view is being dragged.
    const pointer = new THREE.Vector2()
    let hasPointer = false
    let hoverDirty = false
    let dragging = false

    const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') {
            return
        }

        const rect = renderer.domElement.getBoundingClientRect()
        pointer.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
        )
        hasPointer = true
        hoverDirty = true
    }

    const onDragStart = () => {
        dragging = true
    }

    const onDragEnd = () => {
        dragging = false
    }

    window.addEventListener('pointermove', onPointerMove)
    controls.addEventListener('start', onDragStart)
    controls.addEventListener('end', onDragEnd)

    const raycaster = new THREE.Raycaster()
    const gazePlane = new THREE.Plane()
    const head = new THREE.Vector3()
    const toViewer = new THREE.Vector3()
    const gazeTarget = new THREE.Vector3()

    const updateGaze = () => {
        if (dragging || !hasPointer) {
            character.lookAt(null)

            return
        }

        // A plane facing the camera, a little in front of the face; the pointer's ray hits it
        // straight ahead of the face when the pointer is over the head.
        iso.camera.getWorldDirection(toViewer).negate()
        character.headWorldPosition(head).addScaledVector(toViewer, GAZE_DEPTH)
        gazePlane.setFromNormalAndCoplanarPoint(toViewer, head)
        raycaster.setFromCamera(pointer, iso.camera)
        character.lookAt(raycaster.ray.intersectPlane(gazePlane, gazeTarget))
    }

    // Picking: the first solid thing under the pointer, walked up to an ancestor tagged `userData.interactive`,
    // so whatever stands in front of the TV (e.g. the character) blocks the click.
    const pickRaycaster = new THREE.Raycaster()
    const pickPoint = new THREE.Vector2()

    const isSolid = (object: THREE.Object3D) => {
        const material = (object as THREE.Mesh).material

        return object.visible && !(material instanceof THREE.Material && material.transparent && material.opacity < 0.5)
    }

    const pick = (ndc: THREE.Vector2): string | undefined => {
        if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) {
            return undefined
        }

        pickRaycaster.setFromCamera(ndc, iso.camera)
        const hit = pickRaycaster.intersectObject(scene, true).find(h => isSolid(h.object))

        for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) {
            if (o.userData.interactive) {
                return o.userData.interactive
            }
        }

        return undefined
    }

    const toNdc = (event: PointerEvent, out: THREE.Vector2) => {
        const rect = renderer.domElement.getBoundingClientRect()

        return out.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
        )
    }

    let press: { x: number, y: number, time: number } | undefined

    const onPointerDown = (event: PointerEvent) => {
        press = { x: event.clientX, y: event.clientY, time: performance.now() }
    }

    const onPointerUp = (event: PointerEvent) => {
        const start = press
        press = undefined

        if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP) {
            return
        }

        if (performance.now() - start.time > CLICK_TIME) {
            return
        }

        const id = pick(toNdc(event, pickPoint))

        if (id) {
            poke(id)
            emit('interact', id)
        }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)

    // Hover: one pick per frame at most, and only after the mouse moved.
    const updateHover = () => {
        if (dragging) {
            hovering.value = false

            return
        }

        if (hoverDirty) {
            hoverDirty = false
            hovering.value = !!pick(pointer)
        }
    }

    // Report where the head is on screen (only when it moves) so the speech bubble's tail can follow it.
    const headScreen = new THREE.Vector3()
    let lastHeadX = Number.NaN

    const trackHead = () => {
        character.headWorldPosition(headScreen).project(iso.camera)
        const x = ((headScreen.x + 1) / 2) * props.size

        if (!(Math.abs(x - lastHeadX) < 0.5)) {
            lastHeadX = x
            emit('head', x)
        }
    }

    let last = 0
    let shown = false

    renderer.setAnimationLoop((time) => {
        const dt = last ? Math.min((time - last) / 1000, 0.1) : 0
        last = time
        controls.update()
        trackHead()
        updateHover()
        updateGaze()
        update(time / 1000, dt)
        renderer.render(scene, iso.camera)

        if (!shown) {
            shown = true
            emit('ready')
        }
    })

    teardown = () => {
        stopResize()
        stopLights()
        stopTyping()
        stopMusic()
        window.removeEventListener('pointermove', onPointerMove)
        renderer.domElement.removeEventListener('pointerdown', onPointerDown)
        renderer.domElement.removeEventListener('pointerup', onPointerUp)
        controls.removeEventListener('start', onDragStart)
        controls.removeEventListener('end', onDragEnd)
        renderer.setAnimationLoop(null)
        controls.dispose()
        disposeObject(scene)
        renderer.dispose()
        renderer.domElement.remove()
    }
})

onBeforeUnmount(() => {
    unmounted = true
    teardown?.()
})
</script>

<template>
    <div
        ref="host"
        class="room-canvas"
        :class="{ hovering }"
        :style="{ width: `${size}px`, height: `${size}px` }"
    />
</template>

<style scoped>
.room-canvas {
    cursor: grab;
}

.room-canvas:active {
    cursor: grabbing;
}

.room-canvas.hovering {
    cursor: pointer;
}

.room-canvas :deep(canvas) {
    display: block;
}
</style>
