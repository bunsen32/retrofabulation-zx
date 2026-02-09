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
	rendersInt(0)
	rendersInt(9)
	rendersInt(10)
	rendersInt(11)
	rendersInt(15)
	rendersInt(16)
	rendersInt(19)
	rendersInt(20)
	rendersInt(42)
	rendersInt(49)
	rendersInt(50)
	rendersInt(51)
	rendersInt(99)
	rendersInt(100)
	rendersInt(101)
	rendersInt(110)
	rendersInt(160)
	rendersInt(199)
	rendersInt(201)
	rendersInt(249)	// Takes the most time.
	rendersInt(255)
})

function int8ToString(vm: Vm, intValue: byte): string {
	const buffer = 0x5800
	vm.setRegisters({ A: intValue, HL: buffer })
	vm.callSubroutine(rom.INT8_TO_STRING, 424)
	const {HL} = vm.getRegisters()
	return asString(vm.getRam(buffer, HL - buffer))
}
