import {byte} from './Byte.ts'
export type RGB = [red: byte, green: byte, blue: byte]

export const black: RGB = [0, 0, 0]

export const blue: RGB = [0x01, 0x00, 0xCE]
export const red: RGB = [0xCF, 0x01, 0x00]
export const magenta: RGB = [0xCF, 0x01, 0xCE]
export const green: RGB = [0x00, 0xCF, 0x15]
export const cyan: RGB = [0x01, 0xCF, 0xCF]
export const yellow: RGB = [0xCF, 0xCF, 0x15]
export const white: RGB = [0xCF, 0xCF, 0xCF]

export const brightBlue: RGB = [0x02, 0x00, 0xFD]
export const brightRed: RGB = [0xFF, 0x02, 0x01]
export const brightMagenta: RGB = [0xFF, 0x02, 0xFD]
export const brightGreen: RGB = [0x00, 0xFF, 0x1C]
export const brightCyan: RGB = [0x02, 0xFF, 0xFF]
export const brightYellow: RGB = [0xFF, 0xFF, 0x1D]
export const brightWhite: RGB = [0xFF, 0xFF, 0xFF]

export type PaperAndInk = [ink: RGB, paper: RGB]

export const inkMask = 0b01000111
export const inkColours = {
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

export const paperMask = 0b01111000
export const paperColours = {
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

export function coloursFromAttr(attr: byte): PaperAndInk {
	return [
		paperColours[(attr & paperMask) as keyof typeof paperColours],
		inkColours[(attr & inkMask) as keyof typeof inkColours]
	]
}
