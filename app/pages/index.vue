<script setup lang="ts">
import { MUSIC_URL } from '~/data/music'
import { BUILT_WITH, CHESS_PROFILE } from '~/data/socials'

useSeoMeta({
    title: 'Nuxt Room',
    description: 'A cosy isometric room built with Nuxt and Three.js.',
})

const layout = useStageLayout()
const message = ref('Hello. I am Nam. Welcome to my Nuxt Room.')
/** The character's head x on the canvas, which shares its left edge with the bubble. */
const headX = ref<number>()
const tvOpen = ref(false)
const pcOpen = ref(false)
/** The look inside the PC tower. */
const caseOpen = ref(false)
/** The PC screen is typing out a file (the desk keyboard plays along). */
const pcTyping = ref(false)
const galleryOpen = ref(false)
/** Which wall picture the gallery shows (an index into GALLERY). */
const galleryIndex = ref(0)
const phoneOpen = ref(false)
/** The CV preview, from the backpack. */
const cvOpen = ref(false)
/** The Dream Cat mini game, from the controller on the desk. */
const gameOpen = ref(false)
/** The record player's card is up, and whether it's playing (the record spins along). */
const musicOpen = ref(false)
const musicPlaying = ref(false)
const { theme, toggle: toggleTheme } = useTheme()
const sound = useSound()
let stopSound: (() => void) | undefined
/** The room's start-up progress (0 to 1) for the loading screen; the page itself arriving counts as a little. */
const roomProgress = ref(0.1)
const roomReady = ref(false)

/** What I say when something happens in the room; one line is picked at random. */
const LINES = {
    tvOn: ['Ooh, good pick.', 'Grab some popcorn.', 'One of my favourites.'],
    tvOff: ['Good taste, right?', 'Back to the room.'],
    pcOn: ['That is my code. Be nice.', 'Have a look around my files.'],
    caseOn: ['That is my rig. Peek inside.', 'Ryzen 7 7800X3D. It goes brrr.'],
    pcOff: ['Like what you saw? My email is in contact.ts.', 'Thanks for reading!'],
    lightsOff: ['Who turned off the lights?', 'Ooh, spooky.', 'Night mode: on.'],
    lightsOn: ['Ahh, much better.', 'Let there be light.'],
    gallery: ['Some art I like.', 'Nice, right?', 'Take a closer look.'],
    musicOn: ['Ahh, my jam.', 'Let us get some music going.', 'Turn it up!'],
    musicOff: ['A little quiet time.', 'Music paused.'],
    cv: ['Here is my CV.', 'My CV, fresh out of the bag.'],
    // there is no real cat; it's the one I wish I had
    cat: [
        'Meet the cat I do not really have.',
        'Shh, my imaginary cat is napping.',
        'Purrr... Sadly, this cat is not real.',
        'My dream cat. One day, a real one.',
    ],
    game: ['Game time!', 'Help my dream cat catch some fish.', 'Watch out for the cucumbers.'],
    builtWith: ['Built with this. Have a look!', 'One of the tools behind this room.'],
    chess: ['Fancy a game? Here is my Chess.com.', 'Find me on Chess.com.'],
    phone: ['That is my phone. Hit me up!', 'Find me online.'],
    // when the visitor goes quiet; these play in order, as hints
    idle: [
        'Still there?',
        'Psst. Click the green arrows.',
        'Try the switch above my bed.',
        'The TV has some of my favourite stuff.',
        'Put on a record. The player is on my desk.',
        'Click my PC under the desk to see inside.',
        'My CV is in the backpack.',
        'Pet the cat I wish I had. It is on my bed.',
        'Grab the controller on my desk for a quick game.',
    ],
}
/** Seconds without any input before I speak up, and how often the idle check runs (ms). */
const IDLE_AFTER = 25
const IDLE_CHECK = 1000

/** Says a random line from `lines`, avoiding a repeat of what's already in the bubble. */
function say(lines: string[]) {
    const fresh = lines.filter(line => line !== message.value)
    const pool = fresh.length ? fresh : lines
    message.value = pool[Math.floor(Math.random() * pool.length)] ?? message.value
}

watch(tvOpen, (open) => {
    // the TV has its own sound, so the record pauses while it's on
    if (open) {
        musicPlaying.value = false
    }

    say(open ? LINES.tvOn : LINES.tvOff)
})
watch(pcOpen, open => say(open ? LINES.pcOn : LINES.pcOff))
watch(musicPlaying, (playing) => {
    // stay quiet when it's the TV that paused the music
    if (!tvOpen.value) {
        say(playing ? LINES.musicOn : LINES.musicOff)
    }
})
// the room tone steps aside while the TV or the music plays; crickets come out at night; keys clack while the PC types
watch([tvOpen, musicPlaying], ([tv, music]) => sound.setAmbience(!tv && !music))
watch(theme, value => sound.setNight(value === 'dark'), { immediate: true })
watch(pcTyping, typing => sound.setTyping(typing))

let lastActivity = 0
let idleIndex = 0
let idleTimer: ReturnType<typeof setInterval> | undefined
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const

function markActive() {
    lastActivity = performance.now()
}

function checkIdle() {
    if (document.hidden || tvOpen.value || pcOpen.value || caseOpen.value || cvOpen.value || gameOpen.value || galleryOpen.value || phoneOpen.value) {
        return
    }

    if (performance.now() - lastActivity >= IDLE_AFTER * 1000) {
        message.value = LINES.idle[idleIndex % LINES.idle.length]!
        idleIndex++
        // wait another full stretch before the next hint
        markActive()
    }
}

onMounted(() => {
    markActive()
    ACTIVITY_EVENTS.forEach(type => window.addEventListener(type, markActive, { passive: true }))
    idleTimer = setInterval(checkIdle, IDLE_CHECK)
    stopSound = sound.start()
})

onBeforeUnmount(() => {
    ACTIVITY_EVENTS.forEach(type => window.removeEventListener(type, markActive))
    clearInterval(idleTimer)
    stopSound?.()
})

/** What's on the TV: one YouTube link per channel, in channel order. */
const tvChannels = [
    'https://www.youtube.com/watch?v=ic8j13piAhQ',
    'https://www.youtube.com/watch?v=nSE38xjMLqE',
    'https://www.youtube.com/watch?v=2eqJA2xN8nA',
    'https://www.youtube.com/watch?v=LSs4mBRy7nk',
]

function onInteract(id: string) {
    if (id === 'tv') {
        tvOpen.value = true
    } else if (id === 'pc') {
        pcOpen.value = true
    } else if (id === 'case') {
        caseOpen.value = true
        say(LINES.caseOn)
    } else if (id === 'light') {
        // the wall switch: lights off is dark mode
        sound.play('switch')
        toggleTheme()
        say(theme.value === 'dark' ? LINES.lightsOff : LINES.lightsOn)
    } else if (id.startsWith('poster:')) {
        galleryIndex.value = Number(id.slice('poster:'.length)) || 0
        galleryOpen.value = true
        say(LINES.gallery)
    } else if (id === 'music') {
        // first click brings the player up and starts it; after that it's play / pause
        if (musicOpen.value) {
            musicPlaying.value = !musicPlaying.value
        } else {
            musicOpen.value = true
            musicPlaying.value = true
        }
    } else if (id === 'cv') {
        cvOpen.value = true
        say(LINES.cv)
    } else if (id === 'game') {
        gameOpen.value = true
        say(LINES.game)
    } else if (id === 'chess') {
        // a new tab, so the room stays open behind it
        window.open(CHESS_PROFILE, '_blank', 'noopener')
        say(LINES.chess)
    } else if (id === 'nuxt' || id === 'three') {
        // the logos on the walls: off to their sites, in a new tab
        window.open(BUILT_WITH[id], '_blank', 'noopener')
        say(LINES.builtWith)
    } else if (id === 'cat') {
        sound.play('purr')
        say(LINES.cat)
    } else if (id === 'phone') {
        phoneOpen.value = true
        say(LINES.phone)
    }
}

function stopMusic() {
    musicPlaying.value = false
    musicOpen.value = false
}
</script>

<template>
    <main class="stage">
        <div
            v-if="layout.side"
            class="scene"
        >
            <SpeechBubble
                :text="message"
                :width="layout.side"
                :metrics="layout.bubble"
                :tail-x="headX"
                :style="{ marginBottom: `${layout.bubble.tail + 4}px` }"
            />
            <RoomCanvas
                :size="layout.side"
                :lights-on="theme === 'light'"
                :typing="pcTyping"
                :music-playing="musicPlaying"
                @head="headX = $event"
                @interact="onInteract"
                @progress="roomProgress = $event"
                @ready="roomReady = true"
            />
        </div>
        <PcModal
            :open="pcOpen"
            @close="pcOpen = false"
            @typing="pcTyping = $event"
        />
        <PcCaseModal
            :open="caseOpen"
            @close="caseOpen = false"
        />
        <GalleryModal
            v-model:index="galleryIndex"
            :open="galleryOpen"
            @close="galleryOpen = false"
        />
        <GameModal
            :open="gameOpen"
            @close="gameOpen = false"
        />
        <CvModal
            :open="cvOpen"
            @close="cvOpen = false"
        />
        <PhoneModal
            :open="phoneOpen"
            @close="phoneOpen = false"
        />
        <MusicPlayer
            v-model:playing="musicPlaying"
            :open="musicOpen"
            :url="MUSIC_URL"
            @close="stopMusic"
        />
        <TvModal
            :open="tvOpen"
            :channels="tvChannels"
            @close="tvOpen = false"
        />
        <SoundToggle />
        <p class="hint">drag to look around</p>
        <LoadingScreen
            :progress="roomProgress"
            :done="roomReady"
        />
    </main>
</template>

<style scoped>
.stage {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
}

.scene {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.hint {
    position: absolute;
    bottom: 12px;
    left: 0;
    right: 0;
    margin: 0;
    text-align: center;
    font-size: 12px;
    letter-spacing: 0.08em;
    color: var(--hint);
    opacity: 0.55;
    pointer-events: none;
    user-select: none;
}
</style>
