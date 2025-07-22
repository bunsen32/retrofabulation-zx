import { byte } from "../zxsys/Byte.ts";
import {rom} from './generated/symbols.ts'
import type {SymbolToken, Token} from '@zx/interpreter'

export const EncodingFromSymbol: Record<string, byte> = {
	'(': tok('PARENOPEN'),
    ')': tok('PARENCLOSE'),
    '[': tok('ARROPEN'),
    ']': tok('ARRCLOSE'),
	'=': tok('EQ'),
	'≠': tok('NE'),    // also parsed from '<>' and '!='
	'!=': tok('X_NE'),    // also parsed from '<>' and '!='
	'<>': tok('X0_NE'),    // also parsed from '<>' and '!='
	'>': tok('GT'),
	'≥': tok('GE'),    // also parsed from '>='
	'<': tok('LT'),
	'≤': tok('LE'),    // also parsed from '<='

	'+': tok('ADD'),
	'-': tok('X_SUB'),
	'–': tok('SUB'),
	'×': tok('MUL'),
	'/': tok('DIV'),
	'//': tok('FLOORDIV'),
	'%': tok('MOD'),
	'*': tok('X_MUL'),
	'**': tok('EXP'),
	'~': tok('BITINV'),

	'&': tok('BITAND'),    // bit-and
	'|': tok('BITOR'),    // bit-or
	'^': tok('BITXOR'),    // bit-xor
	'<<': tok('BITSL'),
	'>>': tok('BITSR'),

	',': tok('COMMA'),
	';': tok('SEMICOLON'),
	':': tok('COLON'),

	'_': tok('DISCARD'),
	'π': tok('PI')
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