import {Vm} from './testvm'
import * as PImage from 'pureimage'
import { createWriteStream, createReadStream, existsSync } from 'fs'
import * as fs from 'fs'
import * as path from 'path'
import { expect } from '@jest/globals'

export function cls(vm: Vm) {
	const core = vm.core
	for(let p = 0x4000, n = 32 * 192; n > 0; p ++, n --) {
		core.poke(p, 0)
	}
}

export function cls1(vm: Vm) {
	const core = vm.core
	for(let p = 0x4000, n = 32 * 192; n > 0; p ++, n --) {
		core.poke(p, 255)
	}
}

export type Bitmap = PImage.Bitmap

export function getScreenMono(vm: Vm, xStart: number = 0, yStart: number = 0, w: number = 256, h: number = 192): Bitmap {
	if ((xStart & 0b111) !== 0) throw "xStart coordinate must lie on byte boundary."
	if ((w & 0b111) !== 0) throw "w size must be integer number of bytes."
	const colStart = xStart >> 3
	const colCount = w >> 3
	const clip = PImage.make(w, h)
	const context = clip.getContext("2d")
	const pixels = context.getImageData(0, 0, w, h)
	const pixelData = pixels.data

	let pixelByte = 0
	function writeMono(v: boolean) {
		const vByte = v ? 0 : 255
		pixelData[pixelByte++] = vByte // R
		pixelData[pixelByte++] = vByte // G
		pixelData[pixelByte++] = vByte // B
		pixelData[pixelByte++] = 255 // A
	}
	for (let y = yStart, hRemaining = h; hRemaining > 0; y ++, hRemaining --) {
		const lineAddress = lineAddressFromY(y)
		const pStart = lineAddress + colStart
		for (let p = pStart, bRemaining = colCount; bRemaining > 0; p ++, bRemaining --) {
			const b = vm.core.peek(p)
			for (let mask = 0x80; mask != 0; mask >>= 1) {
				writeMono((b & mask) !== 0)
			}
		}
	}

	context.putImageData(pixels, 0, 0)
	return clip
}

export async function writeClip(clipImage: Bitmap, filename: string) {
	await fs.promises.mkdir(path.dirname(filename), { recursive: true })
	await PImage.encodePNGToStream(clipImage, createWriteStream(filename))
}

export async function readClip(filename: string): Promise<Bitmap|null> {
	if (!existsSync(filename)) return Promise.resolve(null)
	return await PImage.decodePNGFromStream(createReadStream(filename))
}

export function assertSamePixels(expected: Bitmap, actual: Bitmap) {
	const w = expected.width
	const h = expected.height
	expect(actual.width).toBe(w)
	expect(actual.height).toBe(h)
	const expectedData = expected.getContext("2d").getImageData(0, 0, w, h).data
	const actualData = actual.getContext("2d").getImageData(0, 0, w, h).data
	for(let i = 0; i < expectedData.length; i++) {
		if (actualData[i] != expectedData[i])
			throw "Mismatch at byte "+i
	}
}

function lineAddressFromY(y: number) {
	return 0x4000 +
		(((y >> 6) & 0b11) << 11) +
		((y & 0b111) << 8) +
		(((y >> 3) & 0b111) << 5)
}
