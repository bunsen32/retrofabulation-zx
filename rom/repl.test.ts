import { describe, it } from "jsr:@std/testing/bdd"
import {loadVm, type Vm} from './testutils/testvm.ts'
import {getScreenMono, cls, type Bitmap, cls1, assertBitmapImageMatches} from "./testutils/screen.ts"
import type { byte } from '@zx/sys'
import { rom } from "./generated/symbols.ts";
import { expect } from "jsr:@std/expect/expect";

const loadedVm = loadVm()
const flashRate = rom.CURSOR_FLASH_RATE.addr

describe("Cursor XOR", () => {

	it("Cursor onto blank background, aligned", async () => {
		const vm = await loadedVm
		vm.pokeWord(rom.CURSOR_XY, 0x0302)
		cls(vm)

		cursorXor(vm)

		const actual = getScreenMono(vm)
		await assertExpectedImage("black-on-white-cursor-0", actual)
	})

	it("Cursor onto blank background, offset", async () => {
		const vm = await loadedVm
		vm.pokeWord(rom.CURSOR_XY, 0x0303)
		cls(vm)

		cursorXor(vm)

		const actual = getScreenMono(vm)
		await assertExpectedImage("black-on-white-cursor-1", actual)
	})

	it("Cursor onto filled background, aligned", async () => {
		const vm = await loadedVm
		vm.pokeWord(rom.CURSOR_XY, 0x0302)
		cls1(vm)

		cursorXor(vm)

		const actual = getScreenMono(vm)
		await assertExpectedImage("white-on-black-cursor-0", actual)
	})

	it("Cursor onto filled background, offset", async () => {
		const vm = await loadedVm
		vm.pokeWord(rom.CURSOR_XY, 0x0303)
		cls1(vm)

		cursorXor(vm)

		const actual = getScreenMono(vm)
		await assertExpectedImage("white-on-black-cursor-1", actual)
	})
})

describe("Cursor animation", () => {

	it("If 1 frame in count, renders", async () => {
		const vm = await loadedVm
		vm.pokeWord(rom.CURSOR_XY, 0x0302)
		vm.pokeByte(rom.CURSOR_FRAMES, animState(1, 'on'))
		cls(vm)

		cursorAnimFrame(vm)

		const actual = getScreenMono(vm)
		await assertExpectedImage("black-on-white-cursor-0", actual)
	})

	it("If 2 frames in count, does not render", async () => {
		const vm = await loadedVm
		vm.pokeWord(rom.CURSOR_XY, 0x0302)
		vm.pokeByte(rom.CURSOR_FRAMES, animState(2, 'on'))
		cls(vm)

		cursorAnimFrame(vm)

		const actual = getScreenMono(vm)
		await assertExpectedImage("blank-screen", actual)
	})

	it("If multiple frames in count (and on), decrements count", async () => {
		const vm = await loadedVm
		vm.pokeWord(rom.CURSOR_XY, 0x0302)
		vm.pokeByte(rom.CURSOR_FRAMES, animState(12, 'on'))
		cls(vm)

		cursorAnimFrame(vm)

		expect(vm.peekByte(rom.CURSOR_FRAMES)).toBe(animState(11, 'on'))
	})

	it("If multiple frames in count (and off), decrements count", async () => {
		const vm = await loadedVm
		vm.pokeWord(rom.CURSOR_XY, 0x0302)
		vm.pokeByte(rom.CURSOR_FRAMES, animState(12, 'off'))
		cls(vm)

		cursorAnimFrame(vm)

		expect(vm.peekByte(rom.CURSOR_FRAMES)).toBe(animState(11, 'off'))
	})


	it("If 1 frame in count (and on), resets count", async () => {
		const vm = await loadedVm
		vm.pokeWord(rom.CURSOR_XY, 0x0302)
		vm.pokeByte(rom.CURSOR_FRAMES, animState(1, 'on'))
		cls(vm)

		cursorAnimFrame(vm)

		expect(vm.peekByte(rom.CURSOR_FRAMES)).toBe(animState(flashRate, 'off'))
	})

	it("If 1 frame in count (and off), resets count", async () => {
		const vm = await loadedVm
		vm.pokeWord(rom.CURSOR_XY, 0x0302)
		vm.pokeByte(rom.CURSOR_FRAMES, animState(1, 'off'))
		cls(vm)

		cursorAnimFrame(vm)

		expect(vm.peekByte(rom.CURSOR_FRAMES)).toBe(animState(flashRate, 'on'))
	})
})

function cursorXor(vm: Vm) {
	vm.callSubroutine(rom.CURSOR_XOR, 1000)
}

function cursorAnimFrame(vm: Vm) {
	vm.callSubroutine(rom.CURSOR_ANIM_FRAME, 1000)
}

async function assertExpectedImage(expectedPngFilename: string, actualOutput: Bitmap): Promise<void> {
	await assertBitmapImageMatches('repl.test', expectedPngFilename, actualOutput)
}

function animState(frameCount: number, appear: 'on'|'off'): byte {
	return ((frameCount << 1) | (appear == 'on' ? 1 : 0)) as byte
}