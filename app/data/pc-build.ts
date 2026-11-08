export interface PcPart {
    /** What the part is, e.g. 'CPU'. */
    part: string
    name: string
}

/** My setup: what is inside the PC tower under the desk, then the desk gear, listed under the cutaway drawing. */
export const PC_BUILD: PcPart[] = [
    { part: 'Case', name: 'Micro-ATX tower' },
    { part: 'CPU', name: 'AMD Ryzen 7 7800X3D' },
    { part: 'RAM', name: '16GB 5600 MHz stick × 2' },
    { part: 'Cooler', name: 'Mute Cooler AIO liquid cooler' },
    { part: 'GPU', name: 'AMD Radeon RX 7600 XT' },
    { part: 'Keyboard', name: 'Ajazz AC064 mechanical keyboard' },
    { part: 'Mouse', name: 'ATK Blazing Sky X1 Pro Max, Logitech G903 Hero' },
]
