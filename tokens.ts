export const tokens = [
    // identifier
    // string
    // numbers in various formats

    'false',
    'true',

    'module',
	'def',
	'let',
	'set',

	';',

	'return',

	'if',
	'else',
	'elif',
	'loop',
	'while',
	'for',
	'break',
	'continue',

	'not',
]

export const keywordLookup = {
	'false': 1,
	'true': 1,
    'module': 1,
	'def': 1,
	'let': 1,
	'set': 1,
	'return': 1,
	'if': 1,
	'else': 1,
	'elif': 1,
	'loop': 1,
	'while': 1,
	'for': 1,
	'break': 1,
	'continue': 1,
	'not': 1,
}

export const symbolLookup = {
    '(': 1,
    ')': 1,
    '[': 1,
    ']': 1,
	'=': 1,
	'≠': 1,    // also parsed from '<>' and '!='
	'>': 1,
	'≥': 1,    // also parsed from '>='
	'<': 1,
	'≤': 1,    // also parsed from '<='

	'+': 1,
	'-': 1,
	'×': 1,
	'/': 1,
	'%': 1,
	'**': 1,
	'~': 1,

	'+=': 1,
	'++': 1,
	'-=': 1,
	'--': 1,

	'&': 1,    // bit-and
	'|': 1,    // bit-or
	'^': 1,    // bit-xor
	'<<': 1,
	'>>': 1,

	',': 1,
	';': 1,
	':': 1,
	'{': 1,
	'}': 1,

	'π': 1,	// Also parsed from 'pi'
}

export type KeywordToken = keyof typeof keywordLookup

export type SymbolToken = keyof typeof symbolLookup

export type Token = TokenStruct|KeywordToken|SymbolToken

export interface Newline {
	t: 'indent'
	v: number
}

export interface IntLiteral {
	t: 'intliteral',
	v: number,
	s: 2|10|16
}

export interface FloatLiteral {
	t: 'floatliteral',
	v: number
}

export interface StringLiteral {
	t: 'stringliteral',
	v: String
}

export interface BoolLiteral {
	t: 'boolliteral',
	v: Boolean
}

export type LiteralToken = IntLiteral | FloatLiteral | StringLiteral | BoolLiteral

export type IdentifierTypeSigil = '%'|'#'|'?'|'$'

export interface Identifier {
	t: 'identifier',
	v: string,
	s?: IdentifierTypeSigil
}

export interface LineComment {
	t: 'comment',
	v: string
}

export interface UnrecognisedToken {
	t: '!!',
	v: string
}

export function intLiteral(v: number, base: 2|10|16 = 10): IntLiteral {
	return {
		t: "intliteral",
		v: v,
		s: base
	}
}

export function boolLiteral(v: boolean): BoolLiteral {
	return {
		t: "boolliteral",
		v: v
	}
}

export function identifier(name: string, sigil?: IdentifierTypeSigil): Identifier {
	return {
		t: 'identifier',
		v: name,
		s: sigil
	}
}

export function lineComment(comment: string): LineComment {
	return {
		t: 'comment',
		v: comment
	}
}

export type TokenStruct =
	LiteralToken |
	Identifier |
	LineComment |
	UnrecognisedToken