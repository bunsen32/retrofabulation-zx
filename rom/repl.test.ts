import { describe, it } from "jsr:@std/testing/bdd"
import {asString, loadVm, type word, type Vm} from './testutils/testvm.ts'
import {getScreenMono, cls, type Bitmap, cls1, assertBitmapImageMatches} from "./testutils/screen.ts"
import { CODES, type byte } from '@zx/sys'
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

describe('LINE_EDIT', () => {

	// Type a character:

	it('Typed character is appended to buffer', async () => {
		const vm = await loadedVm
		const buf = givenEditBuffer(vm, 'ABC|___')
		
		whenTyped(vm, 'Z')

		const result = getBufferString(vm, buf)
		expect(result).toBe('ABC|Z__')
	})

	it('Typed character is inserted in buffer', async () => {
		const vm = await loadedVm
		const buf = givenEditBuffer(vm, '|ABC___')
		
		whenTyped(vm, 'Z')

		const result = getBufferString(vm, buf)
		expect(result).toBe('|ZABC__')
	})
	
	it('After typed character, tries to move right', async () => {
		const vm = await loadedVm
		givenEditBuffer(vm, '|ABC___')
		
		whenTyped(vm, 'Z')

		const {A} = vm.getRegisters()
		expect(A).toBe(0b110)
	})
	
	it('Typed character is not appended when buffer is full', async () => {
		const vm = await loadedVm
		const buf = givenEditBuffer(vm, 'ABC|')
		
		whenTyped(vm, 'Z')

		const result = getBufferString(vm, buf)
		expect(result).toBe('ABC|')
	})

	// Backspace:

	it('Backspace at position zero does nothing', async () => {
		const vm = await loadedVm
		const buf = givenEditBuffer(vm, '|ABC___')
		
		whenTyped(vm, CODES.BACKSPACE)

		const result = getBufferString(vm, buf)
		expect(result).toBe('|ABC___')
	})

	it('Backspace in middle deletes one', async () => {
		const vm = await loadedVm
		const buf = givenEditBuffer(vm, 'AB|C___')
		
		whenTyped(vm, CODES.BACKSPACE)

		const result = getBufferString(vm, buf)
		expect(result).toBe('A|C____')
	})

	it('Backspace does not corrupt before or after buffer', async () => {
		const vm = await loadedVm
		const buf = givenEditBuffer(vm, 'AB|C')
		
		whenTyped(vm, CODES.BACKSPACE)

		const result = getBufferString(vm, buf)
		// TODO: check not corruption.
		// Or do we just check this as part of helper functions?
		// TODO: do the same for insertions!
	})

	it('Backspace at end deletes one (no problem copying)', async () => {
		const vm = await loadedVm
		const buf = givenEditBuffer(vm, 'ABC|')
		
		whenTyped(vm, CODES.BACKSPACE)

		const result = getBufferString(vm, buf)
		expect(result).toBe('AB|_')
	})

	it('After backspace, redraws screen', async () => {
		const vm = await loadedVm
		givenEditBuffer(vm, 'AB|C___')
		
		whenTyped(vm, CODES.BACKSPACE)

		const {A} = vm.getRegisters()
		expect(A).toBe(rom.SCR_REDRAW_TEXT.addr|rom.SCR_SHOW_CURSOR.addr)
	})
	
	// Cursor left:

	it('Left key at start does nothing', async () => {
		const vm = await loadedVm
		const buffer = givenEditBuffer(vm, '|ABC_')
		
		whenTyped(vm, CODES.LEFT)

		const result = getBufferString(vm, buffer)
		expect(result).toBe('|ABC_')
	})
	
	it('Left key moves position left', async () => {
		const vm = await loadedVm
		const buffer = givenEditBuffer(vm, 'AB|C_')
		
		whenTyped(vm, CODES.LEFT)

		const result = getBufferString(vm, buffer)
		expect(result).toBe('A|BC_')
	})
	
	it('Left key moves cursor left', async () => {
		const vm = await loadedVm
		givenEditBuffer(vm, 'AB|C_')
		givenCursorPosition(vm, {row: 1, column: 10})

		whenTyped(vm, CODES.LEFT)

		const result = getCursorPosition(vm)
		expect(result).toEqual({row: 1, column: 8})
	})
	
	it('LEFT key tries to show cursor', async () => {
		const vm = await loadedVm
		givenEditBuffer(vm, 'A|BC_')

		whenTyped(vm, CODES.LEFT)

		const {A} = vm.getRegisters()
		expect(A).toBe(rom.SCR_SHOW_CURSOR.addr)
	})
	
	// Cursor right:

	it('Right key at end does nothing', async () => {
		const vm = await loadedVm
		const buffer = givenEditBuffer(vm, 'ABC|_')
		
		whenTyped(vm, CODES.RIGHT)

		const result = getBufferString(vm, buffer)
		expect(result).toBe('ABC|_')
	})
	
	it('Right key moves position right', async () => {
		const vm = await loadedVm
		const buffer = givenEditBuffer(vm, 'A|BC_')
		
		whenTyped(vm, CODES.RIGHT)

		const result = getBufferString(vm, buffer)
		expect(result).toBe('AB|C_')
	})
	
	it('Right key moves cursor right', async () => {
		const vm = await loadedVm
		givenEditBuffer(vm, 'A|BC_')
		givenCursorPosition(vm, {row: 1, column: 10})

		whenTyped(vm, CODES.RIGHT)

		const result = getCursorPosition(vm)
		expect(result).toEqual({row: 1, column: 12})
	})
	
	it('Right key tries to show cursor', async () => {
		const vm = await loadedVm
		givenEditBuffer(vm, 'A|BC_')

		whenTyped(vm, CODES.RIGHT)

		const {A} = vm.getRegisters()
		expect(A).toBe(rom.SCR_SHOW_CURSOR.addr)
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

// Text buffer things.
// Define string definition of text buffer as 'abc|def___' where vertical bar indicates
// insertion point and underscore indicates free space at end of the buffer.
// We can convert from that to memory/register representation.

interface EditBuffer {
	start: word
	length: byte
}

interface TextCoords {
	row: byte,
	column: byte
}

function givenEditBuffer(vm: Vm, bufferWithCursor: string): EditBuffer {
	const cursorPosition = bufferWithCursor.indexOf('|') as byte
	expect(cursorPosition).not.toBe(-1)
	const bufferChars = bufferWithCursor.replaceAll('|', '')
	const bufferCapacity = bufferChars.length
	expect(bufferCapacity).toBe(bufferWithCursor.length - 1)
	let bufferUsed = bufferChars.indexOf('_')
	if (bufferUsed === -1) bufferUsed = bufferChars.length

	const start = 0x9000
	vm.setRegisters({
		DE: start + cursorPosition,
		B: cursorPosition,
		C: bufferUsed - cursorPosition as byte,
		HL: 0x0909,
		B_: (bufferCapacity - bufferUsed) as byte
	})
	vm.setRam(start, bufferChars)

	return {
		start: 0x9000,
		length: bufferCapacity as byte
	}
}

function givenCursorPosition(vm: Vm, p: TextCoords) {
	const coordsWord = (p.row << 8) | p.column
	vm.setRegisters({ HL: coordsWord })
	vm.pokeWord(rom.CURSOR_XY, coordsWord)
}

function whenTyped(vm: Vm, c: string|byte) {
	const b = (typeof c === 'number')
		? c as byte
		: c.charCodeAt(0) as byte

	vm.setRegisters({A: b})
	vm.callSubroutine(rom.LINE_EDIT, 10000)
}

function getBufferString(vm: Vm, buffer: EditBuffer): string {
	const {DE, B, C} = vm.getRegisters()
	expect(DE).toBe(buffer.start + B)
	const cursorPosition = B
	const stringLength = B + C
	expect(stringLength).toBeLessThanOrEqual(buffer.length)

	const bufferChars = asString(vm.getRam(buffer.start, stringLength)) + '_'.repeat(buffer.length - stringLength)
	return bufferChars.substring(0,cursorPosition) + '|' + bufferChars.substring(cursorPosition)
}

function getCursorPosition(vm: Vm): TextCoords {
	const {H, L, HL} = vm.getRegisters()
	const cursorWord = vm.peekWord(rom.CURSOR_XY)
	expect(HL).toBe(cursorWord)
	return {row: H, column: L}
}