// Test the keyboard scanning routines:
import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import {loadVm, type Vm, type Z80Address} from './testutils/testvm.ts'
import {rom} from './generated/symbols.ts'
import type { byte } from '@zx/sys'
import { Charset, CharsetFromUnicode } from '@zx/sys'

const loadedVm = loadVm()
const globals = rom.G

interface KeyPressState {
	primary: byte,
	secondary?: byte,
	tooManyPressed?: boolean
}
const NO_KEYS: KeyPressState = {primary: 0, secondary: 0}
const ASSUMED_KEY_DELAY = 100
const ASSUMED_REPEAT_DELAY = 10
const KEYS = {
	CAPS: 0x00 as byte,
	A: 0x01 as byte,
	Q: 0x02 as byte,
	ONE: 0x03 as byte,
	ZERO: 0x04 as byte,
	P: 0x05 as byte,
	ENTER: 0x06 as byte,
	SPACE: 0x07 as byte,

	NINE: 0x0c as byte,

	EIGHT: 0x14 as byte,

	B: 0x27 as byte,
}

const SHIFT_NONE = 0
const SHIFT_CAPS = 0b01
const SHIFT_SYM = 0b10
const SHIFT_BOTH = 0b11

interface KeyboardState {
	supersededKeyCode: byte,
	repeatKeyCode: byte,
	repeatCountdown: byte,
	currentChar: byte,
	currentShifts: byte,
	currentCharUnicode: string,
}

const ZEROED: KeyboardState = {
	supersededKeyCode: 0,
	repeatCountdown: 0,
	repeatKeyCode: 0,
	currentChar: 0,
	currentShifts: 0,
	currentCharUnicode: '\0'
}

const GFX_MODE: Partial<KeyboardState> = {
	currentShifts: 0b01000000
}

describe("Keyboard scan", () => {
	it("No keys returns all zeros", async () => {
		const vm = await loadedVm
		// Given no keys pressed

		vm.callSubroutine(rom.KEY_SCAN, 550)

		const r = keyScanResults(vm)
		expect(r).toEqual({keyCodes: NO_KEYS, shiftState: 0})
	})

	it("The X key returns correct code", async () => {
		const vm = await loadedVm
		vm.keyDown(0, 0x10) // The X key

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({keyCodes: {secondary: 0, primary: 32}, shiftState: 0})
	})

	it("Two (non-shift) keys returns the correct codes", async () => {
		const vm = await loadedVm
		vm.keyDown(0, 0x06) // The Z & X keys

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({keyCodes: {secondary: 0x08, primary: 0x10}, shiftState: 0})
	})

	it("CAPS shift returns the correct code", async () => {
		const vm = await loadedVm
		vm.keysDown([{row: 0, mask: 0x01}]) // The CAPS key

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({keyCodes: NO_KEYS, shiftState: 0b01})
	})

	it("SYM shift returns the correct code", async () => {
		const vm = await loadedVm
		vm.keysDown([{row: 7, mask: 0x02}]) // The SYM key

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({keyCodes: NO_KEYS, shiftState: 0b10})
	})

	it("Two shifts return the correct codes", async () => {
		const vm = await loadedVm
		vm.keysDown([{row: 0, mask: 0x01}, {row: 7, mask: 0x02}]) // The CAPS & SYM keys

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({keyCodes: NO_KEYS, shiftState: 0b11})
	})
})

describe("Keyboard state changes", () => {

	it("Person press button, character gets input", async () => {
		const vm = await loadedVmWithKeyboardState(ZEROED)

		callKeyboardWith(vm, {primary: KEYS.A})

		const r = getKeyboardState(vm)
		expect(r.currentCharUnicode).toEqual('a')
	})

	it("On keypress, repeat key is set", async () => {
		const vm = await loadedVmWithKeyboardState(ZEROED)
		vm.pokeByte(globals.REPDEL, 99)

		callKeyboardWith(vm, {primary: KEYS.A})

		const r = getKeyboardState(vm)
		expect(r.repeatKeyCode).toEqual(KEYS.A)
		expect(r.repeatCountdown).toEqual(99)
	})

	it("Person keep hold button, pause count decrease, but no keypress", async () => {
		const vm = await loadedVmWithKeyboardState({
			currentCharUnicode: 'a',
			repeatKeyCode: KEYS.A,
			repeatCountdown: 17,
		})

		callKeyboardWith(vm, {primary: KEYS.A})

		const r = getKeyboardState(vm)
		expect(r.currentChar).toEqual(0)
		expect(r.repeatCountdown).toEqual(16)
		expect(r.repeatKeyCode).toEqual(KEYS.A)
	})

	it("Person hold button, repeat counter is one, presses key", async () => {
		const vm = await loadedVmWithKeyboardState({
			currentCharUnicode: 'a',
			repeatKeyCode: KEYS.A,
			repeatCountdown: 1,
		})

		callKeyboardWith(vm, {primary: KEYS.A})

		const r = getKeyboardState(vm)
		expect(r.currentCharUnicode).toEqual('a')
	})

	it("Person hold button, repeat counter is one, sets counter to REPER", async () => {
		const vm = await loadedVmWithKeyboardState({
			currentCharUnicode: 'a',
			repeatKeyCode: KEYS.A,
			repeatCountdown: 1,
		})
		vm.pokeByte(globals.REPPER, 42)

		callKeyboardWith(vm, {primary: KEYS.A})

		const r = getKeyboardState(vm)
		expect(r.repeatKeyCode).toEqual(KEYS.A)
		expect(r.repeatCountdown).toEqual(42)
	})

	it("If I press two buttons, and one already has been superseded, suppress it and issue second one", async () => {
		const vm = await loadedVmWithKeyboardState({
			currentCharUnicode: 'X',
			repeatKeyCode: KEYS.Q,
			repeatCountdown: 13,
			supersededKeyCode: KEYS.B,
		})

		callKeyboardWith(vm, {primary: KEYS.B, secondary: KEYS.A})

		const r = getKeyboardState(vm)
		expect(r.supersededKeyCode).toEqual(KEYS.B)
		expect(r.repeatKeyCode).toEqual(KEYS.A)
		expect(r.currentCharUnicode).toEqual('a')
	})

	it("If I WAS pressing one button, and press a different one (primary), suppress the first one, and issue second one", async () => {
		const vm = await loadedVmWithKeyboardState({
			currentCharUnicode: 'a',
			repeatKeyCode: KEYS.A,
			repeatCountdown: 13,
			supersededKeyCode: 0,
		})

		callKeyboardWith(vm, {primary: KEYS.B, secondary: KEYS.A})

		const r = getKeyboardState(vm)
		expect(r.supersededKeyCode).toEqual(KEYS.A)
		expect(r.repeatKeyCode).toEqual(KEYS.B)
		expect(r.currentCharUnicode).toEqual('b')
	})

	it("If I WAS pressing one button, and press a different one (secondary), suppress the first one, and issue second one", async () => {
		const vm = await loadedVmWithKeyboardState({
			currentCharUnicode: 'a',
			repeatKeyCode: KEYS.A,
			repeatCountdown: 13,
			supersededKeyCode: 0,
		})

		callKeyboardWith(vm, {primary: KEYS.A, secondary: KEYS.B})

		const r = getKeyboardState(vm)
		expect(r.supersededKeyCode).toEqual(KEYS.A)
		expect(r.repeatKeyCode).toEqual(KEYS.B)
		expect(r.currentCharUnicode).toEqual('b')
	})

	it("If one key had been superseded, and a single key pressed, clear superseded state and issue that key", async () => {
		const vm = await loadedVmWithKeyboardState({
			repeatKeyCode: KEYS.B,
			repeatCountdown: 13,
			supersededKeyCode: KEYS.SPACE,
		})

		callKeyboardWith(vm, {primary: KEYS.A})

		const r = getKeyboardState(vm)
		expect(r.supersededKeyCode).toEqual(0)
		expect(r.repeatKeyCode).toEqual(KEYS.A)
		expect(r.currentCharUnicode).toEqual('a')
	})

	it("If one key had been superseded, and two keys pressed (neither of which is it), clear superseded state and issue primary key", async () => {
		const vm = await loadedVmWithKeyboardState({
			repeatKeyCode: KEYS.ENTER,
			repeatCountdown: 13,
			supersededKeyCode: KEYS.SPACE,
		})

		callKeyboardWith(vm, {primary: KEYS.A, secondary: KEYS.B})

		const r = getKeyboardState(vm)
		expect(r.supersededKeyCode).toEqual(0)
		expect(r.repeatKeyCode).toEqual(KEYS.A)
		expect(r.currentCharUnicode).toEqual('a')
	})

	it("After release button, no character issued", async () => {
		const vm = await loadedVmWithKeyboardState({
			repeatKeyCode: KEYS.ENTER,
			repeatCountdown: 1,
			supersededKeyCode: KEYS.SPACE,
		})

		callKeyboardWith(vm, {primary: 0, secondary: 0})

		const r = getKeyboardState(vm)
		expect(r.supersededKeyCode).toEqual(0)
		expect(r.repeatKeyCode).toEqual(0)
		expect(r.currentChar).toEqual(0)
	})
})

function keyScanResults(vm: Vm) {
	const r = vm.getRegisters()
	return {
		keyCodes: {
			primary: r.E,
			secondary: r.D,
		},
		shiftState: r.B
	}
}

function getKeyboardState(vm: Vm): KeyboardState {
	const charByte = vm.peekByte(globals.KEY_CHAR)
	return {
		supersededKeyCode: vm.peekByte(globals.KEY_SUPERSEDED),
		repeatKeyCode: vm.peekByte(globals.KEY_RPT_CODE),
		repeatCountdown: vm.peekByte(globals.KEY_RPT_NEXT),
		currentChar: charByte,
		currentCharUnicode: Charset[charByte],
		currentShifts: vm.peekByte(globals.KEY_MODIFIERS)
	}
}

function setKeyboardState(vm: Vm, state: Partial<KeyboardState>) {
	function tryPoke(addr: Z80Address, maybe: byte|undefined) {
		if (maybe != undefined)
			vm.pokeByte(addr, maybe)
	}

	tryPoke(globals.KEY_SUPERSEDED, state.supersededKeyCode)
	tryPoke(globals.KEY_RPT_CODE, state.repeatKeyCode)
	tryPoke(globals.KEY_RPT_NEXT, state.repeatCountdown)
	tryPoke(globals.KEY_CHAR, state.currentChar)
	tryPoke(globals.KEY_MODIFIERS, state.currentShifts)
	if (state.currentCharUnicode != undefined)
		tryPoke(globals.KEY_CHAR, CharsetFromUnicode[state.currentCharUnicode])
}

function callKeyboardWith(vm: Vm, pressed: KeyPressState, shiftState?: 0|1|2|3) {
	vm.setRegisters({
		E: pressed.primary,
		D: (pressed.secondary || 0),
		B: (shiftState || 0),
		F: pressed.tooManyPressed ? 0x00 : 0xff,
	})
	vm.callSubroutine(rom.KEYBOARD.after_scan, 430)
}

async function loadedVmWithKeyboardState(keyboardState: Partial<KeyboardState>): Promise<Vm> {
	const vm = await loadedVm
	setKeyboardState(vm, {...ZEROED, ...keyboardState})
	return vm
}
