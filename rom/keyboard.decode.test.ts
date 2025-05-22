// Test the keyboard scanning routines:
import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import {loadVm, type Vm, type Z80Address} from './testutils/testvm.ts'
import {rom} from './generated/symbols.ts'
import type { byte } from '@zx/sys'
import { Charset, CharsetFromUnicode, CODES } from '@zx/sys'

const loadedVm = loadVm()

interface KeyPressState {
	primary: byte,
	secondary?: byte,
	tooManyPressed?: boolean
}
const NO_KEYS: KeyPressState = {primary: 0, secondary: 0}

const KEYS = {
	// OCTal makes most sense here to number the keys!
	CAPS: 0o00 as byte,
	A: 0o01 as byte,
	Q: 0o02 as byte,
	ONE: 0o03 as byte,
	ZERO: 0o04 as byte,
	P: 0o05 as byte,
	ENTER: 0o06 as byte,
	SPACE: 0o07 as byte,

	TWO: 0o13 as byte,
	NINE: 0o14 as byte,

	THREE: 0o23 as byte,
	EIGHT: 0o24 as byte,

	FOUR: 0o33 as byte,
	SEVEN: 0o34 as byte,

	FIVE: 0o43 as byte,
	SIX: 0o44 as byte,
	B: 0o47 as byte,
}

const SHIFT_NONE = 0
const SHIFT_CAPS = 0b01
const SHIFT_SYM = 0b10
const SHIFT_BOTH = 0b11

const MODIFIERS_EXTMODE_RESET = 0b01_0000
const MODIFIERS_EXTMODE = 0b10_0000

interface KeyboardState {
	supersededKeyCode: byte,
	repeatKeyCode: byte,
	repeatCountdown: byte,
	currentChar: byte,
	modifierFlags: byte,
	currentCharUnicode: string,
}

const ZEROED: KeyboardState = {
	supersededKeyCode: 0,
	repeatCountdown: 0,
	repeatKeyCode: 0,
	currentChar: 0,
	modifierFlags: 0,
	currentCharUnicode: '\0'
}

const GFX_MODE: Partial<KeyboardState> = {
	modifierFlags: 0b01000000
}

describe("Keyboard decoding", () => {

	describe('Generally (non-GFX-mode)', () => {
		it("No modifiers + SPACE, get SPACE", async () => {
			const vm = await loadedVmWithKeyboardState(ZEROED)

			callDecode(vm, KEYS.SPACE)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(0x20)
		})

		it("CAPS shift + SPACE, get BREAK", async () => {
			const vm = await loadedVmWithKeyboardState(ZEROED)

			callDecode(vm, KEYS.SPACE, SHIFT_CAPS)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(0x07)
		})

		it("No modifiers + ENTER, get ENTER", async () => {
			const vm = await loadedVmWithKeyboardState(ZEROED)

			callDecode(vm, KEYS.ENTER)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(0x0a)
		})
	})

	describe('EXT-mode state changes', () => {
		it('Sets the EXT-mode reset when no key pressed', async () => {
			const vm = await loadedVmWithKeyboardState({modifierFlags: 0})

			callDecode(vm, 0, 0)

			const k = getKeyboardState(vm)
			expect(k.modifierFlags & MODIFIERS_EXTMODE_RESET).toBeTruthy()
		})

		it('Leaves the EXT-mode reset unmodified when single shift pressed', async () => {
			for(const originalValue of [MODIFIERS_EXTMODE_RESET, 0])
			for(const shifts of [SHIFT_CAPS, SHIFT_SYM]) {
				const vm = await loadedVmWithKeyboardState({modifierFlags: originalValue as byte})

				callDecode(vm, 0, shifts as (1|2))

				const k = getKeyboardState(vm)
				expect(k.modifierFlags & MODIFIERS_EXTMODE_RESET).toEqual(originalValue)
			}
		})

		it ('Sets EXT-mode when both shifts pressed and EXT-mode-reset enabled', async () => {
			const vm = await loadedVmWithKeyboardState({modifierFlags: MODIFIERS_EXTMODE_RESET})

			callDecode(vm, 0, SHIFT_BOTH)

			const k = getKeyboardState(vm)
			expect(k.modifierFlags & MODIFIERS_EXTMODE).toEqual(MODIFIERS_EXTMODE)
		})

		it ('Clears EXT-mode when both shifts pressed and EXT-mode-reset enabled', async () => {
			const original = MODIFIERS_EXTMODE_RESET | MODIFIERS_EXTMODE
			const vm = await loadedVmWithKeyboardState({modifierFlags: original as byte})

			callDecode(vm, 0, SHIFT_BOTH)

			const k = getKeyboardState(vm)
			expect(k.modifierFlags & MODIFIERS_EXTMODE).toEqual(0)
		})
	})

	describe('Ctrl characters', () => {
		async function capsShiftDigitMapsTo(keyCode: byte, charCode: byte) {
			const vm = await loadedVmWithKeyboardState(ZEROED)

			callDecode(vm, keyCode, SHIFT_CAPS)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(charCode)
		}

		it("CAPS shift + 1 => EDIT/ESC", () => 
			capsShiftDigitMapsTo(KEYS.ONE, CODES.ESCAPE)
		)

		it("CAPS shift + 2 => CAPS-LOCK", () => 
			capsShiftDigitMapsTo(KEYS.TWO, CODES.CAPS_LOCK)
		)

		it("CAPS shift + 3 => TRU-VIDEO", () => 
			capsShiftDigitMapsTo(KEYS.THREE, CODES.TRUE_VIDEO)
		)

		it("CAPS shift + 4 => INV-VIDEO", () => 
			capsShiftDigitMapsTo(KEYS.FOUR, CODES.INV_VIDEO)
		)

		it("CAPS shift + 5 => LEFT", () => 
			capsShiftDigitMapsTo(KEYS.FIVE, CODES.LEFT)
		)

		it("CAPS shift + 6 => DOWN", () => 
			capsShiftDigitMapsTo(KEYS.SIX, CODES.DOWN)
		)

		it("CAPS shift + 7 => UP", () => 
			capsShiftDigitMapsTo(KEYS.SEVEN, CODES.UP)
		)

		it("CAPS shift + 8 => RIGHT", () => 
			capsShiftDigitMapsTo(KEYS.EIGHT, CODES.RIGHT)
		)

		it("CAPS shift + 9 => GFX mode switch", () => 
			capsShiftDigitMapsTo(KEYS.NINE, CODES.GRAPHICS)
		)

		it("CAPS shift + 0 => BACKSPACE/DELETE", () => 
			capsShiftDigitMapsTo(KEYS.ZERO, CODES.BACKSPACE)
		)
	})

	describe('L-mode', () => {

		it("UNshifted character returns main symbol", async () => {
			const vm = await loadedVmWithKeyboardState(ZEROED)

			callDecode(vm, KEYS.ONE, SHIFT_NONE)

			const r = getKeyboardState(vm)
			expect(r.currentCharUnicode).toEqual('1')
		})

		it("Press symbol shift, get symbol character from key", async () => {
			const vm = await loadedVmWithKeyboardState(ZEROED)

			callDecode(vm, KEYS.ONE, SHIFT_SYM)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(33)
			expect(r.currentCharUnicode).toEqual('!')
		})

		it("Press letter, get lower-case letter", async () => {
			const vm = await loadedVmWithKeyboardState(ZEROED)

			callDecode(vm, KEYS.P)

			const r = getKeyboardState(vm)
			expect(r.currentCharUnicode).toEqual('p')
		})

		it("Press CAPS shift + letter, get upper case", async () => {
			const vm = await loadedVmWithKeyboardState(ZEROED)

			callDecode(vm, KEYS.P, SHIFT_CAPS)

			const r = getKeyboardState(vm)
			expect(r.currentCharUnicode).toEqual('P')
		})
	})

	describe('GFX-mode', () => {

		it("Press GFX-mode + SPACE, get SPACE", async () => {
			const vm = await loadedVmWithKeyboardState(GFX_MODE)

			callDecode(vm, KEYS.SPACE)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(0x20)
		})

		it("Press GFX-mode + ENTER, get ENTER", async () => {
			const vm = await loadedVmWithKeyboardState(GFX_MODE)

			callDecode(vm, KEYS.ENTER)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(0x0a)
		})

		it("Press GFX-mode + A, get UDG", async () => {
			const vm = await loadedVmWithKeyboardState(GFX_MODE)

			callDecode(vm, KEYS.A)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(0xe0)
		})

		it("Press GFX-mode + P, get UDG", async () => {
			const vm = await loadedVmWithKeyboardState(GFX_MODE)

			callDecode(vm, KEYS.P)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(0xef)
		})

		it("Press GFX-mode + Q, get regular character", async () => {
			const vm = await loadedVmWithKeyboardState(GFX_MODE)

			callDecode(vm, KEYS.Q, SHIFT_CAPS)

			const r = getKeyboardState(vm)
			expect(r.currentCharUnicode).toEqual('q')
		})

		it("Press GFX-mode + 1, get block char", async () => {
			const vm = await loadedVmWithKeyboardState(GFX_MODE)

			callDecode(vm, KEYS.ONE)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(0xd1)
			expect(r.currentCharUnicode).toEqual('▝')
		})

		it("Press GFX-mode + 8, get block char", async () => {
			const vm = await loadedVmWithKeyboardState(GFX_MODE)

			callDecode(vm, KEYS.EIGHT)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(0xd0)
			expect(r.currentCharUnicode).toEqual(' ')
		})

		it("Press GFX-mode + 1 + SHIFT, get block char inverted", async () => {
			const vm = await loadedVmWithKeyboardState(GFX_MODE)

			callDecode(vm, KEYS.ONE, SHIFT_CAPS)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(0xde)
			expect(r.currentCharUnicode).toEqual('▙')
		})

		it("Press GFX-mode + 8 + SHIFT, get block char inverted", async () => {
			const vm = await loadedVmWithKeyboardState(GFX_MODE)

			callDecode(vm, KEYS.EIGHT, SHIFT_CAPS)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(0xdf)
			expect(r.currentCharUnicode).toEqual('█')
		})

		it("Press GFX-mode + 9, get 'GFX' ctrl character", async () => {
			const vm = await loadedVmWithKeyboardState(GFX_MODE)

			callDecode(vm, KEYS.NINE)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(CODES.GRAPHICS)
		})

		it("Press GFX-mode + 0, get 'DELETE' ctrl character", async () => {
			const vm = await loadedVmWithKeyboardState(GFX_MODE)

			callDecode(vm, KEYS.ZERO)

			const r = getKeyboardState(vm)
			expect(r.currentChar).toEqual(CODES.BACKSPACE)
		})
	})
})

function getKeyboardState(vm: Vm): KeyboardState {
	const charByte = vm.peekByte(rom.KEY_CHAR)
	return {
		supersededKeyCode: vm.peekByte(rom.KEY_SUPERSEDED),
		repeatKeyCode: vm.peekByte(rom.KEY_RPT_CODE),
		repeatCountdown: vm.peekByte(rom.KEY_RPT_NEXT),
		currentChar: charByte,
		currentCharUnicode: Charset[charByte],
		modifierFlags: vm.peekByte(rom.KEY_MODIFIERS)
	}
}

function setKeyboardState(vm: Vm, state: Partial<KeyboardState>) {
	function tryPoke(addr: Z80Address, maybe: byte|undefined) {
		if (maybe != undefined)
			vm.pokeByte(addr, maybe)
	}

	tryPoke(rom.KEY_SUPERSEDED, state.supersededKeyCode)
	tryPoke(rom.KEY_RPT_CODE, state.repeatKeyCode)
	tryPoke(rom.KEY_RPT_NEXT, state.repeatCountdown)
	tryPoke(rom.KEY_CHAR, state.currentChar)
	tryPoke(rom.KEY_MODIFIERS, state.modifierFlags)
	if (state.currentCharUnicode != undefined)
		tryPoke(rom.KEY_CHAR, CharsetFromUnicode[state.currentCharUnicode])
}

function callDecode(vm: Vm, keyCode: byte, shiftState?: 0|1|2|3) {
	return callKeyboardWith( vm, {primary: keyCode}, shiftState)
}

function callKeyboardWith(vm: Vm, pressed: KeyPressState, shiftState?: 0|1|2|3) {
	vm.setRegisters({
		E: pressed.primary,
		D: (pressed.secondary || 0),
		B: (shiftState || 0),
		F: pressed.tooManyPressed ? 0x00 : 0xff,
	})
	vm.callSubroutine(rom.KEYBOARD.after_scan, 450)
}

async function loadedVmWithKeyboardState(keyboardState: Partial<KeyboardState>): Promise<Vm> {
	const vm = await loadedVm
	setKeyboardState(vm, {...ZEROED, ...keyboardState})
	return vm
}
