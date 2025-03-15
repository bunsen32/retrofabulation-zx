import { describe, it } from "jsr:@std/testing/bdd"
import { expect } from "jsr:@std/expect"
import {loadVm, stackTop, type Vm} from './testutils/testvm.ts'
import {getScreenMono, cls, type Bitmap, cls1, getScreenColour, clsObscured, assertBitmapImageMatches} from "./testutils/screen.ts"
import {CharsetFromUnicode} from '@zx/sys'
import type {byte} from '@zx/sys'
import { rom } from "./generated/symbols.ts";

const loadedVm = loadVm()

interface TextCoords {
	row: byte,
	column: byte
}

describe("Text rendering", () => {

	it("Can write a screen", async () => {
		const vm = await loadedVm
		cls(vm)

		vm.setRam(0x4000, [0x33, 0x55, 0xff, 0x00, 0x8f])
		vm.core.poke(0x4000, 0xff)
		vm.core.poke(0x4100, 0xfe)
		vm.core.poke(0x4200, 0xfc)
		vm.core.poke(0x4300, 0xf8)
		vm.core.poke(0x4400, 0xf0)
		vm.core.poke(0x4500, 0xe0)
		vm.core.poke(0x4600, 0xc0)
		vm.core.poke(0x4700, 0x80)

		const actual = getScreenMono(vm)
		await assertExpectedImage("shapes", actual)
	})

	it("Render 8-pixel characters", async () => {
		const vm = await loadedVm
		cls1(vm)

		renderAt(vm, 'ReTro…', {row: 0, column: 0})

		const actual = getScreenMono(vm)
		await assertExpectedImage("singlechar", actual)
	})

	it("Render 8-pixel characters advances column", async () => {
		const vm = await loadedVm

		renderAt(vm, 'ReTro…', {row: 20, column: 10})
		const expectedWidth = 12

		const p = getCoordsAfterRendering(vm)
		expect(p.column).toEqual(10 + expectedWidth)
	})

	it("Render 8-pixel characters advances column (on half)", async () => {
		const vm = await loadedVm

		renderAt(vm, 'ReTro…', {row: 20, column: 11})
		const expectedWidth = 12

		const p = getCoordsAfterRendering(vm)
		expect(p.column).toEqual(11 + expectedWidth)
	})

	it("Render 4-pixel characters", async () => {
		const vm = await loadedVm
		cls1(vm)

		renderAt(vm, '‘tf;i’', {row: 1, column: 1})

		const actual = getScreenMono(vm)
		await assertExpectedImage("half-width", actual)
	})

	it("Render 4-pixel characters advances column", async () => {
		const vm = await loadedVm

		renderAt(vm, '‘tf;i’', {row: 20, column: 10})
		const expectedWidth = 6

		const p = getCoordsAfterRendering(vm)
		expect(p.column).toEqual(10 + expectedWidth)
	})

	it("Render 4-pixel characters advances column (on half)", async () => {
		const vm = await loadedVm

		renderAt(vm, '‘tf;i’', {row: 20, column: 11})
		const expectedWidth = 6

		const p = getCoordsAfterRendering(vm)
		expect(p.column).toEqual(11 + expectedWidth)
	})

	it("Render 12-pixel characters", async () => {
		const vm = await loadedVm
		cls1(vm)

		renderAt(vm, 'wm⌫™', {row: 0, column: 0})

		const actual = getScreenMono(vm)
		await assertExpectedImage("extra-width", actual)
	})

	it("Render 12-pixel characters advances column", async () => {
		const vm = await loadedVm

		renderAt(vm, 'wm⌫™', {row: 20, column: 10})
		const expectedWidth = 12

		const p = getCoordsAfterRendering(vm)
		expect(p.column).toEqual(10 + expectedWidth)
	})

	it("Render 12-pixel characters advances column (on half)", async () => {
		const vm = await loadedVm

		renderAt(vm, 'wm⌫™', {row: 20, column: 11})
		const expectedWidth = 12

		const p = getCoordsAfterRendering(vm)
		expect(p.column).toEqual(11 + expectedWidth)
	})

	it("Render at half-cell offset", async () => {
		const vm = await loadedVm
		cls1(vm)
		vm.setRam(0x5820, [7])

		renderAt(vm, 'ReTro…', {row: 1, column: 1})

		const actual = getScreenMono(vm)
		await assertExpectedImage("half-cell-offset", actual)
	})

	it("Render at half-cell offset onto hidden cell", async () => {
		const vm = await loadedVm
		clsObscured(vm)

		renderAt(vm, 'ReTro…', {row: 1, column: 1}, 0b01111000) // Bright white paper

		const actual = getScreenColour(vm)
		await assertExpectedImage("half-cell-offset-hidden", actual)
	})

	it("Colours text 0.5 cells wide", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, '.', {row: 4, column: 4}, 0b01110001)

		const actual = getScreenColour(vm)
		await assertExpectedImage("applies-attrs-0_5", actual)
	})

	it("Colours text 1 cell wide", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, 'R', {row: 4, column: 4}, 0b01110001)

		const actual = getScreenColour(vm)
		await assertExpectedImage("applies-attrs-1", actual)
	})

	it("Colours text 1.5 cells wide", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, 'R!', {row: 4, column: 4}, 0b01110001)

		const actual = getScreenColour(vm)
		await assertExpectedImage("applies-attrs-1_5", actual)
	})

	it("Render mix of characters", async () => {
		const vm = await loadedVm
		cls1(vm)

		renderAt(vm, '‘The Long, Dark Tea-Time’', {row: 0, column: 0})

		const actual = getScreenMono(vm)
		await assertExpectedImage("mix-width", actual)
	})

	it("Does not mangle AF'", async () => {
		const vm = await loadedVm
		vm.setRegisters({AF_: 0x9999})

		renderAt(vm, '::mmA', {row: 4, column: 4})

		const registers = vm.getRegisters()
		expect(registers.AF_).toBe(0x9999)
	})

	it("Does not mangle BC'", async () => {
		const vm = await loadedVm
		vm.setRegisters({BC_: 0x9999})

		renderAt(vm, '::mmA', {row: 4, column: 4})

		const registers = vm.getRegisters()
		expect(registers.BC_).toBe(0x9999)
	})

	it("Does not mangle DE'", async () => {
		const vm = await loadedVm
		vm.setRegisters({DE_: 0x9999})

		renderAt(vm, '::mmA', {row: 4, column: 4})

		const registers = vm.getRegisters()
		expect(registers.DE_).toBe(0x9999)
	})

	it("Does not mangle HL'", async () => {
		const vm = await loadedVm
		vm.setRegisters({HL_: 0x9999})

		renderAt(vm, '::mmA', {row: 4, column: 4})

		const registers = vm.getRegisters()
		expect(registers.HL_).toBe(0x9999)
	})

})

describe("Text measuring", () => {

	it("4-pixel character returns 1", async () => {
		const vm = await loadedVm

		vm.setRegisters({ A: charCode(':') })
		vm.callSubroutine(rom.MEASURE_CHAR, 200)

		const result = vm.getRegisters().A
		expect(result).toBe(1)
	})

	it("8-pixel character returns 2", async () => {
		const vm = await loadedVm

		vm.setRegisters({ A: charCode('A') })
		vm.callSubroutine(rom.MEASURE_CHAR, 200)

		const result = vm.getRegisters().A
		expect(result).toBe(2)
	})

	it("12-pixel character returns 3", async () => {
		const vm = await loadedVm

		vm.setRegisters({ A: charCode('w') })
		vm.callSubroutine(rom.MEASURE_CHAR, 200)

		const result = vm.getRegisters().A
		expect(result).toBe(3)
	})})

function charCode(singleChar: string) {
	expect(singleChar).toHaveLength(1)
	return CharsetFromUnicode[singleChar.charAt(0)]
}

function renderAt(vm: Vm, text: string, p: TextCoords, attr: byte = 0b00111000, maxWidth: byte = 127) {
	const charBytes: byte[] = []
	const textLength = text.length as byte
	for(let i = 0; i < textLength; i++) {
		const c = CharsetFromUnicode[text.charAt(i)]
		charBytes[i] = c
	}
	vm.setRam(0x9000, charBytes)
	vm.setRegisters({
		SP: stackTop,
		DE: 0x9000,
		B: textLength as byte,
		C: maxWidth,
		A: attr,
		H: p.row,
		L: p.column
	 })
	vm.setRam(0x8000, [
		0xCD, 0x00, 0x08, // call $0800
		0x76, // HALT
	])
	vm.runPcAt({addr:0x8000}, 3000 + 660 * textLength)
}

function getCoordsAfterRendering(vm: Vm): TextCoords {
	const r = vm.getRegisters()
	return {row: r.H, column: r.L}
}

async function assertExpectedImage(expectedPngFilename: string, actualOutput: Bitmap): Promise<void> {
	await assertBitmapImageMatches('textrender.test', expectedPngFilename, actualOutput)
}

