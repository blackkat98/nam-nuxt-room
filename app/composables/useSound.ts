/**
 * The room's sounds, all synthesized live with the Web Audio API (no audio files): clicks, TV static, keyboard
 * clacks, a purr, 8-bit game blips, and a quiet room tone that picks up crickets at night.
 *
 * Browsers only allow audio after the visitor has clicked or pressed a key, so nothing plays before that; the
 * room tone starts on that first gesture. The mute choice is remembered in this browser.
 */
export type SoundName = 'switch' | 'static' | 'key' | 'purr' | 'start' | 'catch' | 'gold' | 'hurt' | 'over'

const MUTE_KEY = 'nuxt-room-muted'
/** Overall loudness, and the room tone's level under it. */
const MASTER_VOLUME = 0.7
const AMBIENCE_VOLUME = 0.035
/** Seconds for the room tone to fade in or out. */
const AMBIENCE_FADE = 0.8
/** Gap between keyboard clacks while the PC types, in ms (randomised within this range). */
const KEY_GAP = [55, 130] as const
/** Gap between cricket chirps at night, in ms (randomised within this range). */
const CRICKET_GAP = [900, 2200] as const

let ctx: AudioContext | undefined
let master: GainNode | undefined
let ambienceGain: GainNode | undefined
let noise: AudioBuffer | undefined
let typingTimer: ReturnType<typeof setTimeout> | undefined
let cricketTimer: ReturnType<typeof setTimeout> | undefined
let wantAmbience = true
let night = false
let started = false
/** Mirrors the muted state for the audio code, which runs outside any component. */
let mutedNow = false

function between([min, max]: readonly [number, number]): number {
    return min + Math.random() * (max - min)
}

/** Makes the audio graph on first use (it has to be inside a click or key press). */
function ensure(): AudioContext | undefined {
    if (ctx) {
        if (ctx.state === 'suspended' && !document.hidden) {
            ctx.resume().catch(() => undefined)
        }

        return ctx
    }

    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

    if (!Context) {
        return undefined
    }

    ctx = new Context()
    master = ctx.createGain()
    master.gain.value = mutedNow ? 0 : MASTER_VOLUME
    master.connect(ctx.destination)

    // two seconds of white noise, reused by every noisy sound
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = noise.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1
    }

    startAmbience(ctx, master)

    return ctx
}

/** The room tone: soft brown noise, low-passed so it reads as a quiet room rather than hiss. */
function startAmbience(audio: AudioContext, out: GainNode) {
    const buffer = audio.createBuffer(1, audio.sampleRate * 4, audio.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0

    for (let i = 0; i < data.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
        data[i] = last * 3.5
    }

    const source = audio.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = audio.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 420
    ambienceGain = audio.createGain()
    ambienceGain.gain.value = 0
    source.connect(filter).connect(ambienceGain).connect(out)
    source.start()
    fadeAmbience()
    scheduleCricket()
}

function fadeAmbience() {
    if (ctx && ambienceGain) {
        ambienceGain.gain.setTargetAtTime(wantAmbience ? AMBIENCE_VOLUME : 0, ctx.currentTime, AMBIENCE_FADE / 3)
    }
}

/** A short burst of filtered noise, shaped by a quick attack and an exponential fade. */
function burst(audio: AudioContext, out: AudioNode, options: { at?: number, length: number, volume: number, type: BiquadFilterType, frequency: number, q?: number }) {
    const start = audio.currentTime + (options.at ?? 0)
    const source = audio.createBufferSource()
    source.buffer = noise!
    const filter = audio.createBiquadFilter()
    filter.type = options.type
    filter.frequency.value = options.frequency
    filter.Q.value = options.q ?? 1
    const gain = audio.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(options.volume, start + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.length)
    source.connect(filter).connect(gain).connect(out)
    source.start(start, Math.random())
    source.stop(start + options.length + 0.05)
}

/** One oscillator note, optionally sliding to `to` Hz. */
function tone(audio: AudioContext, out: AudioNode, options: { at?: number, length: number, volume: number, type: OscillatorType, from: number, to?: number }) {
    const start = audio.currentTime + (options.at ?? 0)
    const osc = audio.createOscillator()
    osc.type = options.type
    osc.frequency.setValueAtTime(options.from, start)

    if (options.to) {
        osc.frequency.exponentialRampToValueAtTime(options.to, start + options.length)
    }

    const gain = audio.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(options.volume, start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.length)
    osc.connect(gain).connect(out)
    osc.start(start)
    osc.stop(start + options.length + 0.05)
}

/** A cat's purr: low rumbling noise, pulsing about 25 times a second. */
function purr(audio: AudioContext, out: AudioNode) {
    const start = audio.currentTime
    const length = 1.8
    const source = audio.createBufferSource()
    source.buffer = noise!
    source.loop = true
    const filter = audio.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 160
    const pulse = audio.createGain()
    pulse.gain.value = 0.5
    const lfo = audio.createOscillator()
    lfo.frequency.value = 25
    const depth = audio.createGain()
    depth.gain.value = 0.5
    lfo.connect(depth).connect(pulse.gain)
    const envelope = audio.createGain()
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(1.6, start + 0.25)
    envelope.gain.setValueAtTime(1.6, start + length - 0.5)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + length)
    source.connect(filter).connect(pulse).connect(envelope).connect(out)
    source.start(start)
    lfo.start(start)
    source.stop(start + length + 0.05)
    lfo.stop(start + length + 0.05)
}

const SOUNDS: Record<SoundName, (audio: AudioContext, out: AudioNode) => void> = {
    // a wall switch: a crisp snap with a little body, then the faint return click
    switch: (audio, out) => {
        burst(audio, out, { length: 0.03, volume: 0.6, type: 'highpass', frequency: 2500 })
        tone(audio, out, { length: 0.06, volume: 0.35, type: 'sine', from: 160, to: 90 })
        burst(audio, out, { at: 0.07, length: 0.02, volume: 0.2, type: 'highpass', frequency: 3500 })
    },
    // TV static between channels
    static: (audio, out) => {
        burst(audio, out, { length: 0.4, volume: 0.25, type: 'bandpass', frequency: 2200, q: 0.6 })
        tone(audio, out, { length: 0.05, volume: 0.15, type: 'square', from: 90 })
    },
    // one keyboard clack, a little different every time
    key: (audio, out) => {
        burst(audio, out, { length: 0.035, volume: 0.22, type: 'bandpass', frequency: between([2200, 4200]), q: 2 })
        tone(audio, out, { length: 0.03, volume: 0.08, type: 'sine', from: between([150, 220]) })
    },
    purr,
    // the game's 8-bit blips
    start: (audio, out) => {
        tone(audio, out, { length: 0.08, volume: 0.12, type: 'square', from: 440 })
        tone(audio, out, { at: 0.09, length: 0.12, volume: 0.12, type: 'square', from: 660 })
    },
    catch: (audio, out) => tone(audio, out, { length: 0.09, volume: 0.1, type: 'square', from: 660, to: 990 }),
    gold: (audio, out) => {
        for (const [i, from] of [660, 880, 1320].entries()) {
            tone(audio, out, { at: i * 0.06, length: 0.08, volume: 0.1, type: 'square', from })
        }
    },
    hurt: (audio, out) => tone(audio, out, { length: 0.28, volume: 0.13, type: 'sawtooth', from: 240, to: 70 }),
    over: (audio, out) => {
        for (const [i, from] of [392, 330, 262].entries()) {
            tone(audio, out, { at: i * 0.16, length: 0.18, volume: 0.12, type: 'triangle', from })
        }
    },
}

/** At night, a cricket chirps now and then over the room tone. */
function scheduleCricket() {
    clearTimeout(cricketTimer)
    cricketTimer = setTimeout(() => {
        if (ctx && master && night && wantAmbience && !document.hidden) {
            for (let i = 0; i < 3; i++) {
                tone(ctx, master, { at: i * 0.07, length: 0.045, volume: 0.025, type: 'sine', from: 4400 })
            }
        }

        scheduleCricket()
    }, between(CRICKET_GAP))
}

function typeLoop() {
    if (ctx && master) {
        SOUNDS.key(ctx, master)
    }

    typingTimer = setTimeout(typeLoop, between(KEY_GAP))
}

export function useSound() {
    const muted = useState('muted', () => false)

    const play = (name: SoundName) => {
        const audio = ensure()

        if (audio && master && !muted.value) {
            SOUNDS[name](audio, master)
        }
    }

    const setMuted = (value: boolean) => {
        muted.value = value
        mutedNow = value

        try {
            localStorage.setItem(MUTE_KEY, value ? '1' : '0')
        } catch {
            // storage blocked: the choice just won't be remembered
        }

        if (ctx && master) {
            master.gain.setTargetAtTime(value ? 0 : MASTER_VOLUME, ctx.currentTime, 0.05)
        }
    }

    return {
        muted,
        play,
        toggleMute: () => setMuted(!muted.value),
        /** The quiet room tone; it's turned off while the TV or the music has the floor. */
        setAmbience: (on: boolean) => {
            wantAmbience = on
            fadeAmbience()
        },
        /** Crickets join the room tone at night (lights off). */
        setNight: (on: boolean) => {
            night = on
        },
        /** Keyboard clacks for as long as the PC is typing. */
        setTyping: (on: boolean) => {
            clearTimeout(typingTimer)

            if (on) {
                typeLoop()
            }
        },
        /**
         * Hooks the page up: reads the saved mute choice, starts audio on the first click or key press, and
         * goes quiet while the tab is hidden. Call once, from the page, on mount; returns the cleanup.
         */
        start: () => {
            if (started) {
                return () => undefined
            }

            started = true

            try {
                muted.value = localStorage.getItem(MUTE_KEY) === '1'
            } catch {
                muted.value = false
            }

            mutedNow = muted.value

            const unlock = () => {
                ensure()
                window.removeEventListener('pointerdown', unlock)
                window.removeEventListener('keydown', unlock)
            }

            const onVisibility = () => {
                if (document.hidden) {
                    ctx?.suspend().catch(() => undefined)
                } else {
                    ctx?.resume().catch(() => undefined)
                }
            }

            window.addEventListener('pointerdown', unlock)
            window.addEventListener('keydown', unlock)
            document.addEventListener('visibilitychange', onVisibility)

            return () => {
                started = false
                window.removeEventListener('pointerdown', unlock)
                window.removeEventListener('keydown', unlock)
                document.removeEventListener('visibilitychange', onVisibility)
                clearTimeout(typingTimer)
                clearTimeout(cricketTimer)
                ctx?.close().catch(() => undefined)
                ctx = undefined
                master = undefined
                ambienceGain = undefined
            }
        },
    }
}
