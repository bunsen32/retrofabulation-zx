import {literal16, Op, BoolOp, NumPres, load16, store16} from "./parsing"
import { Token, LiteralToken, IntLiteral, FloatLiteral, StringLiteral, Identifier, LineComment, UnrecognisedToken, KeywordToken, keywordLookup, intLiteral } from './tokens'

type Line = {indent: number, tokens: Token[]}

export function tokeniseLine(text: string): Line {
	const tokens: Token[] = []
	let p = 0

	let next : number = p < text.length ? text.charCodeAt(p++) : undefined
	function fetchNext() : number {
		const result = next
		next = p < text.length ? text.charCodeAt(p++) : undefined
		return result
	}

	function fetchToEndOfLine(): String {
		const str = text.substring(p - 1)
		p = text.length
		next = undefined
		return str
	}

	let indent = 0
	while (next == 0x20 || next == 0x09) {
		indent++
		fetchNext()
	}

	while (next != null) {
		if (next <= 0x20) {
			fetchNext()

		} else if (isNumeric(next)) { // Digits 0–9
			tokens.push(parseDecimalNumber())

		} else if (isAlphabetic(next) || next == 0x5f) { // Letter or underscore
			tokens.push(parseWord())

		} else {
			const nextChar = String.fromCharCode(next)
			switch (nextChar) {
				case '#':
					tokens.push(parseLineComment())
					break
				case '"':
					tokens.push(parseString())
					break
				case '$':
					tokens.push(parseHexNumber())
					break
				case '%':
					tokens.push(parseBinNumber())
					break
				case '&':
				case '(':
				case ')':
				case '*':
				case '+':
				case ',':
				case '-':
				case '/':
				case ':':
				case ';':
				case '=':
				case '[':
				case ']':
				case '^':
				case '{':
				case '|':
				case '}':
				case '~':
				case '≤':
				case '≥':
				case '≠':
					tokens.push(nextChar)
					fetchNext()
					break
				case '<':
					tokens.push(parseLt())
					break
				case '>':
					tokens.push(parseGt())
					break
				case '!':
					tokens.push(parseExclam())
					break
				default:
					const str = String.fromCharCode(next)
					fetchNext()
					tokens.push(unrecognised(str))
			}
		}
	}

	return {indent, tokens}

	function parseLineComment(): LineComment {
		fetchNext()
		const str = fetchToEndOfLine()
		return {
			t: 'comment',
			v: str
		}
	}

	function parseLt(): Token {
		fetchNext()
		if (next != null) {
			switch (String.fromCharCode(next)) {
				case '>':
					fetchNext()
					return '≠'
				case '=':
					fetchNext()
					return '≤'
				default:
					break
			}
		}

		return '<'
	}

	function parseGt(): Token {
		fetchNext()
		if (next != null) {
			switch (String.fromCharCode(next)) {
				case '=':
					fetchNext()
					return '≥'
				default:
					break
			}
		}

		return '>'
	}

	function parseExclam(): Token {
		fetchNext()
		if (next != null) {
			switch (String.fromCharCode(next)) {
				case '=':
					fetchNext()
					return {t: '≠'}
				default:
					break
			}
		}

		return unrecognised('!')
	}

	function parseDecimalNumber(): IntLiteral|FloatLiteral {
		let str = String.fromCharCode(next)
		let isDot = false
		let isExponent = false
		while (true) {
			fetchNext()
			if (next >= 0x30 && next <= 0x39) {
				str += String.fromCharCode(next)
				continue

			} else if (next == 0x2e) {
				isDot = true
				break

			} else if (next == 0x45 || next == 65) {
				isExponent = true
				break

			} else if (isAlphabetic(next)) {
				throw "Syntax error. Alphabetic characters in number"
			
			} else {
				return intLiteral(Number.parseInt(str))
			}
		}
		if (isDot) {
			str += '.'
			while (true) {
				fetchNext()
				if (isNumeric(next)) {
					str += String.fromCharCode(next)
					continue
	
				} else if (next == 0x2e) {
					throw "Syntax error: Two decimal points in number!"

				} else if (next == 0x45 || next == 65) {
					isExponent = true
					break
	
				} else if (isAlphabetic(next)) {
					throw "Syntax error. Alphabetic characters in number"
				
				} else {
					isExponent = false
					break
				}
			}
		}
		if (isExponent) {
			str += "e"
			while (true) {
				if (isNumeric(next)) {
					str += String.fromCharCode(next)
					continue

				} else if (next == 0x2e) {
					throw "Synax error: Decimal point not allowed in exponent"

				} else if (next == 0x45 || next == 65) {
					throw "Syntax error: multiple exponents not allowed"

				} else if (isAlphabetic(next)) {
					throw "Syntax error. Alphabetic characters in number"
				
				} else {
					break
				}
			}
		}
		return {
			t: "floatliteral",
			v: Number.parseFloat(str)
		}
	}

	function parseHexNumber(): IntLiteral {
		let str = ''
		while (true) {
			fetchNext()
			if (isNumeric(next)) { // 0–9
				str += String.fromCharCode(next)

			} else if (next >= 0x41 && next <= 0x46) { // A–F
				str += String.fromCharCode(next)

			} else if (next >= 0x61 && next <= 66) { // a–f
				str += String.fromCharCode(next - 0x20)

			} else if (isAlphabetic(next)) {
				throw "Syntax error: Alphabetic character in binary literal"

			} else {
				break
			}
		}

		return {
			t: 'intliteral',
			v: Number.parseInt(str, 16)
		}
	}

	function parseBinNumber(): IntLiteral|'%' {
		fetchNext()
		if (next == null || !isNumeric(next)) {
			return '%'
		}

		let str = ''
		while (true) {
			if (next == 0x30 || next == 0x31) { // 0 or 1
				str += String.fromCharCode(next)

			} else if (next >= 0x32 && next <= 0x39) {
				throw "Syntax error: digit 2–9 in binary literal"

			} else if (isAlphabetic(next)) {
				throw "Syntax error: Alphabetic character in binary literal"

			} else {
				break
			}
			fetchNext()
		}
		return {
			t: 'intliteral',
			v: Number.parseInt(str, 2)
		}
	}

	function parseWord(): Token|Identifier {
		let str = String.fromCharCode(next)
		let possiblyKeyword = true
		let sigil
		while (true) {
			fetchNext()
			if (isAlphabetic(next)) {
				str += String.fromCharCode(next)

			} else if (isNumeric(next) || next == 0x5f) {
				str += String.fromCharCode(next)
				possiblyKeyword = false

			} else if (next == 0x24 || next == 0x23 || next == 0x25 || next == 0x3f) { // $, #, %, ?
				sigil = String.fromCharCode(next)
				str += sigil
				fetchNext()
				break

			} else {
				break
			}
		}
		if (str.length > 8) possiblyKeyword = false
		return (possiblyKeyword && keywordLookup[str])
			? str as KeywordToken
			: {
				t: 'identifier',
				v: str,
				s: sigil
			}
	}

	function parseString(): StringLiteral {
		let str = ''
		while (true) {
			fetchNext()
			if (next == undefined || next == 0x0){
				throw "Syntax error: string not terminated"

			} else if (next < 0x20) {
				throw "Syntax error: invalid character in string"

			} else if (next == 0x33) {
				break

			} else {
				str += String.fromCharCode(next)
			}
		}

		return {
			t: 'stringliteral',
			v: str
		}
	}
	
	function isAlphabetic(next: number): Boolean {
		return next >= 0x41 && next <= 0x5a || next >= 0x61 && next <= 0x7a
	}
	function isNumeric(next: number): Boolean {
		return next >= 0x30 && next <= 0x39
	}

	function unrecognised(tokenText: String): UnrecognisedToken {
		return {
			t: '!!',
			v: tokenText
		}
	}
}

