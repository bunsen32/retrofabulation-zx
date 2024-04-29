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
	'≤': 1,    // also parsed from '<=

	'+': 1,
	'-': 1,
	'*': 1,
	'/': 1,
	'%': 1,
	'**': 1,
	'~': 1,

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

}

export type KeywordToken = keyof typeof keywordLookup

export type SymbolToken = keyof typeof symbolLookup

export interface TokenStruct {
	t : String
}

export type Token = TokenStruct|KeywordToken|SymbolToken

export interface Newline {
	t: 'indent'
	v: number
}

export interface IntLiteral extends TokenStruct {
	t: 'intliteral',
	v: number
}

export interface FloatLiteral extends TokenStruct {
	t: 'floatliteral',
	v: number
}

export interface StringLiteral extends TokenStruct {
	t: 'stringliteral',
	v: String
}

export interface BoolLiteral extends TokenStruct {
	t: 'true'|'false',
	v: Boolean
}

export type LiteralToken = IntLiteral | FloatLiteral | StringLiteral | BoolLiteral

export type IdentifierTypeSigil = '%'|'#'|'?'|'$'

export interface Identifier extends TokenStruct {
	t: 'identifier',
	v: String,
	s?: IdentifierTypeSigil
}

export interface LineComment extends TokenStruct {
	t: 'comment',
	v: String
}

export interface UnrecognisedToken extends TokenStruct {
	t: '!!',
	v: String
}

export function intLiteral(v: number): IntLiteral {
	return {
		t: "intliteral",
		v: v
	}
}

export function identifier(name: String, sigil?: IdentifierTypeSigil): Identifier {
	return {
		t: 'identifier',
		v: name,
		s: sigil
	}
}

export function lineComment(comment: String): LineComment {
	return {
		t: 'comment',
		v: comment
	}
}