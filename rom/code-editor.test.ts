import { describe, it } from "jsr:@std/testing/bdd"
import {asString, loadVm, type word, type Vm, Z80Address} from './testutils/testvm.ts'
import {getScreenMono, cls, type Bitmap, cls1, assertBitmapImageMatches} from "./testutils/screen.ts"
import { CODES, type byte } from '@zx/sys'
import { rom } from "./generated/symbols.ts";
import { expect } from "jsr:@std/expect/expect";
import { spaceTok, tok } from "./tokeniser.symbols.ts";

const loadedVm = loadVm()
const globals = rom.G
const flashRate = rom.CURSOR_FLASH_RATE.addr

interface Example {
	stream: byte[]
	text: Z80Address
}

describe("Token rendering", () => {
	it('returns Z flag at end of stream', async () => {
		const vm = await loadedVm
		const stream = givenTokens(vm, [])

		const result = whenNextToken(stream)
		
		expect(result.isEnd).toBe(true)
	})
	const tokenTypes: Record<string,Example> = {
		/*
		invalid_short: {stream: []},
		invalid_long: {stream: []},
		comment_short: {stream: []},
		comment_long: {stream: []},
		identifier_short: {stream: []},
		identifier_long: {stream: []},
		string: {stream: []},
		real: {stream: []},
		int_decimal_short: {stream: []},
		int_decimal_long: {stream: []},
		int_hex: {stream: []},
		int_binary: {stream: []},*/
		operator: {stream: [tok('BITOR')], text: rom.TOKENS_TEXT.bitor},
		punctuation: {stream: [tok('SEMICOLON')], text: rom.TOKENS_TEXT.semicolon},
		boolean: {stream: [tok('AND')], text: rom.TOKENS_TEXT.and},
		controlflow: {stream: [tok('IF')], text: rom.TOKENS_TEXT.if},
		definition: {stream: [tok('IMPORT')], text: rom.TOKENS_TEXT.import},
	}

	for(const exampleName of Object.keys(tokenTypes)) {
		const example = tokenTypes[exampleName]
		it(`returns text for ${exampleName}`, async () => {
			const vm = await loadedVm
			const stream = givenTokens(vm, example.stream)

			const result = whenNextToken(stream)
			
			expect(result.text.addr).toBe(example.text.addr + 1)
		})
		it(`advances pointer after ${exampleName}`, async () => {
			const vm = await loadedVm
			const stream = givenTokens(vm, example.stream)

			const result = whenNextToken(stream)
			
			expect(result.streamPointer).toBe(stream.start + example.stream.length)
		})
	}

	it(`returns carry flag for preceding space`, async () => {
		const vm = await loadedVm
		const stream = givenTokens(vm, [spaceTok('SEMICOLON')])

		const result = whenNextToken(stream)
		
		expect(result.hasPrecedingSpace).toBe(true)
	})
	it(`returns no carry flag given no preceding space`, async () => {
		const vm = await loadedVm
		const stream = givenTokens(vm, [tok('SEMICOLON')])

		const result = whenNextToken(stream)
		
		expect(result.hasPrecedingSpace).toBe(false)
	})
})

interface TokenStream {
	vm: Vm
	start: number
}

interface ColouredTokenResult {
	text: Z80Address
	len: byte
	attr: byte
	isEnd: boolean
	hasPrecedingSpace: boolean
	streamPointer: number
}

function givenTokens(vm: Vm, tokens: byte[]): TokenStream {
	const start = 0x9000
	vm.setRam(start, [...tokens, 0])

	const buffer = {
		vm,
		start,
		length: tokens.length
	}
	// Set safety zone before and after buffer
	return buffer
}

function whenNextToken(text: TokenStream): ColouredTokenResult {
	const {vm, start} = text
	vm.setRegisters({
		HL: start,
		DE_: 0,
	})
	vm.callSubroutine(rom.DECODE, 2000)
	const {A, flags, DE, B, HL} = vm.getRegisters()
	return {
		text: {addr: DE},
		len: B,
		attr: A,
		streamPointer: HL,
		isEnd: flags.Z,
		hasPrecedingSpace: flags.C
	}
}