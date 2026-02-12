// Test the startup sequence:
import { describe, it } from "jsr:@std/testing/bdd";
import {asString, loadVm, Vm} from './testutils/testvm.ts'
import { expect } from "jsr:@std/expect/expect";
import type { byte } from "../zxsys/Byte.ts";
import { rom } from "./generated/symbols.ts";

const loadedVm = loadVm()

describe("INT8_TO_STRING", () => {
	function rendersInt(intValue: byte) {
		it(`Renders ${intValue}`, async () => {
			const vm = await loadedVm

			const result = int8ToString(vm, intValue)

			expect(result).toBe(intValue.toString())
		})
	}
	for(let x = 0; x < 256; x++) rendersInt(x as byte);
})

describe("INT16_TO_STRING", () => {
	function rendersInt(intValue: number) {
		it(`Renders ${intValue}`, async () => {
			const vm = await loadedVm

			const result = int16ToString(vm, intValue)

			expect(result).toBe(intValue.toString())
		})
	}
	rendersInt(1);
	rendersInt(999);
	rendersInt(1999);
	rendersInt(9999);
	rendersInt(44444);
	rendersInt(65535);
	it('Renders all 16-bit values (skip units)', async () => {
		const vm = await loadedVm

		// Units are rendered with 8-bit subroutine, so skip (most of) them.
		for(let x = 0; x < 65536; x += 10) {
			const result = int16ToString(vm, x)
			expect(result).toBe(x.toString())
		}
	})
})

function int8ToString(vm: Vm, intValue: byte): string {
	const buffer = 0x5800
	vm.setRegisters({ A: intValue, HL: buffer })
	vm.callSubroutine(rom.INT8_TO_STRING, 274)
	const {HL} = vm.getRegisters()
	return asString(vm.getRam(buffer, HL - buffer))
}

function int16ToString(vm: Vm, intValue: number): string {
	const buffer = 0x5800
	vm.setRegisters({ BC: intValue, HL: buffer })
	vm.callSubroutine(rom.INT16_TO_STRING, 864)
	const {HL} = vm.getRegisters()
	return asString(vm.getRam(buffer, HL - buffer))
}
