import * as THREE from 'three'
import { createTextures } from './textures'

export function std(color: THREE.ColorRepresentation, params: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...params })
}

function glass(color: THREE.ColorRepresentation, opacity: number): THREE.MeshStandardMaterial {
    return std(color, { transparent: true, opacity, roughness: 0.08, metalness: 0.1, depthWrite: false })
}

export function createMaterials() {
    const t = createTextures()

    return {
        // shell
        wall: std('#ebb59b', { roughness: 0.95 }),
        wallCap: std('#f9e3ca', { roughness: 0.9 }),
        skirting: std('#e3a88e'),
        base: std('#dc9f86'),
        tile: std('#e6b098', { roughness: 0.8 }),
        floor: std('#ffffff', { map: t.floor, roughness: 0.75 }),
        windowFrame: std('#f6dfc4', { roughness: 0.7 }),
        windowGlass: new THREE.MeshStandardMaterial({
            color: '#fff7ea',
            map: t.windowGlass,
            emissive: '#ffffff',
            emissiveMap: t.windowGlass,
            emissiveIntensity: 0.85,
        }),
        // the view out of the window: the base sky, and the next one cross-fading in over it (see sky.ts)
        skyTextures: t.skies,
        skyBase: new THREE.MeshBasicMaterial({ map: t.skies.day }),
        skyNext: new THREE.MeshBasicMaterial({ map: t.skies.day, transparent: true, opacity: 0, depthWrite: false }),

        // woods & finishes
        woodDark: std('#7b4224', { roughness: 0.5 }),
        woodDarkInset: std('#965730', { roughness: 0.5 }),
        woodMid: std('#9a5e36', { roughness: 0.6 }),
        woodLight: std('#ecc792', { roughness: 0.6 }),
        cabinet: std('#c9a482', { roughness: 0.7 }),
        cabinetLight: std('#d4b192', { roughness: 0.7 }),
        cabinetDark: std('#a98566', { roughness: 0.8 }),
        gold: std('#d8b071', { metalness: 0.6, roughness: 0.35 }),
        white: std('#f3eee8', { roughness: 0.6 }),
        whiteWarm: std('#e6ddd2', { roughness: 0.7 }),
        black: std('#222226', { roughness: 0.45 }),
        charcoal: std('#36363d', { roughness: 0.6 }),
        metal: std('#c9c6c2', { metalness: 0.7, roughness: 0.3 }),
        glass: glass('#eaf6f6', 0.22),
        glassDark: glass('#30343c', 0.45),
        glassJar: glass('#f1d7a6', 0.45),

        // soft furnishings
        mattress: std('#f4efe6'),
        quilt: std('#ffffff', { map: t.quilt, roughness: 0.95 }),
        quiltEdge: std('#ece1c7', { roughness: 0.95 }),
        plaid: std('#ffffff', { map: t.plaid, roughness: 0.95 }),
        rug: std('#ffffff', { map: t.rug, roughness: 1 }),
        sage: std('#a2a88c', { roughness: 0.9 }),
        chairFabric: std('#ffffff', { map: t.fabric, roughness: 0.95 }),
        tan: std('#a8895a', { roughness: 0.85 }),
        tanLight: std('#c4a56c', { roughness: 0.85 }),
        strap: std('#6d5636', { roughness: 0.8 }),
        backpack: std('#4a4a51', { roughness: 0.85 }),
        backpackPocket: std('#57575f', { roughness: 0.85 }),
        backpackStrap: std('#2c2c31', { roughness: 0.8 }),

        // plants
        terracotta: std('#c8714f'),
        potWhite: std('#efe8df'),
        soil: std('#4a3326', { roughness: 1 }),
        leaf: std('#557f42', { roughness: 0.7, side: THREE.DoubleSide }),
        leafLight: std('#7fab58', { roughness: 0.7, side: THREE.DoubleSide }),
        stem: std('#4c6b37'),

        // lights
        bulb: new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffc874', emissiveIntensity: 2.5 }),
        bulbGlass: glass('#ffd9a0', 0.35),

        // gadgets
        monitorScreen: new THREE.MeshStandardMaterial({
            color: '#000000',
            emissive: '#ffffff',
            emissiveMap: t.monitor,
            emissiveIntensity: 0.95,
            roughness: 0.3,
        }),
        tvScreen: std('#ffffff', { map: t.tv, roughness: 0.2, metalness: 0.2 }),
        phoneScreen: new THREE.MeshStandardMaterial({
            color: '#000000',
            emissive: '#ffffff',
            emissiveMap: t.phoneScreen,
            emissiveIntensity: 0.8,
            roughness: 0.25,
        }),
        deviceWhite: std('#f2f2ef', { roughness: 0.4 }),
        vinyl: std('#141416', { roughness: 0.3 }),
        vinylGroove: std('#2a2a2f', { roughness: 0.25 }),
        recordLabel: std('#d9473b', { roughness: 0.6 }),
        keyboard: std('#18181b', { roughness: 0.45 }),
        keycap: std('#2b2b30', { roughness: 0.5 }),
        mouse: std('#1d1d21', { roughness: 0.35 }),
        mousePad: std('#d9c4b2', { roughness: 1 }),
        pcBoard: std('#253b33', { roughness: 0.6 }),
        rgb: new THREE.MeshBasicMaterial({ color: '#ff5fa2' }),

        // the cat
        catFur: std('#ffffff', { map: t.tabby, roughness: 0.9 }),
        catFurPlain: std('#e8913f', { roughness: 0.9 }),
        catCream: std('#f7e6cc', { roughness: 0.9 }),
        catDark: std('#2a1f1a', { roughness: 0.5 }),
        catNose: std('#e98b8b', { roughness: 0.6 }),
        catEye: std('#9bd35a', { roughness: 0.2 }),

        // the game controller
        gamepad: std('#2a2a30', { roughness: 0.45 }),
        padDark: std('#141417', { roughness: 0.5 }),
        padGreen: std('#46c46a', { roughness: 0.3 }),
        padRed: std('#e0474c', { roughness: 0.3 }),
        padBlue: std('#3f7fe0', { roughness: 0.3 }),
        padYellow: std('#f2c230', { roughness: 0.3 }),

        // chess pieces on the shelf
        chessBlack: std('#1d1b1f', { roughness: 0.3 }),
        chessFelt: std('#2f5a3a', { roughness: 1 }),
        xiangqiWood: std('#d8b07a', { roughness: 0.55 }),
        xiangqiFace: std('#ffffff', { map: t.xiangqiHorse, roughness: 0.55 }),

        // wall art
        posterBig: std('#ffffff', { map: t.posterBig, roughness: 0.8 }),
        posterSmallA: std('#ffffff', { map: t.posterSmallA, roughness: 0.8 }),
        posterSmallB: std('#ffffff', { map: t.posterSmallB, roughness: 0.8 }),

        // misc
        books: ['#6b3a26', '#efd9b0', '#b9b5c8', '#e8d2b5', '#2f3b55', '#8a5a3c', '#c2643f', '#5f7a5a', '#d9a066']
            .map(color => std(color, { roughness: 0.7 })),
        jarContents: ['#d9a35b', '#7a4a2a', '#e9e0c9', '#b7744a', '#8f9b5f']
            .map(color => std(color, { roughness: 0.9 })),
    }
}

export type Materials = ReturnType<typeof createMaterials>
