import { byte } from "../zxsys/Byte.ts";
import {rom} from './generated/symbols.ts'
import type {SymbolToken, Token} from '@zx/interpreter'

export const EncodingFromSymbol: Record<string, byte> = {
	'(': tok('TOK_PARENOPEN'),
    ')': tok('TOK_PARENCLOSE'),
    '[': tok('TOK_ARROPEN'),
    ']': tok('TOK_ARRCLOSE'),
	'=': tok('TOK_EQ'),
	'≠': tok('TOK_NE'),    // also parsed from '<>' and '!='
	'!=': tok('TOK_X_NE'),    // also parsed from '<>' and '!='
	'<>': tok('TOK_X0_NE'),    // also parsed from '<>' and '!='
	'>': tok('TOK_GT'),
	'≥': tok('TOK_GE'),    // also parsed from '>='
	'<': tok('TOK_LT'),
	'≤': tok('TOK_LE'),    // also parsed from '<='

	'+': tok('TOK_ADD'),
	'-': tok('TOK_X_SUB'),
	'–': tok('TOK_SUB'),
	'×': tok('TOK_MUL'),
	'/': tok('TOK_DIV'),
	'//': tok('TOK_FLOORDIV'),
	'%': tok('TOK_MOD'),
	'*': tok('TOK_X_MUL'),
	'**': tok('TOK_EXP'),
	'~': tok('TOK_BITINV'),

	'&': tok('TOK_BITAND'),    // bit-and
	'|': tok('TOK_BITOR'),    // bit-or
	'^': tok('TOK_BITXOR'),    // bit-xor
	'<<': tok('TOK_BITSL'),
	'>>': tok('TOK_BITSR'),

	',': tok('TOK_COMMA'),
	';': tok('TOK_SEMICOLON'),
	':': tok('TOK_COLON'),

	'π': 56
}

type IndexT = number|string

function invert<K extends IndexT,V extends IndexT>(map: Record<K,V>): Record<V,K> {
	const result = {} as Record<V,K>
	for(const [key, value] of Object.entries(map)) {
		result[value as V] = key as K
	}
	return result
}

function tok(k: keyof typeof rom): byte {
	const v = rom[k].addr
	if (v < 0 || v > 255) throw `Token ${k} does not hold a byte value: ${v}`
	return v as byte
}