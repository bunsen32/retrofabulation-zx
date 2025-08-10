import { byte } from "../zxsys/Byte.ts";
import {rom} from './generated/symbols.ts'
import type {SymbolToken, Token} from '@zx/interpreter'

export const EncodingFromSymbol: Record<string, TokType> = {
	'(': 'PARENOPEN',
    ')': 'PARENCLOSE',
    '[': 'ARROPEN',
    ']': 'ARRCLOSE',
	'=': 'EQ',
	'≠': 'NE',    // also parsed from '<>' and '!='
	'!=': 'X_NE',    // also parsed from '<>' and '!='
	'<>': 'X0_NE',    // also parsed from '<>' and '!='
	'>': 'GT',
	'≥': 'GE',    // also parsed from '>='
	'>=': 'X_GE',    // also parsed from '>='
	'<': 'LT',
	'<=': 'X_LE',    // also parsed from '<='
	'≤': 'LE',    // also parsed from '<='

	'+': 'ADD',
	'-': 'X_SUB',
	'–': 'SUB',
	'×': 'MUL',
	'/': 'DIV',
	'//': 'FLOORDIV',
	'%': 'MOD',
	'*': 'X_MUL',
	'**': 'EXP',
	'~': 'BITINV',

	'&': 'BITAND',    // bit-and
	'|': 'BITOR',    // bit-or
	'^': 'BITXOR',    // bit-xor
	'<<': 'BITSL',
	'>>': 'BITSR',

	',': 'COMMA',
	';': 'SEMICOLON',
	':': 'COLON',

	'_': 'DISCARD',
	'π': 'PI'
}

type IndexT = number|string

function invert<K extends IndexT,V extends IndexT>(map: Record<K,V>): Record<V,K> {
	const result = {} as Record<V,K>
	for(const [key, value] of Object.entries(map)) {
		result[value as V] = key as K
	}
	return result
}

export type TokType = Prefixed<'TOK_', keyof typeof rom>

type Prefixed<P extends string, D extends string> = D extends `${P}${infer S}` ? S : never

export function tok(k: TokType): byte {
	const v = rom[`TOK_${k}`].addr
	if (v < 0 || v > 255) throw `Token ${k} does not hold a byte value: ${v}`
	return v as byte
}