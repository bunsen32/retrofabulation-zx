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
	//for(let x = 0; x < 65536; x+=2) rendersInt(x as byte);
	rendersInt(0)
	rendersInt(9)
	rendersInt(10)
	rendersInt(255)
	rendersInt(256)
	rendersInt(499)
	rendersInt(500)
	rendersInt(501)
	rendersInt(999)
	rendersInt(1000)
	rendersInt(1001)
	rendersInt(4999)
	rendersInt(5000)
	rendersInt(5001)
	rendersInt(9999)
	rendersInt(10101)
	rendersInt(34449)
	rendersInt(42480)
	rendersInt(42495)
	rendersInt(42499)
	rendersInt(44444)
	rendersInt(49998)
	rendersInt(59999)
	rendersInt(64995)
	rendersInt(65534)
	rendersInt(65535)
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
	vm.callSubroutine(rom.INT16_TO_STRING, 933)
	const {HL} = vm.getRegisters()
	return asString(vm.getRam(buffer, HL - buffer))
}
