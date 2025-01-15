// Test the keyboard scanning routines:
import {describe, expect, test} from '@jest/globals'
import {emulatorWasm, Vm} from './testutils/testvm'
import {rom} from './generated/symbols'
import { byte } from '../Byte'

const loadedVm = WebAssembly.instantiate(emulatorWasm)
	.then(results =>
		new Vm(results.instance.exports))

describe("Keyboard scan", () => {
	test("No keys returns all zeros", async () => {
		const vm = await loadedVm
		// Given no keys pressed

		vm.callSubroutine(rom.KEY_SCAN, 550)

		const r = keyScanResults(vm)
		expect(r).toEqual({D: 0, E: 0, B: 0})
	})

	test("The X key returns correct code", async () => {
		const vm = await loadedVm
		vm.keyDown(0, 0x10) // The X key

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({D: 0, E: 32, B: 0})
	})

	test("Two (non-shift) keys returns the correct codes", async () => {
		const vm = await loadedVm
		vm.keyDown(0, 0x06) // The Z & X keys

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({D: 0x08, E: 0x10, B: 0})
	})

	test("Two shifts return the correct codes", async () => {
		const vm = await loadedVm
		vm.keysDown([{row: 0, mask: 0x01}, {row: 7, mask: 0x02}]) // The CAPS & SYM keys

		vm.callSubroutine(rom.KEY_SCAN, 1000)

		const r = keyScanResults(vm)
		expect(r).toEqual({D: 0, E: 0, B: 0b11})
	})
})

function keyScanResults(vm: Vm) {
	const r = vm.getRegisters()
	return {
		D: (r.DE >> 8) as byte,
		E: (r.DE & 0xFF) as byte,
		B: (r.BC >> 8) as byte
	}
}