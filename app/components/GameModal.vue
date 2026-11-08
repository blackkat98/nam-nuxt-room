<script setup lang="ts">
/**
 * "Dream Cat", a tiny 8-bit arcade game opened from the controller on the desk: move the cat along the floor to
 * catch falling fish and dodge the cucumbers. Plays with the arrow keys (or A / D), the on-screen buttons,
 * dragging on the screen, or a real gamepad. The best score is kept in this browser.
 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

/** The handheld's width, never wider than the viewport. */
const GAME_WIDTH = 'min(100%, 560px)'

/** The game's own resolution; the canvas is scaled up with crisp pixels. */
const W = 256
const H = 192
/** Sprites are drawn at this many screen pixels per sprite pixel. */
const PX = 2
const FLOOR_Y = H - 16
const CAT_SPEED = 150
const LIVES = 3
/** Spawning gets faster and items fall quicker as the run goes on, up to these limits. */
const SPAWN_START = 0.9
const SPAWN_MIN = 0.35
const FALL_START = 50
const FALL_MAX = 170
/** Seconds of blinking after a cucumber hit, during which another hit doesn't count. */
const HURT_TIME = 1
const BEST_KEY = 'nuxt-room-dream-cat-best'

/** Sprites as rows of palette letters ('.' is empty). */
const SPRITES = {
    cat: [
        '..O..........O..',
        '.OOO........OOO.',
        '.OOOO......OOOO.',
        '.OOOOOOOOOOOOOO.',
        'OOOOOOOOOOOOOOOO',
        'OOOKOOOOOOOOKOOO',
        'OOOOOOOPPOOOOOOO',
        'OOOOOCCCCCCOOOOO',
        '.OOOOOCCCCOOOOO.',
        '..OOOOOOOOOOOO..',
        '..OSOOSOOSOOSO..',
        '..CC........CC..',
    ],
    fish: [
        '....FFFF....',
        '..FFFFFFF..F',
        '.FKFFFFFFFFF',
        'FFFFFFFFFFFF',
        '.FFFFFFFF..F',
        '...FFFF.....',
    ],
    cuke: [
        '..GG..',
        '.GGGG.',
        '.GLGG.',
        '.GGGG.',
        '.GGLG.',
        '.GGGG.',
        '.GLGG.',
        '.GGGG.',
        '.GGLG.',
        '.GGGG.',
        '.GGGG.',
        '..GG..',
    ],
    heart: [
        '.RR.RR.',
        'RRRRRRR',
        'RRRRRRR',
        '.RRRRR.',
        '..RRR..',
        '...R...',
    ],
}
const PALETTE: Record<string, string> = {
    O: '#e8913f',
    S: '#b8642a',
    K: '#1b1b1e',
    P: '#e98b8b',
    C: '#f7e6cc',
    F: '#7cc4ff',
    G: '#3f8f3a',
    L: '#a6dd7a',
    R: '#ff4d6d',
}
/** The golden fish is the blue one recoloured. */
const GOLD: Record<string, string> = { ...PALETTE, F: '#ffd34d' }

type Kind = 'fish' | 'gold' | 'cuke'

interface Item {
    kind: Kind
    x: number
    y: number
    vy: number
}

interface Popup {
    text: string
    x: number
    y: number
    age: number
}

const { play } = useSound()
const screen = ref<HTMLCanvasElement | null>(null)
const state = ref<'title' | 'play' | 'over'>('title')
const score = ref(0)
const best = ref(0)
const newBest = ref(false)

let catX = W / 2
let lives = LIVES
let hurt = 0
let elapsed = 0
let spawnIn = 0
let items: Item[] = []
let popups: Popup[] = []
/** Where a finger or the mouse is dragging the cat to, if anywhere. */
let dragX: number | undefined
let frame = 0
let last = 0
let clock = 0

/** Directions held down, from keys, the on-screen buttons and the gamepad. */
const held = { left: false, right: false }
const keys = { left: false, right: false }
const pad = { left: false, right: false, start: false }

/** A few fixed stars for the night-sky backdrop. */
const STARS = Array.from({ length: 28 }, (_, i) => ({ x: (i * 97) % W, y: (i * 53) % (FLOOR_Y - 40) + 18 }))

function size(sprite: string[]): { w: number, h: number } {
    return { w: (sprite[0]?.length ?? 0) * PX, h: sprite.length * PX }
}

function draw(ctx: CanvasRenderingContext2D, sprite: string[], x: number, y: number, palette = PALETTE) {
    sprite.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
            const color = palette[row[i]!]

            if (color) {
                ctx.fillStyle = color
                ctx.fillRect(Math.round(x) + i * PX, Math.round(y) + j * PX, PX, PX)
            }
        }
    })
}

function loadBest() {
    try {
        best.value = Number(localStorage.getItem(BEST_KEY)) || 0
    } catch {
        best.value = 0
    }
}

function saveBest() {
    try {
        localStorage.setItem(BEST_KEY, String(best.value))
    } catch {
        // storage blocked: the best score just won't stick
    }
}

function start() {
    play('start')
    state.value = 'play'
    score.value = 0
    newBest.value = false
    catX = W / 2
    lives = LIVES
    hurt = 0
    elapsed = 0
    spawnIn = 0.5
    items = []
    popups = []
}

function gameOver() {
    play('over')
    state.value = 'over'
    // clear the sky, so the game-over screen isn't cluttered with frozen fish
    items = []

    if (score.value > best.value) {
        best.value = score.value
        newBest.value = true
        saveBest()
    }
}

function pressStart() {
    if (state.value !== 'play') {
        start()
    }
}

function spawn() {
    const roll = Math.random()
    const cukeOdds = Math.min(0.28 + elapsed * 0.004, 0.45)
    const kind: Kind = roll < cukeOdds ? 'cuke' : roll < cukeOdds + 0.07 ? 'gold' : 'fish'
    const { w } = size(kind === 'cuke' ? SPRITES.cuke : SPRITES.fish)
    const fall = Math.min(FALL_START + elapsed * 2.2, FALL_MAX)
    items.push({ kind, x: 4 + Math.random() * (W - w - 8), y: -24, vy: fall + Math.random() * 20 })
}

function pollGamepad() {
    const gamepad = navigator.getGamepads?.().find(Boolean)
    const wasStart = pad.start

    if (!gamepad) {
        pad.left = pad.right = pad.start = false

        return
    }

    const axis = gamepad.axes[0] ?? 0
    pad.left = axis < -0.3 || !!gamepad.buttons[14]?.pressed
    pad.right = axis > 0.3 || !!gamepad.buttons[15]?.pressed
    pad.start = !!gamepad.buttons[0]?.pressed || !!gamepad.buttons[9]?.pressed

    // start on the press, not while it's held
    if (pad.start && !wasStart) {
        pressStart()
    }
}

function update(dt: number) {
    clock += dt
    pollGamepad()

    for (const popup of popups) {
        popup.age += dt
        popup.y -= dt * 20
    }

    popups = popups.filter(popup => popup.age < 0.8)

    if (state.value !== 'play') {
        return
    }

    elapsed += dt
    hurt = Math.max(0, hurt - dt)

    // move: held directions win; otherwise follow a drag
    const cat = size(SPRITES.cat)
    const left = keys.left || held.left || pad.left
    const right = keys.right || held.right || pad.right

    if (left !== right) {
        catX += (right ? 1 : -1) * CAT_SPEED * dt
    } else if (dragX !== undefined) {
        const step = CAT_SPEED * 1.4 * dt
        catX += Math.max(-step, Math.min(step, dragX - catX))
    }

    catX = Math.max(cat.w / 2, Math.min(W - cat.w / 2, catX))

    spawnIn -= dt

    if (spawnIn <= 0) {
        spawn()
        spawnIn = Math.max(SPAWN_MIN, SPAWN_START - elapsed * 0.012)
    }

    const catTop = FLOOR_Y - cat.h

    items = items.filter((item) => {
        item.y += item.vy * dt
        const box = size(item.kind === 'cuke' ? SPRITES.cuke : SPRITES.fish)
        const centre = item.x + box.w / 2
        const caught = item.y + box.h >= catTop + 4 && item.y < FLOOR_Y && Math.abs(centre - catX) < (cat.w + box.w) / 2 - 4

        if (caught) {
            if (item.kind === 'cuke') {
                if (hurt === 0) {
                    lives--
                    hurt = HURT_TIME
                    play('hurt')
                    popups.push({ text: 'EEK!', x: catX, y: catTop - 4, age: 0 })

                    if (lives <= 0) {
                        gameOver()
                    }
                }
            } else {
                const points = item.kind === 'gold' ? 5 : 1
                play(item.kind === 'gold' ? 'gold' : 'catch')
                score.value += points
                popups.push({ text: `+${points}`, x: centre, y: catTop - 4, age: 0 })
            }

            return false
        }

        return item.y < H
    })
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size = 8, color = '#ffffff', align: CanvasTextAlign = 'center') {
    ctx.font = `${size}px 'Press Start 2P', ui-monospace, monospace`
    ctx.textAlign = align
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#1b1b1e'
    ctx.fillText(value, x + 1, y + 1)
    ctx.fillStyle = color
    ctx.fillText(value, x, y)
}

function render() {
    const ctx = screen.value?.getContext('2d')

    if (!ctx) {
        return
    }

    // night sky, stars, and the floorboards
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR_Y)
    sky.addColorStop(0, '#1d1b3a')
    sky.addColorStop(1, '#3d2f5c')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'

    for (const star of STARS) {
        ctx.fillRect(star.x, star.y, 1, 1)
    }

    ctx.fillStyle = '#8a5a3c'
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y)
    ctx.fillStyle = '#6b4430'

    for (let x = 0; x < W; x += 32) {
        ctx.fillRect(x, FLOOR_Y, 1, H - FLOOR_Y)
    }

    for (const item of items) {
        draw(ctx, item.kind === 'cuke' ? SPRITES.cuke : SPRITES.fish, item.x, item.y, item.kind === 'gold' ? GOLD : PALETTE)
    }

    const cat = size(SPRITES.cat)

    // the cat blinks while it's recovering from a cucumber
    if (state.value === 'play' && !(hurt > 0 && Math.floor(clock * 10) % 2)) {
        draw(ctx, SPRITES.cat, catX - cat.w / 2, FLOOR_Y - cat.h)
    }

    for (const popup of popups) {
        text(ctx, popup.text, popup.x, popup.y, 8, popup.text === 'EEK!' ? '#a6dd7a' : '#ffd34d')
    }

    // the score, the best and the lives
    text(ctx, `SCORE ${score.value}`, 6, 6, 8, '#ffffff', 'left')
    text(ctx, `BEST ${best.value}`, 6, 18, 8, '#c8c3ff', 'left')

    if (state.value === 'play') {
        for (let i = 0; i < lives; i++) {
            draw(ctx, SPRITES.heart, W - 20 - i * 18, 6)
        }
    }

    const blink = Math.floor(clock * 2) % 2 === 0

    if (state.value === 'title') {
        draw(ctx, SPRITES.cat, W / 2 - cat.w / 2, FLOOR_Y - cat.h)
        text(ctx, 'DREAM CAT', W / 2, 50, 16, '#ffd34d')
        text(ctx, 'Catch the fish!', W / 2, 80)
        text(ctx, 'Dodge cucumbers.', W / 2, 94, 8, '#a6dd7a')

        if (blink) {
            text(ctx, 'PRESS START', W / 2, 124)
        }
    } else if (state.value === 'over') {
        text(ctx, 'GAME OVER', W / 2, 56, 16, '#ff4d6d')
        text(ctx, `SCORE ${score.value}`, W / 2, 86)

        if (newBest.value) {
            text(ctx, 'NEW BEST!', W / 2, 100, 8, '#ffd34d')
        }

        if (blink) {
            text(ctx, 'PRESS START', W / 2, 124)
        }
    }
}

function loop(time: number) {
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 0
    last = time
    update(dt)
    render()
    frame = requestAnimationFrame(loop)
}

function onKey(event: KeyboardEvent, down: boolean) {
    const key = event.key.toLowerCase()

    if (key === 'arrowleft' || key === 'a') {
        keys.left = down
    } else if (key === 'arrowright' || key === 'd') {
        keys.right = down
    } else if ((key === ' ' || key === 'enter') && down) {
        // keep Space / Enter from pressing whatever button has focus (like Close)
        event.preventDefault()
        pressStart()
    } else {
        return
    }

    event.preventDefault()
}

const onKeydown = (event: KeyboardEvent) => onKey(event, true)
const onKeyup = (event: KeyboardEvent) => onKey(event, false)

/** Pointer position in game pixels. */
function gameX(event: PointerEvent): number {
    const rect = screen.value!.getBoundingClientRect()

    return ((event.clientX - rect.left) / rect.width) * W
}

function onScreenDown(event: PointerEvent) {
    if (state.value === 'play') {
        dragX = gameX(event)
        screen.value?.setPointerCapture(event.pointerId)
    } else {
        pressStart()
    }
}

function onScreenMove(event: PointerEvent) {
    if (dragX !== undefined) {
        dragX = gameX(event)
    }
}

function onScreenUp() {
    dragX = undefined
}

function hold(direction: 'left' | 'right', down: boolean) {
    held[direction] = down
}

function resetInput() {
    keys.left = keys.right = held.left = held.right = false
    dragX = undefined
}

watch(() => props.open, async (open) => {
    if (open) {
        loadBest()
        state.value = 'title'
        resetInput()
        window.addEventListener('keydown', onKeydown)
        window.addEventListener('keyup', onKeyup)
        await nextTick()
        last = 0
        frame = requestAnimationFrame(loop)
    } else {
        cancelAnimationFrame(frame)
        window.removeEventListener('keydown', onKeydown)
        window.removeEventListener('keyup', onKeyup)
    }
})

onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('keyup', onKeyup)
})
</script>

<template>
    <ModalShell
        :open="open"
        label="Dream Cat, a mini game"
        close-label="Close the game"
        :width="GAME_WIDTH"
        @close="emit('close')"
    >
        <div class="handheld">
            <p class="brand">
                DREAM CAT
            </p>
            <canvas
                ref="screen"
                class="screen"
                :width="W"
                :height="H"
                role="img"
                aria-label="Dream Cat: move the cat to catch falling fish and avoid the cucumbers."
                @pointerdown="onScreenDown"
                @pointermove="onScreenMove"
                @pointerup="onScreenUp"
                @pointercancel="onScreenUp"
            />
            <div class="pad">
                <button
                    type="button"
                    aria-label="Move left"
                    @pointerdown="hold('left', true)"
                    @pointerup="hold('left', false)"
                    @pointerleave="hold('left', false)"
                    @pointercancel="hold('left', false)"
                    @contextmenu.prevent
                >
                    ◀
                </button>
                <button
                    type="button"
                    class="start"
                    @click="pressStart"
                >
                    START
                </button>
                <button
                    type="button"
                    aria-label="Move right"
                    @pointerdown="hold('right', true)"
                    @pointerup="hold('right', false)"
                    @pointerleave="hold('right', false)"
                    @pointercancel="hold('right', false)"
                    @contextmenu.prevent
                >
                    ▶
                </button>
            </div>
            <p class="help">
                ← → or A D to move · Space to start · gamepads work too
            </p>
        </div>
    </ModalShell>
</template>

<style scoped>
.handheld {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 14px 16px 16px;
    border: 3px solid #1b1b1e;
    border-radius: 18px 18px 40px 18px;
    background: #2a2a30;
    box-shadow:
        inset 0 -6px 0 rgba(0, 0, 0, 0.35),
        0 10px 0 rgba(0, 0, 0, 0.25);
}

.brand {
    margin: 0;
    align-self: flex-start;
    font: 10px/1 'Press Start 2P', ui-monospace, monospace;
    letter-spacing: 0.1em;
    color: #ffd34d;
}

.screen {
    display: block;
    width: 100%;
    max-height: calc(100dvh - 260px);
    aspect-ratio: 4 / 3;
    object-fit: contain;
    border: 6px solid #121215;
    border-radius: 8px;
    background: #1d1b3a;
    image-rendering: pixelated;
    touch-action: none;
    cursor: pointer;
}

.pad {
    display: flex;
    gap: 14px;
}

.pad button {
    min-width: 56px;
    padding: 12px 14px;
    border: 3px solid #121215;
    border-radius: 12px;
    background: #3a3a42;
    font: 12px/1 'Press Start 2P', ui-monospace, monospace;
    color: #fff;
    cursor: pointer;
    box-shadow: 0 4px 0 #121215;
    touch-action: none;
    user-select: none;
}

.pad button:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 #121215;
}

.pad .start {
    background: #46c46a;
    color: #121215;
}

.pad button:hover,
.pad button:focus-visible {
    outline: 3px solid #ffd34d;
    outline-offset: 2px;
}

.help {
    margin: 0;
    font: 12px/1.4 system-ui, sans-serif;
    color: #b9b9c4;
    text-align: center;
}
</style>
