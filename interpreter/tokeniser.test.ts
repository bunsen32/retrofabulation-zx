import {describe, expect, test} from '@jest/globals'
import {tokeniseLine} from "./tokeniser.ts"
import { identifier, intLiteral, lineComment } from './tokens.ts'

describe('Tokeniser', () => {
	test('Parses blank line', () => {
		const result = tokeniseLine('')

		expect(result).toMatchObject({indent: 0, tokens: []})
	})
	
	test('Counts 1 indent', () => {
		const result = tokeniseLine('\t')

		expect(result.indent).toBe(1)
	})

	test('Counts 2 indents', () => {
		const result = tokeniseLine('\t\t')

		expect(result.indent).toBe(2)
	})

	test('Counts 3 indents', () => {
		const result = tokeniseLine('\t\t\t')

		expect(result.indent).toBe(3)
	})

	test('Tokenises "if"', () => {
		const result = tokeniseLine('if')

		expect(result.tokens).toEqual(['if'])
	})

	test('Tokenises "identifier"', () => {
		const result = tokeniseLine('a$')

		expect(result.tokens).toEqual([identifier('a', '$')])
	})

	test('Tokenises "%"', () => {
		const result = tokeniseLine('%')

		expect(result.tokens).toEqual(['%'])
	})

	test('Parses decimal integer', () => {
		const result = tokeniseLine('7')

		expect(result.tokens).toEqual([intLiteral(7)])
	})


	test('Tokenises some stuff', () => {
		const input = '\tif a% % 7 <= 3: # test for condition'

		const result = tokeniseLine(input)

		expect(result.tokens).toEqual(
			['if', identifier('a', '%'), '%', intLiteral(7), '≤', intLiteral(3), ':', lineComment(' test for condition')]
		)
	})
})