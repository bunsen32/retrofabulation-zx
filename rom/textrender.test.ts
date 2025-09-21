import { describe, it } from "jsr:@std/testing/bdd"
import { expect } from "jsr:@std/expect"
import {asBytes, loadVm, stackTop, type Vm} from './testutils/testvm.ts'
import {getScreenMono, cls, type Bitmap, cls1, getScreenColour, clsObscured, assertBitmapImageMatches} from "./testutils/screen.ts"
import {CharsetFromUnicode} from '@zx/sys'
import type {byte} from '@zx/sys'
import { rom } from "./generated/symbols.ts";

const loadedVm = loadVm()
const globals = rom.G

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

	it("Does not colour when 1.5-cell character is clipped", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, 'm', {row: 7, column: 62}, 0b01110001)

		const actual = getScreenColour(vm)
		await assertExpectedImage("no-colouring-when-clipped-1_5", actual)
	})

	// This result is not quite correct: We should probably not colour ANYTHING in when 
	// position starts and ends on same odd half-cell boundary
	it("Does not colour when 1-cell character is clipped", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, 'R', {row: 7, column: 63}, 0b01110001)

		const actual = getScreenColour(vm)
		await assertExpectedImage("no-colouring-when-clipped-1_0", actual)
	})

	it("Does not colour when 0.5-cell character is clipped", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, 'i', {row: 7, column: 65}, 0b01110001)

		const actual = getScreenColour(vm)
		await assertExpectedImage("no-colouring-when-clipped-0_5", actual)
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

	// TODO: Add test for rendering out-of-range glyphs & on-range-boundary glyphs.
})

describe("Measure single char", () => {

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
	})

	// TODO: Add test for measuring out-of-range glyphs & on-range-boundary glyphs.
})

describe("Measure span of characters", () => {

	it("4-pixel character x4 returns 4", async () => {
		const vm = await loadedVm

		const result = measureSpan(vm, "iiii")

		expect(result.columnWidth).toBe(4)
	})

	it("8-pixel character x4 returns 8", async () => {
		const vm = await loadedVm

		const result = measureSpan(vm, "aaaa")

		expect(result.columnWidth).toBe(8)
	})

	it("12-pixel character x4 returns 12", async () => {
		const vm = await loadedVm

		const result = measureSpan(vm, "wwww")

		expect(result.columnWidth).toBe(12)
	})

	it("4-pixel character: only 2 fit into 2 columns", async () => {
		const vm = await loadedVm

		const result = measureSpan(vm, "iiii", 2)

		expect(result.charFit).toBe(2)
	})

	it("8-pixel character: only 2 fit into 5 columns", async () => {
		const vm = await loadedVm

		const result = measureSpan(vm, "aaaa", 5)

		expect(result.charFit).toBe(2)
	})

	it("12-pixel character: only 2 fit into 7 columns", async () => {
		const vm = await loadedVm

		const result = measureSpan(vm, "wwww", 7)

		expect(result.charFit).toBe(2)
	})
})

function charCode(singleChar: string) {
	expect(singleChar).toHaveLength(1)
	return CharsetFromUnicode[singleChar.charAt(0)]
}

function renderAt(vm: Vm, text: string, p: TextCoords, attr: byte|'none' = 0b00111000, maxWidth: byte = 127) {
	vm.setRam(0x9000, asBytes(text))
	vm.pokeWord(globals.FONT, rom.FONT_LOOKUP.addr)
	vm.setRegisters({
		DE: 0x9000,
		B: text.length as byte,
		C: maxWidth,
		A: attr !== 'none' ? attr : 0b11101010,
		F: attr !== 'none' ? 0xff : 0x00,
		H: p.row,
		L: p.column
	})
	vm.callSubroutine(rom.RENDER_TEXT, 2700 + 674 * text.length)
}

function measureSpan(vm: Vm, text: string, maxColumnWidth: byte = 255) {
	const bufferAddress = 0x9000
	vm.setRam(bufferAddress, asBytes(text))
	vm.pokeWord(globals.FONT, rom.FONT_LOOKUP.addr)
	vm.setRegisters({
		DE: bufferAddress,
		B: text.length as byte,
		C: maxColumnWidth
	})
	vm.callSubroutine(rom.MEASURE_SPAN, 6000)
	const {DE, B, C, H, L} = vm.getRegisters()
	const result = {
		pointerOffset: DE - bufferAddress,
		charFit: H,
		columnWidth: L,
		remainingChars: B,
		remainingColumns: C,
	}

	// Invariants:
	expect(result.remainingChars).toBe(text.length - result.charFit)
	expect(result.remainingColumns).toBe(maxColumnWidth - result.columnWidth)

	return result
}

function getCoordsAfterRendering(vm: Vm): TextCoords {
	const r = vm.getRegisters()
	return {row: r.H, column: r.L}
}

async function assertExpectedImage(expectedPngFilename: string, actualOutput: Bitmap): Promise<void> {
	await assertBitmapImageMatches('textrender.test', expectedPngFilename, actualOutput)
}

