import * as THREE from 'three'
import { pick, rng } from './helpers'

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

function paint(w: number, h: number, draw: Draw, repeat?: [number, number]): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')

    if (ctx) {
        draw(ctx, w, h)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8

    if (repeat) {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(repeat[0], repeat[1])
    }

    return texture
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, count: number, light: string, dark: string): void {
    const r = rng(seed)

    for (let i = 0; i < count; i++) {
        ctx.fillStyle = r() > 0.5 ? light : dark
        ctx.fillRect(r() * w, r() * h, 2, 2)
    }
}

function floor(): THREE.CanvasTexture {
    return paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#e4ad94'
        ctx.fillRect(0, 0, w, h)
        speckle(ctx, w, h, 3, 900, 'rgba(255,240,225,0.08)', 'rgba(170,110,85,0.07)')
        ctx.strokeStyle = '#c98d75'
        ctx.lineWidth = 5
        ctx.strokeRect(0, 0, w, h)
        ctx.strokeStyle = 'rgba(255,235,220,0.35)'
        ctx.lineWidth = 2
        ctx.strokeRect(6, 6, w - 12, h - 12)
    }, [5, 5])
}

function quilt(): THREE.CanvasTexture {
    return paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#efe6d0'
        ctx.fillRect(0, 0, w, h)
        const cell = 64

        for (let y = 0; y < h; y += cell) {
            for (let x = 0; x < w; x += cell) {
                const g = ctx.createRadialGradient(x + cell / 2, y + cell / 2, 4, x + cell / 2, y + cell / 2, cell * 0.75)
                g.addColorStop(0, 'rgba(255,255,250,0.6)')
                g.addColorStop(1, 'rgba(185,165,130,0.4)')
                ctx.fillStyle = g
                ctx.fillRect(x, y, cell, cell)
            }
        }

        const r = rng(11)
        const colors = ['#d9a37a', '#b4c096', '#e5b3a3', '#c9b48a']

        for (let i = 0; i < 280; i++) {
            dot(ctx, r() * w, r() * h, 1.5 + r() * 1.8, pick(colors, i))
        }

        ctx.strokeStyle = 'rgba(165,145,110,0.65)'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 4])

        for (let i = 0; i <= w; i += cell) {
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, h)
            ctx.moveTo(0, i)
            ctx.lineTo(w, i)
            ctx.stroke()
        }
    }, [3, 3])
}

function plaid(): THREE.CanvasTexture {
    return paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#eeae66'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = 'rgba(250,226,182,0.6)'

        for (let i = 0; i < w; i += 64) {
            ctx.fillRect(i + 8, 0, 20, h)
            ctx.fillRect(0, i + 8, w, 20)
        }

        ctx.fillStyle = 'rgba(185,105,45,0.55)'

        for (let i = 0; i < w; i += 64) {
            ctx.fillRect(i + 42, 0, 4, h)
            ctx.fillRect(0, i + 42, w, 4)
        }
    }, [2, 2])
}

function rug(): THREE.CanvasTexture {
    return paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#8e8865'
        ctx.fillRect(0, 0, w, h)
        speckle(ctx, w, h, 17, 3000, 'rgba(210,205,170,0.12)', 'rgba(55,50,30,0.12)')
        ctx.strokeStyle = '#726c4c'
        ctx.lineWidth = 12
        ctx.strokeRect(10, 10, w - 20, h - 20)
        ctx.strokeStyle = 'rgba(210,202,165,0.6)'
        ctx.lineWidth = 2
        ctx.strokeRect(26, 26, w - 52, h - 52)
    })
}

/** Woven blue upholstery with a subtle speckle. */
function fabric(): THREE.CanvasTexture {
    return paint(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#2f86c8'
        ctx.fillRect(0, 0, w, h)
        speckle(ctx, w, h, 31, 1600, 'rgba(160,210,245,0.18)', 'rgba(10,50,95,0.2)')
    }, [3, 3])
}

function windowGlass(): THREE.CanvasTexture {
    return paint(256, 256, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h)
        g.addColorStop(0, '#fffcf4')
        g.addColorStop(1, '#ffe6c2')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
        ctx.strokeStyle = 'rgba(200,168,128,0.55)'
        ctx.lineWidth = 2
        ctx.beginPath()

        for (let i = -h; i < w + h; i += 18) {
            ctx.moveTo(i, 0)
            ctx.lineTo(i + h, h)
            ctx.moveTo(i, h)
            ctx.lineTo(i + h, 0)
        }

        ctx.stroke()
    })
}

/** The times of day the window can show, in the order they come. */
export type SkyPhase = 'night' | 'dawn' | 'day' | 'dusk'

const SKY_W = 256
const SKY_H = 280

function skyGradient(ctx: CanvasRenderingContext2D, h: number, stops: [number, string][]): CanvasGradient {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    stops.forEach(([at, color]) => g.addColorStop(at, color))

    return g
}

/** A sun (or moon) disc with a soft halo around it. */
function glowDisc(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, r: number, color: string, halo: string): void {
    const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.6)
    glow.addColorStop(0, halo)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)
    dot(ctx, x, y, r, color)
}

/** A puffy cloud made of overlapping circles, `s` wide-ish. */
function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
    for (const [dx, dy, r] of [[0, 0, 0.32], [0.3, -0.12, 0.38], [0.62, 0, 0.3], [0.32, 0.1, 0.3]] as const) {
        dot(ctx, x + dx * s, y + dy * s, r * s, color)
    }
}

function stars(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, alpha: number): void {
    const r = rng(77)

    for (let i = 0; i < count; i++) {
        const big = r() > 0.88
        dot(ctx, r() * w, r() * h * 0.85, big ? 1.8 : 0.6 + r() * 0.7, `rgba(255,250,235,${(0.45 + r() * 0.55) * alpha})`)
    }
}

/** The window's diamond lattice, drawn over every sky so the window keeps its look. */
function lattice(ctx: CanvasRenderingContext2D, w: number, h: number, color: string): void {
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = -h; i < w + h; i += 18) {
        ctx.moveTo(i, 0)
        ctx.lineTo(i + h, h)
        ctx.moveTo(i, h)
        ctx.lineTo(i + h, 0)
    }

    ctx.stroke()
}

/** Night: a deep sky with stars and a crescent moon. */
function nightSky(): THREE.CanvasTexture {
    return paint(SKY_W, SKY_H, (ctx, w, h) => {
        const sky = skyGradient(ctx, h, [[0, '#0e1233'], [0.65, '#262452'], [1, '#4b3b6e']])
        ctx.fillStyle = sky
        ctx.fillRect(0, 0, w, h)
        stars(ctx, w, h, 70, 1)

        // moon: a disc, then the sky painted back over most of it for a crescent
        const mx = w * 0.72
        const my = h * 0.24
        glowDisc(ctx, w, h, mx, my, 24, '#fff4d2', 'rgba(255,240,200,0.35)')
        ctx.fillStyle = sky
        ctx.beginPath()
        ctx.arc(mx + 11, my - 7, 21, 0, Math.PI * 2)
        ctx.fill()

        lattice(ctx, w, h, 'rgba(10,10,30,0.45)')
    })
}

/** Sunrise: cool blue fading to peach, the sun just up over the horizon. */
function dawnSky(): THREE.CanvasTexture {
    return paint(SKY_W, SKY_H, (ctx, w, h) => {
        ctx.fillStyle = skyGradient(ctx, h, [[0, '#7486d0'], [0.55, '#f0a5a8'], [1, '#ffd08a']])
        ctx.fillRect(0, 0, w, h)
        stars(ctx, w, h * 0.4, 14, 0.5)
        glowDisc(ctx, w, h, w * 0.3, h * 0.86, 26, '#fff1c9', 'rgba(255,200,140,0.6)')
        cloud(ctx, w * 0.5, h * 0.42, 70, 'rgba(255,214,214,0.75)')
        cloud(ctx, w * 0.05, h * 0.25, 55, 'rgba(255,214,214,0.6)')
        lattice(ctx, w, h, 'rgba(70,40,60,0.28)')
    })
}

/** Day: clear blue with white clouds and a high sun. */
function daySky(): THREE.CanvasTexture {
    return paint(SKY_W, SKY_H, (ctx, w, h) => {
        ctx.fillStyle = skyGradient(ctx, h, [[0, '#4f9fe8'], [0.6, '#9ed2fb'], [1, '#e2f3ff']])
        ctx.fillRect(0, 0, w, h)
        glowDisc(ctx, w, h, w * 0.76, h * 0.2, 20, '#fffbe8', 'rgba(255,255,230,0.65)')
        cloud(ctx, w * 0.08, h * 0.38, 80, '#ffffff')
        cloud(ctx, w * 0.55, h * 0.6, 60, 'rgba(255,255,255,0.9)')
        cloud(ctx, w * 0.3, h * 0.14, 45, 'rgba(255,255,255,0.85)')
        lattice(ctx, w, h, 'rgba(40,60,90,0.22)')
    })
}

/** Sunset: indigo above, glowing orange at the horizon, the sun going down. */
function duskSky(): THREE.CanvasTexture {
    return paint(SKY_W, SKY_H, (ctx, w, h) => {
        ctx.fillStyle = skyGradient(ctx, h, [[0, '#35357a'], [0.55, '#c25d88'], [1, '#ff9a55']])
        ctx.fillRect(0, 0, w, h)
        stars(ctx, w, h * 0.35, 18, 0.6)
        glowDisc(ctx, w, h, w * 0.68, h * 0.9, 30, '#ffd59a', 'rgba(255,150,90,0.6)')
        cloud(ctx, w * 0.12, h * 0.5, 75, 'rgba(120,70,130,0.7)')
        cloud(ctx, w * 0.6, h * 0.3, 55, 'rgba(150,80,140,0.6)')
        lattice(ctx, w, h, 'rgba(30,15,40,0.35)')
    })
}

/** The phone lying on the bed: a lock screen with a clock and a couple of notifications. */
function phoneScreen(): THREE.CanvasTexture {
    return paint(128, 256, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h)
        g.addColorStop(0, '#6d4bd8')
        g.addColorStop(1, '#e45a9a')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.font = 'bold 34px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('9:41', w / 2, 70)
        ctx.fillStyle = 'rgba(255,255,255,0.35)'

        for (const y of [110, 150]) {
            ctx.fillRect(14, y, w - 28, 30)
        }

        ctx.fillRect(w / 2 - 22, h - 14, 44, 4)
    })
}

/** The face of a Chinese chess (xiangqi) horse: carved red 馬 inside a red ring, on pale wood. */
function xiangqiHorse(): THREE.CanvasTexture {
    return paint(256, 256, (ctx, w, h) => {
        const r = w / 2
        const wood = ctx.createRadialGradient(r * 0.8, r * 0.7, 10, r, r, r)
        wood.addColorStop(0, '#f0d2a0')
        wood.addColorStop(1, '#d4a86e')
        ctx.fillStyle = wood
        ctx.fillRect(0, 0, w, h)
        ctx.strokeStyle = '#b3242a'
        ctx.lineWidth = 8
        ctx.beginPath()
        ctx.arc(r, r, r * 0.8, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = '#b3242a'
        ctx.font = 'bold 150px KaiTi, STKaiti, "Kaiti SC", "Noto Serif SC", "Noto Serif CJK SC", SimSun, serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('馬', r, r + 8)
    })
}

/** Orange tabby fur: darker bands across a warm orange, wrapped round the cat's back. */
function tabby(): THREE.CanvasTexture {
    return paint(128, 256, (ctx, w, h) => {
        ctx.fillStyle = '#e8913f'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#d27a36'

        // bands across the spine, thinning towards the ends
        for (let i = 1; i < 9; i++) {
            const y = (i / 9) * h
            const band = 4.5 - Math.abs(i - 4.5) * 0.6
            ctx.fillRect(0, y - band, w, band * 2)
        }
    })
}

function monitor(): THREE.CanvasTexture {
    return paint(512, 320, (ctx, w, h) => {
        const r = rng(5)
        ctx.fillStyle = '#1c2030'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#272c40'
        ctx.fillRect(0, 0, w, 24)
        dot(ctx, 16, 12, 5, '#ff6b6b')
        dot(ctx, 32, 12, 5, '#ffd166')
        dot(ctx, 48, 12, 5, '#06d6a0')

        ctx.fillStyle = '#21263a'
        ctx.fillRect(0, 24, 100, h - 24)

        for (let i = 0; i < 12; i++) {
            ctx.fillStyle = i === 3 ? 'rgba(65,184,131,0.85)' : 'rgba(255,255,255,0.2)'
            ctx.fillRect(14, 40 + i * 20, 30 + r() * 44, 7)
        }

        const tokens = ['#c792ea', '#82aaff', '#c3e88d', '#f78c6c', '#89ddff', '#ffcb6b', '#a6accd']
        const indents = [0, 1, 1, 2, 2, 3, 1, 0]
        let y = 40

        for (let line = 0; line < 18; line++) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)'
            ctx.fillRect(108, y, 10, 7)
            let x = 128 + pick(indents, line) * 18
            const count = 1 + Math.floor(r() * 4)

            for (let t = 0; t < count; t++) {
                const width = 18 + r() * 60
                ctx.fillStyle = pick(tokens, Math.floor(r() * 7))
                ctx.fillRect(x, y, width, 7)
                x += width + 8
            }

            y += 15
        }

        // little preview window showing a cosy room
        ctx.fillStyle = '#f6e3d6'
        ctx.fillRect(372, 40, 124, 150)
        ctx.fillStyle = '#e9b49b'
        ctx.beginPath()
        ctx.moveTo(434, 70)
        ctx.lineTo(480, 95)
        ctx.lineTo(480, 150)
        ctx.lineTo(434, 175)
        ctx.lineTo(388, 150)
        ctx.lineTo(388, 95)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#d99a80'
        ctx.beginPath()
        ctx.moveTo(388, 150)
        ctx.lineTo(434, 125)
        ctx.lineTo(480, 150)
        ctx.lineTo(434, 175)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = '#41b883'
        ctx.fillRect(0, h - 16, w, 16)
    })
}

function tv(): THREE.CanvasTexture {
    return paint(256, 144, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h)
        g.addColorStop(0, '#17181e')
        g.addColorStop(1, '#30323c')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = 'rgba(255,255,255,0.06)'
        ctx.beginPath()
        ctx.moveTo(w * 0.55, 0)
        ctx.lineTo(w * 0.75, 0)
        ctx.lineTo(w * 0.45, h)
        ctx.lineTo(w * 0.25, h)
        ctx.closePath()
        ctx.fill()
    })
}

function posterBig(): THREE.CanvasTexture {
    return paint(256, 384, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h)
        g.addColorStop(0, '#fbd35a')
        g.addColorStop(0.6, '#f2a23c')
        g.addColorStop(1, '#e9772c')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
        dot(ctx, 165, 120, 44, '#fff3cf')

        ctx.fillStyle = '#6a4029'
        ctx.beginPath()
        ctx.moveTo(0, 260)
        ctx.lineTo(60, 200)
        ctx.lineTo(110, 240)
        ctx.lineTo(170, 165)
        ctx.lineTo(256, 250)
        ctx.lineTo(256, h)
        ctx.lineTo(0, h)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = '#2d201c'
        ctx.beginPath()
        ctx.moveTo(0, 300)
        ctx.lineTo(80, 235)
        ctx.lineTo(140, 290)
        ctx.lineTo(200, 245)
        ctx.lineTo(256, 290)
        ctx.lineTo(256, h)
        ctx.lineTo(0, h)
        ctx.closePath()
        ctx.fill()

        ctx.strokeStyle = '#2d201c'
        ctx.lineWidth = 3

        for (const [x, y] of [[70, 90], [92, 76], [110, 100], [205, 70]] as const) {
            ctx.beginPath()
            ctx.moveTo(x - 8, y)
            ctx.quadraticCurveTo(x - 4, y - 6, x, y)
            ctx.quadraticCurveTo(x + 4, y - 6, x + 8, y)
            ctx.stroke()
        }
    })
}

function posterSmallA(): THREE.CanvasTexture {
    return paint(128, 160, (ctx, w, h) => {
        ctx.fillStyle = '#ef7f3a'
        ctx.fillRect(0, 0, w, h)
        ctx.strokeStyle = '#ffcf73'
        ctx.lineWidth = 8

        for (const r of [62, 44, 26]) {
            ctx.beginPath()
            ctx.arc(w / 2, h / 2, r, Math.PI * 0.2, Math.PI * 1.6)
            ctx.stroke()
        }

        dot(ctx, w / 2, h / 2, 12, '#c9452a')
    })
}

function posterSmallB(): THREE.CanvasTexture {
    return paint(128, 160, (ctx, w, h) => {
        const colors = ['#2f5fd0', '#7b3fd0', '#e04f8c', '#f59a3a', '#f6d15a', '#2f5fd0', '#7b3fd0']
        ctx.save()
        ctx.translate(w / 2, h / 2)
        ctx.rotate(-0.6)
        colors.forEach((color, i) => {
            ctx.fillStyle = color
            ctx.fillRect(-160 + i * 46, -160, 46, 320)
        })
        ctx.restore()
    })
}

export function createTextures() {
    return {
        floor: floor(),
        quilt: quilt(),
        plaid: plaid(),
        rug: rug(),
        fabric: fabric(),
        windowGlass: windowGlass(),
        skies: { night: nightSky(), dawn: dawnSky(), day: daySky(), dusk: duskSky() } satisfies Record<SkyPhase, THREE.CanvasTexture>,
        monitor: monitor(),
        phoneScreen: phoneScreen(),
        xiangqiHorse: xiangqiHorse(),
        tabby: tabby(),
        tv: tv(),
        posterBig: posterBig(),
        posterSmallA: posterSmallA(),
        posterSmallB: posterSmallB(),
    }
}
