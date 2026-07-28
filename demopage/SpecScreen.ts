import type {CanvasRenderingContext2D} from 'npm:@types/web' 

const black = '#000'
const blue = '#0100CE'
const red = '#CF0100'
const magenta = '#CF01CE'
const green = '#00CF15'
const cyan = '#01CFCF'
const yellow = '#CFCF15'
const white = '#CFCFCF'

const brightBlack = '#444'
const brightBlue = '#0200FD'
const brightRed = '#FF0201'
const brightMagenta = '#FF02FD'
const brightGreen = '#00FF1C'
const brightCyan = '#02FFFF'
const brightYellow = '#FFFF1D'
const brightWhite = '#FFFFFF'

const webColours = {
	black,
	blue,
	red,
	magenta,
	green,
	cyan,
	yellow,
	white,

	brightBlack,
	brightBlue,
	brightRed,
	brightMagenta,
	brightGreen,
	brightCyan,
	brightYellow,
	brightWhite
}

const colourIndexes = {
	'black': 0,
	'blue': 1,
	'red': 2,
	'magenta': 3,
	'green': 4,
	'cyan': 5,
	'yellow': 6,
	'white': 7,

	'brightBlack': 8,
	'brightBlue': 9,
	'brightRed': 10,
	'brightMagenta': 11,
	'brightGreen': 12,
	'brightCyan': 13,
	'brightYellow': 14,
	'brightWhite': 15
}
export type ColourName = keyof typeof webColours
export type Attr = {ink: ColourName, paper: ColourName}

const inkMask = 0b10000111
const inkColours = {
	0b00000000: 'black',
	0b00000001: 'blue',
	0b00000010: 'red',
	0b00000011: 'magenta',
	0b00000100: 'green',
	0b00000101: 'cyan',
	0b00000110: 'yellow',
	0b00000111: 'white',

	0b10000000: 'brightBlack',
	0b10000001: 'brightBlue',
	0b10000010: 'brightRed',
	0b10000011: 'brightMagenta',
	0b10000100: 'brightGreen',
	0b10000101: 'brightCyan',
	0b10000110: 'brightYellow',
	0b10000111: 'brightWhite',	
} as const satisfies Record<number, ColourName>
const inkColourBits = invert(inkColours)

const paperMask = 0b01111000
const paperColours = {
	0b00000000: 'black',
	0b00001000: 'blue',
	0b00010000: 'red',
	0b00011000: 'magenta',
	0b00100000: 'green',
	0b00101000: 'cyan',
	0b00110000: 'yellow',
	0b00111000: 'white',

	0b01000000: 'brightBlack',
	0b01001000: 'brightBlue',
	0b01010000: 'brightRed',
	0b01011000: 'brightMagenta',
	0b01100000: 'brightGreen',
	0b01101000: 'brightCyan',
	0b01110000: 'brightYellow',
	0b01111000: 'brightWhite',	
} as const satisfies Record<number, ColourName>
const paperColourBits = invert(paperColours)

function invert<K extends number|string, V extends number|string>(obj: Record<K, V>): Record<V, K> {
    const out = {} as Partial<Record<V, K>>
    for (const key in obj) {
        out[obj[key]] = key
    }
    return out as Record<V, K>
}

type WebInkAndPaper = [ink: string, paper: string]
export function webColoursFromAttr(attr: number): WebInkAndPaper {
	return [
		webColours[inkColours[(attr & inkMask) as keyof typeof inkColours]],
		webColours[paperColours[(attr & paperMask) as keyof typeof paperColours]]
	]
}

export class SpecScreen {
	public readonly width: number
	public readonly height: number
	readonly data: ArrayBuffer
	readonly pixelData: Uint8Array
	readonly attrData: Uint8Array

	readonly cx?: CanvasRenderingContext2D

	public constructor(renderingContext?: CanvasRenderingContext2D, public readonly columns: number = 32, public readonly rows: number = 24) {
		this.width = columns * 8
		this.height = rows * 8
		const pixelBytes = columns * this.height
		const attrBytes = columns * rows
		this.data = new ArrayBuffer(pixelBytes + attrBytes)
		this.pixelData = new Uint8Array(this.data, 0, pixelBytes)
		this.attrData = new Uint8Array(this.data, pixelBytes, attrBytes)

		this.cx = renderingContext
	}

	public cls(paper: Attr){
		const attrBits = this.bitsFromAttr(paper)
		this.cx.fillStyle = webColoursFromAttr(attrBits)[1]
		this.cx.fillRect(0, 0, this.width, this.height)
		this.pixelData.fill(0)
		this.attrData.fill(attrBits)
	}

	public pixel(x: number, y: number, v: boolean): void {
		if (v)
			this.setPixel(x, y)
		else
			this.clearPixel(x, y)
	}

	public setPixel(x: number, y: number): void {
		const index = this.pixelByteIndex(x >> 3, y)
		if (index == undefined) return

		const [ink, _] = this.webColoursForPixel(x, y)
		const offset = x % 8
		this.pixelData[index] |= (1 << (7 - offset))

		if (!this.cx) return
		this.cx.fillStyle = ink
		this.cx.fillRect(x, y, 1, 1)
	}

	public clearPixel(x: number, y: number): void {
		const index = this.pixelByteIndex(x >> 3, y)
		if (index == undefined) return

		const [_, paper] = this.webColoursForPixel(x, y)
		const offset = x % 8
		this.pixelData[index] &= (0xff ^ (1 << (7 - offset)))
		
		if (!this.cx) return
		this.cx.fillStyle = paper
		this.cx.fillRect(x, y, 1, 1)
	}

	public setByte(col: number, y: number, v: number): void {
		const i = this.pixelByteIndex(col, y)
		if (i == undefined) return

		this.drawByte(col, y, v, this.coloursForCell(col, y >> 3))
		this.pixelData[i] = v
	}

	public orByte(col: number, y: number, byte: number): void {
		const i = this.pixelByteIndex(col, y)
		if (i == undefined) return

		const v = this.pixelData[i] | byte
		this.drawByte(col, y, v, this.coloursForCell(col, y >> 3))
		this.pixelData[i] = v
	}

	public andByte(col: number, y: number, byte: number): void {
		const i = this.pixelByteIndex(col, y)
		if (i == undefined) return

		const v = this.pixelData[i] & byte
		this.drawByte(col, y, v, this.coloursForCell(col, y >> 3))
		this.pixelData[i] = v
	}

	public setAttr(col: number, row: number, attr: Attr): void;
	public setAttr(col: number, row: number, ink: ColourName, paper: ColourName, isBright: boolean): void;
	public setAttr(col: number, row: number, inkOrAttr: ColourName|Attr, paper?: ColourName, isBright?: boolean) {
		const attrIndex = this.attrByteIndex(col, row)
		if (attrIndex == undefined) return

		const attr = (!paper)
			? (inkOrAttr as Attr)
			: {ink: inkOrAttr as ColourName, paper: paper as ColourName, isBright: isBright as boolean}

		const v = this.bitsFromAttr(attr)
		this.attrData[attrIndex] = v

		// Redraw the cell with new attributes:
		const inkAndPaper = webColoursFromAttr(v)
		let y = row << 3
		for (let i = 0; i < 8; i ++) {
			const pixelIndex = this.pixelByteIndex(col, y)
			if (pixelIndex == undefined) break

			const byte = this.pixelData[pixelIndex]
			this.drawByte(col, y, byte, inkAndPaper)
			y ++
		}
	}

	public bitsFromAttr(a: Attr): number {
		return inkColourBits[a.ink] |
			paperColourBits[a.paper]
	}

	private drawByte(col: number, y: number, byte: number, inkAndPaper: WebInkAndPaper) {
		let x = col << 3
		let mask = 0x80
		const cx = this.cx
		const [ink, paper] = inkAndPaper
		for (let i = 0; i < 8; i++) {
			cx.fillStyle = (byte & mask) ? ink : paper
			cx.fillRect(x, y, 1, 1)
			x ++
			mask = mask >> 1
		}
	}

	private webColoursForPixel(x: number, y: number): WebInkAndPaper {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) throw `out of range ${x},${y}`
		return webColoursFromAttr(
			this.attrForCell(x>>3, y>>3))
	}

	private coloursForCell(col: number, row: number): WebInkAndPaper {
		return webColoursFromAttr(
			this.attrForCell(col, row))
	}

	private attrForCell(col: number, row: number): number {
		const ix = this.attrByteIndex(col, row)
		if (ix == undefined) throw "out of range"
		return this.attrData[ix]
	}

	private attrByteIndex(col: number, row: number): number|undefined {
		if (col < 0 || row < 0 || col >= this.columns || row >= this.rows) return undefined
		return row * this.columns + col
	}

	private pixelByteIndex(col: number, y: number): number|undefined {
		if (col < 0 || y < 0 || col >= this.columns || y >= this.height) return undefined
		return y * this.columns + col
	}
}