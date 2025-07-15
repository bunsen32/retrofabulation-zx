import { describe, it } from "jsr:@std/testing/bdd"
import {asString, loadVm, type word, type Vm} from './testutils/testvm.ts'
import type { byte } from '@zx/sys'
import { rom } from "./generated/symbols.ts";
import { expect } from "jsr:@std/expect/expect";

const loadedVm = loadVm()

describe("Tokeniser", () => {

	it("Returns no tokens for empty string", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toBe([0])
	})

	it("Interprets ‘&’ as TOK_BITAND", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "&")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([rom.TOK_BITAND.addr])
	})
})

interface TextBuffer {
	vm: Vm
	start: word
	length: byte
}

interface TokenStream {
	vm: Vm
	tokenBytes: ArrayLike<byte>
}

function givenText(vm: Vm, input: string): TextBuffer {
	expect(input.length < 256)
	const start = 0x9000
	vm.setRam(start, input + '\0')

	const buffer = {
		vm,
		start,
		length: input.length as byte
	}
	// Set safety zone before and after buffer
	return buffer
}

function writeSafetyMargin(vm: Vm, buffer: TextBuffer) {
	const start = buffer.start
	const end = start + buffer.length
	vm.setRam(start - 4, '0123')
	vm.setRam(end, '6789')
}

function checkSafetyMargin(vm: Vm, buffer: TextBuffer) {
	const start = buffer.start
	const end = start + buffer.length
	const before = asString( vm.getRam(start - 4, 4))
	const after = asString(vm.getRam(end, 4))

	expect(before).toEqual('0123')
	expect(after).toEqual('6789')
}

function whenTokenised(text: TextBuffer): TokenStream {
	const {vm, start} = text
	const tokenBuffer = 0xa000
	vm.setRegisters({
		DE: start,
		HL: tokenBuffer
	})
	vm.callSubroutine(rom.TOKENISE, 2000)
	const { HL } = vm.getRegisters()
	expect(HL).toBeGreaterThan(tokenBuffer)
	const resultSize = HL - tokenBuffer
	expect(resultSize < 256)
	const tokenBytes = vm.getRam(tokenBuffer, resultSize)
	return {
		vm,
		tokenBytes
	}
}