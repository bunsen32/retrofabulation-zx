import type {CanvasRenderingContext2D} from 'npm:@types/web' 

const black = '#000'

const blue = '#0100CE'
const red = '#CF0100'
const magenta = '#CF01CE'
const green = '#00CF15'
const cyan = '#01CFCF'
const yellow = '#CFCF15'
const white = '#CFCFCF'

const brightBlue = '#0200FD'
const brightRed = '#FF0201'
const brightMagenta = '#FF02FD'
const brightGreen = '#00FF1C'
const brightCyan = '#02FFFF'
const brightYellow = '#FFFF1D'
const brightWhite = '#FFFFFF'

const colourIndexes = {
	'black': 0,
	'blue': 1,
	'red': 2,
	'magenta': 3,
	'green': 4,
	'cyan': 5,
	'yellow': 6,
	'white': 7
}
export type Colour = keyof typeof colourIndexes
export type Attr = {ink: Colour, paper: Colour, isBright: boolean}

const inkMask = 0b01000111
const inkColours = {
	0b00000000: black,
	0b00000001: blue,
	0b00000010: red,
	0b00000011: magenta,
	0b00000100: green,
	0b00000101: cyan,
	0b00000110: yellow,
	0b00000111: white,

	0b01000000: black,
	0b01000001: brightBlue,
	0b01000010: brightRed,
	0b01000011: brightMagenta,
	0b01000100: brightGreen,
	0b01000101: brightCyan,
	0b01000110: brightYellow,
	0b01000111: brightWhite,	
}

const paperMask = 0b01111000
const paperColours = {
	0b00000000:black,
	0b00001000:blue,
	0b00010000:red,
	0b00011000:magenta,
	0b00100000:green,
	0b00101000:cyan,
	0b00110000:yellow,
	0b00111000:white,

	0b01000000:black,
	0b01001000:brightBlue,
	0b01010000:brightRed,
	0b01011000:brightMagenta,
	0b01100000:brightGreen,
	0b01101000:brightCyan,
	0b01110000:brightYellow,
	0b01111000:brightWhite,	
}


type InkAndPaper = [ink: string, paper: string]
export function coloursFromAttr(attr: number): InkAndPaper {
	return [
		inkColours[(attr & inkMask) as keyof typeof inkColours],
		paperColours[(attr & paperMask) as keyof typeof paperColours]
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
		this.cx.fillStyle = coloursFromAttr(attrBits)[1]
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
		const [ink, _] = this.coloursForPixel(x, y)
		const index = this.pixelByteIndex(x >> 3, y)
		const offset = x % 8
		this.pixelData[index] |= (1 << (7 - offset))

		if (!this.cx) return
		this.cx.fillStyle = ink
		this.cx.fillRect(x, y, 1, 1)
	}

	public clearPixel(x: number, y: number): void {
		const [_, paper] = this.coloursForPixel(x, y)
		const index = this.pixelByteIndex(x >> 3, y)
		const offset = x % 8
		this.pixelData[index] &= (0xff ^ (1 << (7 - offset)))
		
		if (!this.cx) return
		this.cx.fillStyle = paper
		this.cx.fillRect(x, y, 1, 1)
	}

	public setByte(col: number, y: number, v: number): void {
		const i = this.pixelByteIndex(col, y)
		this.drawByte(col, y, v, this.coloursForCell(col, y >> 3))
		this.pixelData[i] = v
	}

	public orByte(col: number, y: number, byte: number): void {
		const i = this.pixelByteIndex(col, y)
		const v = this.pixelData[i] | byte
		this.drawByte(col, y, v, this.coloursForCell(col, y >> 3))
		this.pixelData[i] = v
	}

	public andByte(col: number, y: number, byte: number): void {
		const i = this.pixelByteIndex(col, y)
		const v = this.pixelData[i] & byte
		this.drawByte(col, y, v, this.coloursForCell(col, y >> 3))
		this.pixelData[i] = v
	}

	public setAttr(col: number, row: number, attr: Attr): void;
	public setAttr(col: number, row: number, ink: Colour, paper: Colour, isBright: boolean): void;
	public setAttr(col: number, row: number, inkOrAttr: Colour|Attr, paper?: Colour, isBright?: boolean) {
		if (col < 0 || row < 0 || col >= this.columns || row >= this.rows) return

		const attr = (!paper)
			? (inkOrAttr as Attr)
			: {ink: inkOrAttr as Colour, paper: paper as Colour, isBright: isBright as boolean}

		const v = this.bitsFromAttr(attr)
		this.attrData[row * this.columns + col] = v

		// Redraw the cell with new attributes:
		const inkAndPaper = coloursFromAttr(v)
		let y = row << 3
		for (let i = 0; i < 8; i ++) {
			const byte = this.pixelData[this.pixelByteIndex(col, y)]
			this.drawByte(col, y, byte, inkAndPaper)
			y ++
		}
	}

	public bitsFromAttr(a: Attr): number {
		return colourIndexes[a.ink] |
			(colourIndexes[a.paper] << 3) |
			(a.isBright ? 0x40 : 0x00)
	}

	private drawByte(col: number, y: number, byte: number, inkAndPaper: InkAndPaper) {
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

	private coloursForPixel(x: number, y: number): InkAndPaper {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) throw `out of range ${x},${y}`
		return coloursFromAttr(
			this.attrForCell(x>>3, y>>3))
	}

	private coloursForCell(col: number, row: number): InkAndPaper {
		return coloursFromAttr(
			this.attrForCell(col, row))
	}

	private attrForCell(col: number, row: number): number {
		if (col < 0 || row < 0 || col >= this.columns || row >= this.rows) throw "out of range"
		return this.attrData[row * this.columns + col]
	}

	private pixelByteIndex(col: number, y: number): number {
		if (col < 0 || y < 0 || col >= this.columns || y >= this.height) throw "out of range"
		return y * this.columns + col
	}
}