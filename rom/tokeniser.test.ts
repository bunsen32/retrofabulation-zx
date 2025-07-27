import { describe, it } from "jsr:@std/testing/bdd"
import {asString, loadVm, type word, type Vm} from './testutils/testvm.ts'
import type { byte } from '@zx/sys'
import { rom } from "./generated/symbols.ts";
import { expect } from "jsr:@std/expect/expect";
import {EncodingFromSymbol, tok} from './tokeniser.symbols.ts'

const loadedVm = loadVm()

describe("Tokeniser", () => {

	it("Returns no tokens for empty string", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([])
	})

	it("Interprets ‘&’ as TOK_BITAND", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "&")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('BITAND')])
	})

	for(const [symbol, encoding] of Object.entries(EncodingFromSymbol)) {
		it(`Interprets ‘${symbol}’ as encoding ${encoding}`, async () => {
			const vm = await loadedVm
			const text = givenText(vm, symbol)

			const result = whenTokenised(text)

			expect(result.tokenBytes).toEqual([encoding])
		})
	}

	for(const [symbol, encoding] of Object.entries(EncodingFromSymbol)) {
		it(`Interprets ‘${symbol}.’ as encoding ${encoding},TOK_NOSPACE,TOK_DOT`, async () => {
			const vm = await loadedVm
			const text = givenText(vm, symbol+'.')

			const result = whenTokenised(text)

			expect(result.tokenBytes).toEqual([encoding, tok('NOSPACE'), tok('DOT')])
		})
	}

	for(const [symbol, encoding] of Object.entries(EncodingFromSymbol)) {
		it(`Interprets ‘${symbol} .’ as encoding ${encoding},TOK_DOT`, async () => {
			const vm = await loadedVm
			const text = givenText(vm, symbol+' .')

			const result = whenTokenised(text)

			expect(result.tokenBytes).toEqual([encoding, tok('DOT')])
		})
	}

	it(`Interprets ‘.  .’ as encoding TOK_DOT,TOK_EXTRASPACE,TOK_DOT`, async () => {
		const vm = await loadedVm
		const text = givenText(vm, '.  .')

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('DOT'), tok('EXTRASPACE'), tok('DOT')])
	})

	it(`Interprets ‘.   .’ as encoding TOK_DOT,TOK_EXTRASPACE,TOK_EXTRASPACE,TOK_DOT`, async () => {
		const vm = await loadedVm
		const text = givenText(vm, '.   .')

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('DOT'), tok('EXTRASPACE'), tok('EXTRASPACE'), tok('DOT')])
	})

	it("Interprets ‘%0’ as TOK_RAW_BININT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "%0")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_BININT'), 0x01, 0x90, 1])
	})

	it("Interprets ‘%10101’ as TOK_RAW_BININT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "%10101")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_BININT'), 0x01, 0x90, 5])
	})

	it("Interprets ‘%1_0101’ as TOK_RAW_BININT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "%1_0101")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_BININT'), 0x01, 0x90, 6])
	})

	it("Interprets ‘0’ as TOK_RAW_DECINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "0")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_DECINT'), 0x00, 0x90, 1])
	})

	it("Interprets ‘99’ as TOK_RAW_DECINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "99")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_DECINT'), 0x00, 0x90, 2])
	})

	it("Interprets ‘6_6_6’ as TOK_RAW_DECINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "6_6_6")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_DECINT'), 0x00, 0x90, 5])
	})

	it("Interprets ‘0.0’ as TOK_RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "0.0")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 3])
	})

	it("Interprets ‘9.9’ as TOK_RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "9.9")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 3])
	})

	it("Interprets ‘54.32’ as TOK_RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "54.32")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 5])
	})

	it("Interprets ‘6.6.6’ as TOK_INVALID", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "6.6.6")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('INVALID'), 0x00, 0x90, 5])
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
	const readback = asString(vm.getRam(start, input.length + 1))
	expect(readback).toEqual(input + '\0')
	expect(vm.peekByte({addr: start + input.length})).toBe(0)

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
	vm.callSubroutine(rom.TOKENISE, 130 + text.length * 300)

	const { HL } = vm.getRegisters()
	expect(HL).toBeGreaterThan(tokenBuffer)
	const resultSize = HL - tokenBuffer
	expect(resultSize).toBeGreaterThan(0)
	expect(resultSize).toBeLessThan(256)
	const tokenUint8Array = vm.getRam(tokenBuffer, resultSize - 1)
	const tokenBytes: byte[] = []
	for(let i = 0; i < tokenUint8Array.length; i++) {
		tokenBytes.push(tokenUint8Array[i])
	}
	expect(vm.peekByte({addr: HL - 1}), "Expecting terminating zero").toBe(0)

	return {
		vm,
		tokenBytes
	}
}