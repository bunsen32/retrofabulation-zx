// Test the startup sequence:
import { describe, it } from "jsr:@std/testing/bdd";
import {loadVm, type Vm} from './testutils/testvm.ts'
import {getScreenMono, type Bitmap, cls1, getScreenColour, assertBitmapImageMatches, clearAttrs} from "./testutils/screen.ts"
import {rom} from './generated/symbols.ts'
import { existsSync } from "node:fs";
import { readLinesFromFile } from "./testutils/files.ts";
import { expect } from "jsr:@std/expect/expect";

const rootActualMismatchFiles = "./testout"

const loadedVm = loadVm()
const YELLOW_ON_YELLOW = 0b00110110 // yellow ink & paper
const CYAN_ON_YELLOW = 0b00101110

describe("Splash-screen", () => {

	it("Splash initially sets screen to blue", async () => {
		const vm = await loadedVm
		cls1(vm)

		vm.runPcAt(rom.SPLASH_INIT, 20000)

		const actual = getScreenColour(vm)
		await assertExpectedImage("splash-colour", actual)
	})

	it("Splash prepares zigzag pixels", async () => {
		const vm = await loadedVm
		cls1(vm)

		vm.runPcAt(rom.SPLASH_INIT, 200000)

		const actual = getScreenMono(vm)
		await assertExpectedImage("splash-pixels", actual)
	})

	it("UnitTests prepare zigzag pixels", async () => {
		const vm = await loadedVm

		writeZigzags(vm)

		const actual = getScreenMono(vm)
		await assertExpectedImage("zigzag-pixels", actual)
	})

	it("Splash stripe mid", async () => {
		const vm = await loadedVm
		writeZigzags(vm)
		clearAttrs(vm, YELLOW_ON_YELLOW)

		vm.setRegisters({A: 20, C: CYAN_ON_YELLOW})
		vm.callSubroutine(rom.STRIPE, 1500)

		const actual = getScreenColour(vm)
		await assertExpectedImage("stripe-mid", actual)
	})

	it("Splash stripe 0", async () => {
		const vm = await loadedVm
		writeZigzags(vm)
		clearAttrs(vm, YELLOW_ON_YELLOW)

		vm.setRegisters({A: 0, C: CYAN_ON_YELLOW})
		vm.callSubroutine(rom.STRIPE, 1500)

		const actual = getScreenColour(vm)
		await assertExpectedImage("stripe-0", actual)
	})

	it("Splash stripe 10", async () => {
		const vm = await loadedVm
		writeZigzags(vm)
		clearAttrs(vm, YELLOW_ON_YELLOW)

		vm.setRegisters({A: 10, C: CYAN_ON_YELLOW})
		vm.callSubroutine(rom.STRIPE, 1500)

		const actual = getScreenColour(vm)
		await assertExpectedImage("stripe-10", actual)
	})

	it("Splash stripe 32", async () => {
		const vm = await loadedVm
		writeZigzags(vm)
		clearAttrs(vm, YELLOW_ON_YELLOW)

		vm.setRegisters({A: 32, C: CYAN_ON_YELLOW})
		vm.callSubroutine(rom.STRIPE, 1500)

		const actual = getScreenColour(vm)
		await assertExpectedImage("stripe-32", actual)
	})

	it("Splash stripe 35", async () => {
		const vm = await loadedVm
		writeZigzags(vm)
		clearAttrs(vm, YELLOW_ON_YELLOW)

		vm.setRegisters({A: 35, C: CYAN_ON_YELLOW})
		vm.callSubroutine(rom.STRIPE, 1500)

		const actual = getScreenColour(vm)
		await assertExpectedImage("stripe-35", actual)
	})

	it('Correctly copies User Defined Graphics', async () => {
		const vm = await loadedVm

		vm.callSubroutine(rom.RESET_UDG, 10000)

		const mem = vm.getRam(rom.UDG_RAM_START.addr, rom.UDG_RAM_LENGTH.addr)
		const lines = []
		for(let i=0; i < 16; i++){
			let line = ''
			for (let b=0; b < 9; b++){
				line += (b === 0 ? '' : ' ') + `${hex16(mem[i * 9 + b])}`
			}
			lines.push(line)
		}
		await assertExpectedLines('user-defined-graphics', lines)
	})
})

async function assertExpectedImage(expectedPngFilename: string, actualOutput: Bitmap): Promise<void> {
	await assertBitmapImageMatches('startup.test', expectedPngFilename, actualOutput)
}

export async function assertExpectedLines(filename: string, actualOutput: string[]): Promise<void> {
	const expectFilePath = `startup.test/${filename}-expected.txt`
	try{
		if (!existsSync(expectFilePath)) throw `Not found: ${expectFilePath}`
		const expected = await readLinesFromFile(expectFilePath)
		expect(actualOutput).toEqual(expected)

	} catch(problem) {
		const actualFilePath = expectFilePath.replace('-expected.', '-actual.')
		const actualFullPath = `${rootActualMismatchFiles}/${actualFilePath}`
		for(const line of actualOutput) {
			console.error(line)
		}
		throw problem
	}
}

function writeZigzags(vm: Vm) {
	const core = vm.core
	let p = 0x4000
	for(let y = 0, n = 192; n > 0; y ++, n --) {
		const i = ((y >> 3) & 0b111) | ((y << 3) & 0b1000)
		const pattern = 0b1111_1111 >>> (7 - (i >> 1))
		for(let x = 0; x < 32; x++) {
			core.poke(p, pattern)
			p++
		}
	}
}

export function hex16(word: number): string {
	const hex = word.toString(16)
	return hex.length === 1
		? `0${hex}`
		: hex
}