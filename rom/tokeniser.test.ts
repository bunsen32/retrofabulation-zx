import { describe, it } from "jsr:@std/testing/bdd"
import {asString, loadVm, type word, type Vm} from './testutils/testvm.ts'
import type { byte } from '@zx/sys'
import { rom } from "./generated/symbols.ts";
import { expect } from "jsr:@std/expect/expect";
import {EncodingFromSymbol, ReservedWords, tok} from './tokeniser.symbols.ts'

const loadedVm = loadVm()

describe("Tokeniser", () => {

	it("Returns no tokens for empty string", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([])
	})

	it("Interprets ‘&’ as BITAND", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "&")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('BITAND')])
	})

	describe('Tokenises all symbols', () => {
		for(const [symbol, token] of Object.entries(EncodingFromSymbol)) {
			it(`Interprets ‘${symbol}’ as encoding ${token}`, async () => {
				const vm = await loadedVm
				const text = givenText(vm, symbol)

				const result = whenTokenised(text)

				expect(result.tokenBytes).toEqual([tok(token)])
			})
		}
	})

	describe('Tokenises all symbols followed immediately by another', () => {
		for(const [symbol, token] of Object.entries(EncodingFromSymbol)) {
			it(`Interprets ‘${symbol}.’ as encoding ${token},NOSPACE,DOT`, async () => {
				const vm = await loadedVm
				const text = givenText(vm, symbol+'.')

				const result = whenTokenised(text)

				expect(result.tokenBytes).toEqual([tok(token), tok('NOSPACE'), tok('DOT')])
			})
		}
	})

	describe('Tokenises all symbols followed by a space', () => {
		for(const [symbol, token] of Object.entries(EncodingFromSymbol)) {
			it(`Interprets ‘${symbol} .’ as encoding ${token},DOT`, async () => {
				const vm = await loadedVm
				const text = givenText(vm, symbol+' .')

				const result = whenTokenised(text)

				expect(result.tokenBytes).toEqual([tok(token), tok('DOT')])
			})
		}
	})

	describe('Tokenises all reserved words', () => {
		for(const [word, token] of Object.entries(ReservedWords)) {
			it(`Interprets ‘${word}’ as encoding ${token}`, async () => {
				const vm = await loadedVm
				const text = givenText(vm, word)

				const result = whenTokenised(text)

				expect(result.tokenBytes).toEqual([tok(token)])
			})
		}
	})

	describe('Avoids hash collisions in reserved words', () => {
		it("Avoid collision in ‘continue’ like ‘**ntinue’", async () => {
			const vm = await loadedVm
			const collision = findCollision('continue', '**ntinue')
			const text = givenText(vm, collision)

			const result = whenTokenised(text)

			expect(result.tokenBytes[0]).toEqual(tok('RAW_IDENT'))
		})

		it("Avoid collision in ‘continue’ like ‘contin**’", async () => {
			const vm = await loadedVm
			const collision = findCollision('continue', 'contin**')
			const text = givenText(vm, collision)

			const result = whenTokenised(text)

			expect(result.tokenBytes[0]).toEqual(tok('RAW_IDENT'))
		})

		it("Avoid collision in ‘continue’ like ‘**continue’", async () => {
			const vm = await loadedVm
			const collision = findCollision('continue', '**continue')
			const text = givenText(vm, collision)

			const result = whenTokenised(text)

			expect(result.tokenBytes[0]).toEqual(tok('RAW_IDENT'))
		})

		it("Avoid collision in ‘continue’ like ‘continue***’", async () => {
			const vm = await loadedVm
			const collision = findCollision('continue', 'continue***')
			const text = givenText(vm, collision)

			const result = whenTokenised(text)

			expect(result.tokenBytes[0]).toEqual(tok('RAW_IDENT'))
		})
	})

	it(`Interprets ‘. .’ as encoding DOT,DOT`, async () => {
		const vm = await loadedVm
		const text = givenText(vm, '. .')

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('DOT'), tok('DOT')])
	})

	it(`Interprets ‘.  .’ as encoding DOT,EXTRASPACE,DOT`, async () => {
		const vm = await loadedVm
		const text = givenText(vm, '.  .')

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('DOT'), tok('EXTRASPACE'), tok('DOT')])
	})

	it(`Interprets ‘.   .’ as encoding DOT,EXTRASPACE,EXTRASPACE,DOT`, async () => {
		const vm = await loadedVm
		const text = givenText(vm, '.   .')

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('DOT'), tok('EXTRASPACE'), tok('EXTRASPACE'), tok('DOT')])
	})

	it("Interprets ‘%0’ as RAW_BININT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "%0")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_BININT'), 0x01, 0x90, 1])
	})

	it("Interprets ‘%10101’ as RAW_BININT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "%10101")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_BININT'), 0x01, 0x90, 5])
	})

	it("Interprets ‘%1_0101’ as RAW_BININT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "%1_0101")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_BININT'), 0x01, 0x90, 6])
	})

	it("Interprets ‘$0’ as RAW_HEXINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "$0")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_HEXINT'), 0x01, 0x90, 1])
	})

	it("Interprets ‘$0123456789ABCDEF’ as RAW_HEXINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "$0123456789ABCDEF")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_HEXINT'), 0x01, 0x90, 16])
	})

	it("Interprets ‘$0123456789abcdef’ as RAW_HEXINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "$0123456789ABCDEF")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_HEXINT'), 0x01, 0x90, 16])
	})

	it("Interprets ‘$F_12BC’ as RAW_HEXINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "$1_0101")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_HEXINT'), 0x01, 0x90, 6])
	})

	it("Interprets ‘0’ as RAW_DECINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "0")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_DECINT'), 0x00, 0x90, 1])
	})

	it("Interprets ‘99’ as RAW_DECINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "99")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_DECINT'), 0x00, 0x90, 2])
	})

	it("Interprets ‘-99’ (hyphen) as RAW_DECINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "-99")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_DECINT'), 0x00, 0x90, 3])
	})

	it("Interprets ‘–99’ (en-dash) as RAW_DECINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "-99")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_DECINT'), 0x00, 0x90, 3])
	})

	it("Interprets ‘6_6_6’ as RAW_DECINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "6_6_6")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_DECINT'), 0x00, 0x90, 5])
	})

	it("Interprets ‘0.0’ as RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "0.0")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 3])
	})

	it("Interprets ‘9.9’ as RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "9.9")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 3])
	})

	it("Interprets ‘9.’ as RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "9.")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 2])
	})

	it("Interprets ‘9·9’ (mid-dot) as RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "9·9")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 3])
	})

	it("Interprets ‘54.32’ as RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "54.32")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 5])
	})

	it("Interprets ‘-54.32’ (hyphen) as RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "-54.32")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 6])
	})

	it("Interprets ‘–54.32’ (en-dash) as RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "-54.32")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 6])
	})

	it("Interprets ‘54.32e’ as INVALID", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "54.32e")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('INVALID'), 0x00, 0x90, 6])
	})

	it("Interprets ‘54.32e-’ as INVALID", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "54.32e-")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('INVALID'), 0x00, 0x90, 7])
	})

	it("Interprets ‘54.32e+’ as INVALID", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "54.32e+")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('INVALID'), 0x00, 0x90, 7])
	})

	it("Interprets ‘54.32e1’ as RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "54.32e1")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 7])
	})

	it("Interprets ‘54.32e+1’ as RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "54.32e+1")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 8])
	})

	it("Interprets ‘54.32e-1’ (hyphen) as RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "54.32e-1")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 8])
	})

	it("Interprets ‘54.32e–1’ (en-dash) as RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "54.32e–1")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 8])
	})

	it("Interprets ‘300e+99’ as RAW_REAL", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "300e+99")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 7])
	})

	it("Interprets ‘6.6.6’ as RAW_REAL,NOSPACE,DOT,NOSPACE,RAW_DECINT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "6.6.6")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_REAL'), 0x00, 0x90, 3, tok('NOSPACE'), tok('DOT'), tok('NOSPACE'), tok('RAW_DECINT'), 0x04, 0x90, 1])
	})

	it("Interprets ‘i’ as RAW_IDENT1", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "i")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_IDENT1'), 'i'.charCodeAt(0)])
	})

	it("Interprets ‘_5’ as RAW_IDENT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "_5")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_IDENT'), 0x00, 0x90, 2])
	})

	it("Interprets ‘A23456789’ as RAW_IDENT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "A23456789")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_IDENT'), 0x00, 0x90, 9])
	})

	it("Interprets ‘A234567890’ as RAW_IDENT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, "A234567890")

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_IDENT'), 0x00, 0x90, 10])
	})

	it("Tokenises empty COMMENT", async () => {
		const vm = await loadedVm
		const text = givenText(vm, '#')

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_COMMENT'), 0x01, 0x90, 0])
	})

	it("Tokenises COMMENT", async () => {
		const vm = await loadedVm
		const line = "# Hello? $ Unparsed!-;:comment"
		const text = givenText(vm, line)

		const result = whenTokenised(text)

		expect(result.tokenBytes).toEqual([tok('RAW_COMMENT'), 0x01, 0x90, line.length - 1])
	})

	describe('String tokenisation', () => {
		it("Tokenises empty string (shaped quotes)", async () => {
			const vm = await loadedVm
			const text = givenText(vm, '“”')

			const result = whenTokenised(text)

			expect(result.tokenBytes).toEqual([tok('RAW_STRING'), 0x01, 0x90, 0])
		})

		it("Tokenises empty string (straight quotes)", async () => {
			const vm = await loadedVm
			const text = givenText(vm, '""')

			const result = whenTokenised(text)

			expect(result.tokenBytes).toEqual([tok('RAW_STRING'), 0x01, 0x90, 0])
		})

		it("Tokenises non-empty string (shaped quotes)", async () => {
			const vm = await loadedVm
			const text = givenText(vm, '“abc”')

			const result = whenTokenised(text)

			expect(result.tokenBytes).toEqual([tok('RAW_STRING'), 0x01, 0x90, 3])
		})

		it("Unterminated string is invalid", async () => {
			const vm = await loadedVm
			const text = givenText(vm, '"xy')

			const result = whenTokenised(text)

			expect(result.tokenBytes).toEqual([tok('INVALID'), 0x00, 0x90, 3])
		})
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

function whenTokenised(text: TextBuffer): TokenStream {
	const {vm, start} = text
	const tokenBuffer = 0xa000
	vm.setRegisters({
		DE: start,
		HL: tokenBuffer
	})
	vm.callSubroutine(rom.TOKENISE, 130 + (text.length + 1) * 170)

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

function findCollision(target: string, pattern: string): string {
	const firstWildcard = pattern.indexOf('*')
	const lastWildcard = pattern.lastIndexOf('*')
	if (firstWildcard === -1) throw "Cannot find wildcard * in candidate string!"
	const countWildcards = lastWildcard + 1 - firstWildcard
	const hash = hashOf(target)
	const prefix = pattern.substring(0, firstWildcard)
	const suffix = pattern.substring(lastWildcard + 1)
	let result: string|undefined
	switch(countWildcards) {
		case 2:
			result = findCollision2(hash, prefix, suffix, target)
			break
		case 3:
			result = findCollision3(hash, prefix, suffix, target)
			break
		default: throw "Only know how to deal with 2 wildcard characters!"
	}
	if (!result) throw `Cannot find hash collision for ‘${target}’ from ‘${pattern}’`
	return result
}

const alphabetic = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

function findCollision2(targetHash: number, prefix: string, suffix: string, avoid: string): string|undefined {
	for(const a of alphabetic) {
		for (const b of alphabetic) {
			const candidate = prefix + a + b + suffix
			if (hashOf(candidate) === targetHash && candidate !== avoid) return candidate
		}
	}
	return undefined
}

function findCollision3(targetHash: number, prefix: string, suffix: string, avoid: string): string|undefined {
	for(const a of alphabetic) {
		for (const b of alphabetic) {
			for (const c of alphabetic) {
				const candidate = prefix + a + b + c + suffix
				if (hashOf(candidate) === targetHash && candidate !== avoid) return candidate
			}
		}
	}
	return undefined
}

function hashOf(word: string): number {
	return hash(word, rom.RESERVEDW_HASH.seed.addr, rom.RESERVEDW_HASH.xor.addr)
}

function hash(word: string, start: number, xor: number): number {
	let a = start
	for(let i = 0; i < word.length; i ++) {
		const c = word.charCodeAt(i)
		a = add(a, c)
		a = rr(a) ^ xor
	}
	return a % rom.RESERVEDW_HASH.size.addr
}

function rr(n: number): number {
	return ((n >> 1) | (n << 7)) & 0xff
}

function add(n: number, m: number) {
	return (n + m) & 0xff
}
