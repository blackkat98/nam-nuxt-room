<script setup lang="ts">
import { PC_BUILD } from '~/data/pc-build'

/**
 * A look through the tower's glass side: a drawn, animated cutaway of a micro-ATX build. The fans spin, air
 * streams from the front intakes to the rear exhaust, and the RGB cycles colour like the case in the room.
 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

/** The drawing and its parts list, never wider than the viewport. */
const CASE_WIDTH = 'min(100%, 520px)'

/** Front intake fans: centre height in the drawing, and seconds per turn (slightly different, so they don't sync). */
const INTAKES = [
    { y: 100, speed: 0.9 },
    { y: 190, speed: 1.0 },
    { y: 280, speed: 0.95 },
]
/** The GPU's two fans: centre x in the drawing. */
const GPU_FANS = [128, 222]
/** The AIO's two tubes: out of the top of the pump block, up over the board and down into the radiator. */
const TUBES = [
    'M 150 98 C 150 30, 260 28, 306 70',
    'M 174 98 C 174 46, 268 44, 306 96',
]
/** Air paths from the front fans to the rear exhaust, with a delay (s) so the streaks don't line up. */
const AIRFLOW = [
    { d: 'M 340 100 C 280 100, 230 92, 50 112', delay: 0 },
    { d: 'M 340 190 C 280 190, 200 150, 50 132', delay: 0.6 },
    { d: 'M 340 280 C 300 280, 300 236, 240 230 S 120 170, 50 150', delay: 1.2 },
]
</script>

<template>
    <ModalShell
        :open="open"
        label="Inside my PC"
        close-label="Close the PC case"
        :width="CASE_WIDTH"
        @close="emit('close')"
    >
        <figure class="rig">
            <svg
                class="cutaway"
                viewBox="0 0 420 460"
                role="img"
                aria-label="Inside the PC case: a micro-ATX motherboard with an AIO liquid cooler on the CPU (its radiator behind the front fans), two RAM sticks and the graphics card, three front fans, one rear fan and the power supply under a shroud."
            >
                <defs>
                    <!-- one fan rotor, drawn at radius 50 around the origin -->
                    <symbol
                        id="rotor"
                        viewBox="-50 -50 100 100"
                    >
                        <g fill="#3b3f4a">
                            <path
                                v-for="i in 7"
                                :key="i"
                                :transform="`rotate(${(i - 1) * (360 / 7)})`"
                                d="M 0 -13 C 14 -20, 30 -36, 12 -47 C 4 -38, -4 -26, 0 -13 Z"
                            />
                        </g>
                        <circle
                            r="14"
                            fill="#262932"
                        />
                    </symbol>
                </defs>

                <!-- the case shell and its back panel -->
                <rect
                    x="10"
                    y="10"
                    width="400"
                    height="440"
                    rx="14"
                    fill="#15151b"
                    stroke="#3a3a46"
                    stroke-width="4"
                />
                <rect
                    x="22"
                    y="22"
                    width="376"
                    height="416"
                    rx="8"
                    fill="#1d1d25"
                />

                <!-- rear exhaust fan (edge on) and the I/O cut-out -->
                <rect
                    x="22"
                    y="62"
                    width="12"
                    height="120"
                    fill="#2a2a33"
                />
                <rect
                    x="34"
                    y="76"
                    width="16"
                    height="96"
                    rx="3"
                    fill="#101015"
                />
                <rect
                    class="rgb"
                    x="47"
                    y="80"
                    width="3"
                    height="88"
                    fill="#ff3d5a"
                />

                <!-- motherboard -->
                <rect
                    x="60"
                    y="40"
                    width="250"
                    height="264"
                    rx="4"
                    fill="#252a33"
                    stroke="#343a46"
                    stroke-width="2"
                />
                <g
                    fill="none"
                    stroke="#2f3541"
                    stroke-width="2"
                >
                    <path d="M 270 60 V 120 H 296" />
                    <path d="M 280 210 H 296 V 290" />
                    <path d="M 80 220 H 150 V 236" />
                    <path d="M 200 214 H 260" />
                </g>
                <text
                    class="silk"
                    x="292"
                    y="296"
                    text-anchor="end"
                >mATX</text>

                <!-- VRM heatsinks around the socket -->
                <rect
                    x="72"
                    y="52"
                    width="140"
                    height="16"
                    rx="3"
                    fill="#3a3f4b"
                />
                <rect
                    x="72"
                    y="52"
                    width="16"
                    height="120"
                    rx="3"
                    fill="#3a3f4b"
                />

                <!-- the AIO's pump block on the CPU: a lit ring and a swirling cap (its tubes are drawn further down) -->
                <rect
                    x="124"
                    y="96"
                    width="76"
                    height="76"
                    rx="12"
                    fill="#2c3039"
                />
                <circle
                    cx="162"
                    cy="134"
                    r="30"
                    fill="#0d0d12"
                />
                <circle
                    class="rgb"
                    cx="162"
                    cy="134"
                    r="30"
                    fill="none"
                    stroke="#ff3d5a"
                    stroke-width="4"
                />
                <g transform="translate(162 134)">
                    <g
                        class="spin"
                        style="animation-duration: 3s"
                    >
                        <circle
                            class="rgb"
                            r="19"
                            fill="none"
                            stroke="#ff3d5a"
                            stroke-width="3"
                            stroke-dasharray="14 10"
                            opacity="0.7"
                        />
                    </g>
                </g>
                <circle
                    cx="162"
                    cy="134"
                    r="10"
                    fill="#262932"
                />
                <text
                    class="label"
                    x="162"
                    y="194"
                    text-anchor="middle"
                >CPU</text>

                <!-- two RAM sticks -->
                <g
                    v-for="x in [234, 250]"
                    :key="x"
                >
                    <rect
                        :x="x"
                        y="74"
                        width="10"
                        height="130"
                        rx="2"
                        fill="#16161b"
                        stroke="#41414d"
                    />
                    <rect
                        class="rgb"
                        :x="x"
                        y="74"
                        width="10"
                        height="10"
                        rx="2"
                        fill="#ff3d5a"
                    />
                </g>

                <!-- the AIO's tubes, from the pump up and over to the radiator, with coolant drifting through them -->
                <g
                    fill="none"
                    stroke-linecap="round"
                >
                    <g
                        stroke="#0f0f14"
                        stroke-width="8"
                    >
                        <path
                            v-for="tube in TUBES"
                            :key="tube"
                            :d="tube"
                        />
                    </g>
                    <g
                        stroke="#7cc8ff"
                        stroke-width="3"
                    >
                        <path
                            v-for="(tube, i) in TUBES"
                            :key="tube"
                            class="coolant"
                            :d="tube"
                            :style="{ animationDirection: i ? 'reverse' : 'normal' }"
                        />
                    </g>
                </g>

                <!-- graphics card: shroud, two fans, the red accent and its PCIe bracket -->
                <rect
                    x="40"
                    y="246"
                    width="12"
                    height="76"
                    fill="#3a3a46"
                />
                <rect
                    x="52"
                    y="250"
                    width="246"
                    height="66"
                    rx="8"
                    fill="#2a2d35"
                    stroke="#3d414c"
                    stroke-width="2"
                />
                <g
                    v-for="x in GPU_FANS"
                    :key="x"
                >
                    <circle
                        :cx="x"
                        cy="283"
                        r="27"
                        fill="#0d0d12"
                    />
                    <g :transform="`translate(${x} 283)`">
                        <g
                            class="spin"
                            style="animation-duration: 0.7s"
                        >
                            <use
                                href="#rotor"
                                x="-25"
                                y="-25"
                                width="50"
                                height="50"
                            />
                        </g>
                    </g>
                </g>
                <rect
                    x="52"
                    y="310"
                    width="246"
                    height="6"
                    rx="2"
                    fill="#e0262f"
                />
                <text
                    class="badge"
                    x="280"
                    y="288"
                    text-anchor="middle"
                >GPU</text>

                <!-- power supply shroud -->
                <rect
                    x="22"
                    y="344"
                    width="376"
                    height="94"
                    rx="6"
                    fill="#22222b"
                />
                <rect
                    x="22"
                    y="344"
                    width="376"
                    height="4"
                    fill="#2e2e39"
                />
                <g fill="#191920">
                    <rect
                        v-for="i in 8"
                        :key="i"
                        :x="40 + (i - 1) * 16"
                        y="372"
                        width="8"
                        height="40"
                        rx="2"
                    />
                </g>
                <text
                    class="silk"
                    x="370"
                    y="400"
                    text-anchor="end"
                >PSU</text>

                <!-- airflow: front to back -->
                <g
                    fill="none"
                    stroke="#ffffff"
                    stroke-width="3"
                    stroke-linecap="round"
                >
                    <path
                        v-for="flow in AIRFLOW"
                        :key="flow.d"
                        class="air"
                        :d="flow.d"
                        :style="{ animationDelay: `${flow.delay}s` }"
                    />
                </g>

                <!-- the AIO's radiator, mounted at the front behind the intake fans -->
                <rect
                    x="304"
                    y="56"
                    width="18"
                    height="268"
                    rx="3"
                    fill="#2b2e36"
                    stroke="#3d414c"
                    stroke-width="2"
                />
                <g
                    stroke="#1c1e24"
                    stroke-width="2"
                >
                    <line
                        v-for="i in 21"
                        :key="i"
                        x1="307"
                        :y1="60 + i * 12"
                        x2="319"
                        :y2="60 + i * 12"
                    />
                </g>

                <!-- front intake fans behind the front panel -->
                <rect
                    x="392"
                    y="22"
                    width="6"
                    height="316"
                    fill="#2a2a33"
                />
                <g
                    v-for="fan in INTAKES"
                    :key="fan.y"
                >
                    <circle
                        cx="356"
                        :cy="fan.y"
                        r="38"
                        fill="#0d0d12"
                    />
                    <g :transform="`translate(356 ${fan.y})`">
                        <g
                            class="spin"
                            :style="{ animationDuration: `${fan.speed}s` }"
                        >
                            <use
                                href="#rotor"
                                x="-36"
                                y="-36"
                                width="72"
                                height="72"
                            />
                        </g>
                    </g>
                    <circle
                        class="rgb"
                        cx="356"
                        :cy="fan.y"
                        r="38"
                        fill="none"
                        stroke="#ff3d5a"
                        stroke-width="4"
                    />
                </g>
            </svg>
            <figcaption class="specs">
                <div
                    v-for="item in PC_BUILD"
                    :key="item.part"
                    class="spec"
                >
                    <span class="part">{{ item.part }}</span>
                    <span class="name">{{ item.name }}</span>
                </div>
            </figcaption>
        </figure>
    </ModalShell>
</template>

<style scoped>
.rig {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 0;
}

.cutaway {
    display: block;
    width: 100%;
    max-height: calc(100dvh - 300px);
    filter: drop-shadow(0 14px 24px rgba(0, 0, 0, 0.45));
}

.cutaway text {
    font-family: 'Press Start 2P', ui-monospace, monospace;
}

.label {
    font-size: 10px;
    fill: #c9cbd6;
}

.silk {
    font-size: 9px;
    fill: #5b6170;
}

.badge {
    font-size: 9px;
    fill: #e0262f;
}

/* every fan rotor spins around its own centre */
.spin {
    transform-box: fill-box;
    transform-origin: center;
    animation: spin 1s linear infinite;
}

/* the lighting cycles through the rainbow, like the tower in the room */
.rgb {
    animation: rgb 8s linear infinite;
}

/* short streaks of air drifting along each path */
.air {
    opacity: 0.18;
    stroke-dasharray: 10 34;
    animation: air 1.8s linear infinite;
}

/* coolant flowing out through one tube and back through the other */
.coolant {
    opacity: 0.35;
    stroke-dasharray: 6 14;
    animation: coolant 1.4s linear infinite;
}

.specs {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    border: 3px solid #1b1b1e;
    border-radius: 8px;
    background: #fff;
    color: #1b1b1e;
}

.spec {
    display: flex;
    align-items: baseline;
    gap: 12px;
}

.part {
    flex: none;
    width: 8.5em;
    font: 10px/1.4 'Press Start 2P', ui-monospace, monospace;
    color: #16a34a;
}

.name {
    font: 14px/1.4 system-ui, sans-serif;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@keyframes rgb {
    to {
        filter: hue-rotate(360deg);
    }
}

@keyframes coolant {
    to {
        stroke-dashoffset: -20;
    }
}

@keyframes air {
    to {
        stroke-dashoffset: -44;
    }
}

@media (prefers-reduced-motion: reduce) {
    .spin,
    .rgb,
    .air,
    .coolant {
        animation: none;
    }
}
</style>
