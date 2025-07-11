import type {Vm} from './testvm.ts'
import { coloursFromAttr, type RGB } from '@zx/sys'
import * as PImage from 'pureimage'
import { createWriteStream, createReadStream, existsSync } from 'node:fs'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { expect } from "jsr:@std/expect";
import type { byte } from '@zx/sys'
import { readStream, writeStream } from "./files.ts";

const rootExpectedFiles = "./"
const rootActualMismatchFiles = "./testout"

export function cls(vm: Vm) {
	const core = vm.core
	for(let p = 0x4000, n = 32 * 192; n > 0; p ++, n --) {
		core.poke(p, 0)
	}
	clearAttrs(vm, 0b00111000) // Standard black ink on white paper
}

export function cls1(vm: Vm) {
	const core = vm.core
	for(let p = 0x4000, n = 32 * 192; n > 0; p ++, n --) {
		core.poke(p, 255)
	}
	clearAttrs(vm, 0b00111000) // Standard black ink on white paper
}

export function clearAttrs(vm: Vm, attr: byte) {
	const core = vm.core
	for(let p = 0x5800, n = 32 * 24; n > 0; p ++, n --) {
		core.poke(p, attr)
	}
}

export function clsObscured(vm: Vm) {
	const core = vm.core
	for(let p = 0x4000, n = 32 * 192; n > 0; p ++, n --) {
		core.poke(p, 0xAA)
	}
	for(let p = 0x5800, n = 32 * 24; n > 0; p ++, n --) {
		core.poke(p, 0b00000000) // Black-on-black
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
		const pStart = lineAddressFromY(y) + colStart
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

export function getScreenColour(vm: Vm, xStart: number = 0, yStart: number = 0, w: number = 256, h: number = 192): Bitmap {
	if ((xStart & 0b111) !== 0) throw "xStart coordinate must lie on byte boundary."
	if ((w & 0b111) !== 0) throw "w size must be integer number of bytes."
	const colStart = xStart >> 3
	const colCount = w >> 3
	const clip = PImage.make(w, h)
	const context = clip.getContext("2d")
	const pixels = context.getImageData(0, 0, w, h)
	const pixelData = pixels.data

	let pixelByte = 0
	function writeAttr(c: RGB) {
		pixelData[pixelByte++] = c[0] // R
		pixelData[pixelByte++] = c[1] // G
		pixelData[pixelByte++] = c[2] // B
		pixelData[pixelByte++] = 255 // A
	}
	for (let y = yStart, hRemaining = h; hRemaining > 0; y ++, hRemaining --) {
		const pStart = lineAddressFromY(y) + colStart
		const aStart = attrLineAddressFromY(y) + colStart
		for (let
			p = pStart, pa = aStart, bRemaining = colCount;
			bRemaining > 0;
			p ++, pa++, bRemaining --) {

			const b = vm.core.peek(p)
			const inkAndPaper = coloursFromAttr(vm.core.peek(pa))
			for (let mask = 0x80; mask != 0; mask >>= 1) {
				const v = (b & mask) !== 0
				writeAttr(v ? inkAndPaper[1] : inkAndPaper[0])
			}
		}
	}

	context.putImageData(pixels, 0, 0)
	return clip
}

export async function assertBitmapImageMatches(subdir: string, expectedPngFilename: string, actualOutput: Bitmap): Promise<void> {
	const expectFilePath = `${subdir}/${expectedPngFilename}-expected.png`
	const expected = await readClip(`${rootExpectedFiles}/${expectFilePath}`)
	try {
		if (!expected) throw `Cannot find file: ${expectFilePath}`
		assertSamePixels(expected, actualOutput)

	} catch (problem) {
		const actualFilePath = expectFilePath.replace('-expected.', '-actual.')
		const actualFullPath = `${rootActualMismatchFiles}/${actualFilePath}`
		await writeClip(actualOutput, actualFullPath)
		throw problem
	}
}

export async function writeClip(clipImage: Bitmap, filename: string) {
	await fs.promises.mkdir(path.dirname(filename), { recursive: true })
	const [output, closeEvent] = writeStream(filename)
	try {
		await PImage.encodePNGToStream(clipImage, output)
	} finally {
		await closeEvent
	}
}

export async function readClip(filename: string): Promise<Bitmap|null> {
	if (!existsSync(filename)) return Promise.resolve(null)
	const [input, closeEvent] = readStream(filename)
	const result = await PImage.decodePNGFromStream(input)
	await closeEvent
	return result
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
function attrLineAddressFromY(y: number) {
	const row = y >> 3
	return 0x5800 + (row * 32)
}
