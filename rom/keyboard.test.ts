// Test the keyboard scanning routines:
import {describe, expect, test} from '@jest/globals'
import {emulatorWasm, PartialRegisterSet, Vm, Z80Address} from './testutils/testvm'
import {rom} from './generated/symbols'
import { byte } from '../Byte'
import { Charset } from '../encoding'

const loadedVm = WebAssembly.instantiate(emulatorWasm)
	.then(results =>
		new Vm(results.instance.exports))

interface KeyPressState {
	primary: byte,
	secondary?: byte,
	tooManyPressed?: boolean
}
const NO_KEYS: KeyPressState = {primary: 0, secondary: 0}

interface KeyboardState {
	suspendedKeyCode: byte,
	repeatKeyCode: byte,
	repeatCountdown: byte,
	currentChar: byte,
	currentShifts: byte
}

describe("Keyboard scan", () => {
	test("No keys returns all zeros", async () => {
		const vm = await loadedVm
		// Given no keys pressed

		vm.callSubroutine(rom.KEY_SCAN, 550)

		const r = keyScanResults(vm)
		expect(r).toEqual({keyCodes: NO_KEYS, shiftState: 0})
	})

	test("The X key returns correct code", async () => {
		const vm = await loadedVm
		vm.keyDown(0, 0x10) // The X key

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({keyCodes: {secondary: 0, primary: 32}, shiftState: 0})
	})

	test("Two (non-shift) keys returns the correct codes", async () => {
		const vm = await loadedVm
		vm.keyDown(0, 0x06) // The Z & X keys

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({keyCodes: {secondary: 0x08, primary: 0x10}, shiftState: 0})
	})

	test("CAPS shift returns the correct code", async () => {
		const vm = await loadedVm
		vm.keysDown([{row: 0, mask: 0x01}]) // The CAPS key

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({keyCodes: NO_KEYS, shiftState: 0b01})
	})

	test("SYM shift returns the correct code", async () => {
		const vm = await loadedVm
		vm.keysDown([{row: 7, mask: 0x02}]) // The SYM key

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({keyCodes: NO_KEYS, shiftState: 0b10})
	})

	test("Two shifts return the correct codes", async () => {
		const vm = await loadedVm
		vm.keysDown([{row: 0, mask: 0x01}, {row: 7, mask: 0x02}]) // The CAPS & SYM keys

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({keyCodes: NO_KEYS, shiftState: 0b11})
	})
})

describe("Keyboard state changes", () => {

	test("Person press button, character gets input", async () => {
		const vm = await loadedVmWithZeroedKeyboardState()
		const aKeyPressed: KeyPressState = {primary: 0x01} // "A" key pressed

		callKeyboardWith(vm, aKeyPressed)

		const r = getKeyboardState(vm)
		expect(Charset[r.currentChar]).toEqual('A')
	})
})

function keyScanResults(vm: Vm) {
	const r = vm.getRegisters()
	return {
		keyCodes: {
			primary: (r.DE & 0xFF) as byte,
			secondary: (r.DE >> 8) as byte,
		},
		shiftState: (r.BC >> 8) as byte
	}
}

function getKeyboardState(vm: Vm): KeyboardState {
	return {
		suspendedKeyCode: vm.peekByte(rom.KEY_SUPERSEDED),
		repeatKeyCode: vm.peekByte(rom.KEY_RPT_CODE),
		repeatCountdown: vm.peekByte(rom.KEY_RPT_NEXT),
		currentChar: vm.peekByte(rom.KEY_CHAR),
		currentShifts: vm.peekByte(rom.KEY_SHIFTS)
	}
}

function setKeyboardState(vm: Vm, state: Partial<KeyboardState>) {
	function tryPoke(addr: Z80Address, maybe: byte|undefined) {
		if (maybe != undefined)
			vm.pokeByte(addr, maybe)
	}

	tryPoke(rom.KEY_SUPERSEDED, state.suspendedKeyCode)
	tryPoke(rom.KEY_RPT_CODE, state.repeatKeyCode)
	tryPoke(rom.KEY_RPT_NEXT, state.repeatCountdown)
	tryPoke(rom.KEY_CHAR, state.currentChar)
	tryPoke(rom.KEY_SHIFTS, state.currentShifts)
}

function callKeyboardWith(vm: Vm, pressed: KeyPressState, tooManyPressed?: boolean) {
	vm.setRegisters({
		DE: ((pressed.secondary || 0) << 8) | (pressed.primary & 0xff),
		AF: tooManyPressed ? 0x00 : 0xff,
	})
	vm.callSubroutine(rom.KEYBOARD.after_scan, 300)
}

async function loadedVmWithZeroedKeyboardState(): Promise<Vm> {
	const vm = await loadedVm
	setKeyboardState(vm, {
		suspendedKeyCode: 0,
		repeatCountdown: 0,
		repeatKeyCode: 0,
		currentChar: 0,
		currentShifts: 0,
	})

	return vm
}