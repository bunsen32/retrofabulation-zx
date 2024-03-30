type byte = number

// OP-code: 0b_JUMP_DATA

enum opHigh {
	Nop = 0, // Padding, if required. (nop, endif, line-continuation, else)
	NeedsAnalysis = 1, // If func/proc requires name or type resolution before execution. 
	Literal = 2,

	// All of these are followed by a 1-byte LSB of jump offset
	// Offset is (hex) xYY, where x is low-nyble of OP.
	EndIfBranch = 0x3, // fwd: "else" (if followed by anything other than an "elif" statement)
	For = 0x4, // fwd
	EndLoop = 0x5, // back

	IntOp = 8,
	Int32Op = 9,
	FltOp = 0xA,
	StrOp = 0xB,

}

export enum Op {
	// ----------------------------------------
	// TABLE-0 instructions (no ‘current value’)

	Nop = 0x00, // Padding, if required. (nop, endif, line-continuation, else)
	NopLineContinuation = 0x01,
	NopEndIf = 0x02,
	NopElse = 0x03,
	NopParens = 0x04,	// A bracketed expression

	HALT = 0x0E,
	NeedsAnalysis = 0x0F, // If func/proc requires name or type resolution before execution. 

	CallReturn = 0x1A, // Calls and returns

	LiteralFalse = 0x12,
	LiteralTrue = 0x13,

	LiteralFalseStack = 0x15,
	LiteralTrueStack = 0x16,
	LiteralEmptyString = 0x17,

	LiteralInt0 = 0x18,
	LiteralLong0 = 0x19,
	LiteralFloat0 = 0x1A,
	LiteralInt1 = 0x1B,
	LiteralLong1 = 0x1C,
	LiteralFloat1 = 0x1D,
	LiteralFloatPi = 0x1E,
	LiteralFloatE = 0x1F,

	LocalLoadsNear = 0x20,

	// All of these are followed by a 1-byte LSB of jump offset
	// Offset is (hex) xYY, where x is low-nyble of OP.
	EndIfBranch = 0x30, // fwd: "else" (if followed by anything other than an "elif" statement)
	For = 0x40, // fwd
	EndLoop = 0x50, // back (0b1100)
	// NB: "break" & "continue" are encoded as "break if true", "continue if true"

	// Followed by 1 byte of data (0b1101):
	Literal8IntBin = 0x60,
	Literal8IntDec = 0x61,
	Literal8IntHex = 0x62,
	Literal8Float = 0x63,
	Literal8LongBin = 0x64,
	Literal8LongDec = 0x65,
	Literal8LongHex = 0x66,
	LiteralString1 = 0x67,	// One-character string

	LocalLoad16Far = 0x6E,
	LocalLoad32Far = 0x6F,

	// Followed by 2 bytes of data (0b1101):
	Literal16IntBin = 0x70,
	Literal16IntDec = 0x71,
	Literal16IntHex = 0x72,
	Literal16Float = 0x73,
	Literal16LongBin = 0x74,
	Literal16LongDec = 0x75,
	Literal16LongHex = 0x76,
	LiteralString2 = 0x77,	// Two-character string
	LiteralStringP = 0x78,	// Literal string pointer

	ModuleLoad16 = 0x79,
	ModuleLoad32 = 0x7A,

	// Followed by 4 bytes of data (0b1110):
	Literal32LongBin = 0x7C,
	Literal32LongDec = 0x7D,
	Literal32LongHex = 0x7E,
	Literal32Float = 0x7F,


	// ----------------------------------------
	// TABLE-2 instructions (has ‘current value’)

	// Integer16:
	IntEq = 0x80,
	IntNe = 0x81,
	IntGt = 0x82,
	IntGe = 0x83,
	IntLt = 0x84,
	IntLe = 0x85,

	IntAdd = 0x86,
	IntSub = 0x87,
	IntMul = 0x88,
	IntDiv = 0x89,
	IntMod = 0x8A,

	IntBitAnd = 0x8B, // '&'
	IntBitOr = 0x8C, // '|'
	IntBitXor = 0x8D, // '^'
	IntBitShl = 0x8E, // '<<'
	IntBitShr = 0x8F, // '>>'

	// Integer32:
	LongEq = 0x90,
	LongNe = 0x91,
	LongGt = 0x92,
	LongGe = 0x93,
	LongLt = 0x94,
	LongLe = 0x95,

	LongAdd = 0x96,
	LongSub = 0x97,
	LongMul = 0x98,
	LongDiv = 0x99,
	LongMod = 0x9A,

	LongBitAnd = 0x9B, // '&'
	LongBitOr = 0x9C, // '|'
	LongBitXor = 0x9D, // '^'
	LongBitShl = 0x9E, // '<<'
	LongBitShr = 0x9F, // '>>'

	// Float:
	FltEq = 0xA0,
	FltNe = 0xA1,
	FltGt = 0xA2,
	FltGe = 0xA3,
	FltLt = 0xA4,
	FltLe = 0xA5,

	FltAdd = 0xA6,
	FltSub = 0xA7,
	FltMul = 0xA8,
	FltDiv = 0xA9,
	FltMod = 0xAA,

	// String:
	StrEq = 0xB0,
	StrNe = 0xB1,
	StrGt = 0xB2,
	StrGe = 0xB3,
	StrLt = 0xB4,
	StrLe = 0xB5,

	StrCat = 0xB6,

	LocalStoresNear = 0xC0,

	// Followed by 1 byte of data:
	LocalStore16Far = 0xE0,
	LocalStore32Far = 0xE1,

	// Followed by 2 bytes of data
	ModuleStore16 = 0xF0,
	ModuleStore32 = 0xF1,

	HALT1 = 0xFF,
}

export enum BoolOp {
	Discard = 0x00, // Throw away boolean value
	Parens = 0x08, // Bracketed boolean expression (maintain value)
	BoolEq = 0x10,
	BoolNe = 0x18,	// Same as "xor"
	BoolNot = 0x20,
	BoolAnd = 0x28, // Short-circuit, conditional execution, like an "if"
	BoolOr = 0x30, // Short-circuit, conditional execution, like an "if"
	BoolStoreLocal = 0x40,
	BoolStoreModule = 0x48,
	BoolPush = 0x50,

	// All of these are followed by a 1-byte LSB of jump offset
	// Offset is (hex) xYY, where x is low-nyble of OP.
	If =	0x80, // fwd
	Elif =	0x90, //fwd
	While = 0xA0, // fwd: 'loop' is encoded (and parsed from) "true, while"
	Break = 0xB0, // fwd
	Continue = 0xC0, // back
}

const statements = [
	'module',
	'def',
	'let',
	'set',

	'nop', // Padding, if required.
	'endif', // Fall through at end of "if", but we need to mark it visually.
	'line-continuation', // ';' multiple statements on one line.
	'else', // Maybe we need it for rendering, but not for parsed/compiled code?

	'return', // return, no result
	'return1', // return, result
	'call',

	'if',
	'elif',
	'endifbranch', // "else" (if followed by anything other than an "elif" statement)
	'while', // 'loop' is encoded (and parsed from) "true, while"
	'for',
	'endloop',
	'break',
	'continue',
]
const boolOperators = [
	'=',
	'≠',
	'or',
	'and',
	'not'
]
const intOperators = [
	// Return boolean:
	'=',
	'≠',
	'>',
	'≥',
	'<',
	'≤',

	'+',
	'-',
	'*',
	'/',
	'%',

	'&', // bit-and
	'|', // bit-or
	'^', // bit-xor
	'<<',
	'>>',
]
const OperatorsExpensive = [
	// Returns strings
	'+', // Concatenation

	// Returns floats
	'+',
	'-',
	'*',
	'/',
	'^',

	// Returns ints
	'*',
	'/',
	'%', // modulus
]
enum Cat {
	LiteralNum = 1,
	Function = 2,
	Expr = 3,
	Statement = 4,
	LiteralStr = 5,
}
export enum NumPres {
	Bin = 0,
	DecimalInt = 1,
	Hex = 2,
	Float = 3,
}

function parse(text: string): byte[] {
	const lines = text.split('\n')
	let out = []
	let p = 0

	return out
}

export function literal16(pres: NumPres) {
	return Op.Literal16IntBin + pres
}

export function load16(slotNumber) {
	if (slotNumber < 8) {
		return Op.LocalLoadsNear | (slotNumber << 1) | 0
	}
	throw "Unsupported load16 "+slotNumber
}

export function store16(slotNumber) {
	if (slotNumber < 8) {
		return Op.LocalStoresNear | (slotNumber << 1) | 0
	}
	throw "Unsupported store16 "+slotNumber
}

const sample: byte[][] = [
	[
		literal16(NumPres.DecimalInt), 0xee, 0x3a,
		literal16(NumPres.Hex), 0xee, 0x3a,
		Op.IntAdd,
		literal16(NumPres.Bin), 0xee, 0x3a,
		Op.IntEq,
		BoolOp.BoolNot,

		BoolOp.If, 0x00	
	],
]

function render(tokens: byte[]): string{
	let lines: string[] = []

	for(let raw of sample) {
		const renderedLine = renderLine(raw)
		lines.push(renderedLine)
	}
	return lines.join('\n')
}

function renderLine(tokens: byte[], start = 0): string {
	const stack: string[] = []
	let mode : "normal" | "bool" = "normal"
	let p = start
	while (p < tokens.length) {
		const b = tokens[p++]
		if (mode == "normal") {
			const cat = (b >> 4) as opHigh
			switch (cat) {

				case opHigh.IntOp: {
					const op = intOperators[b & 0xf]			
					const o2 = stack.pop()
					const o1 = stack.pop()
					stack.push(`${o1} ${op} ${o2}`)
					console.log(stack[stack.length - 1])
					if (b < Op.IntAdd) mode = "bool"
					break;
				}

				case opHigh.EndIfBranch: {
					break;
				}

				case 1: {
					switch (b as Op){
					case Op.Literal16IntBin:
					case Op.Literal16IntDec:
					case Op.Literal16IntHex:
						const n = tokens[p++] + (tokens[p++] << 8)
						const presentation = (b & 3) as NumPres
						stack.push(renderLiteralInt(n, presentation))
						break
					default:
						throw `Unrecognised Literal16 op ${b.toString(16)} at position ${p-1}`
					}
					break
				}

				default:
					throw `Unrecognised symbol category ${cat.toString(16)} at position ${p-1}`
			}
		} else {
			// Mode == "bool"
			const op = (b & 0xF8) as BoolOp
			switch (op) {
				case BoolOp.BoolNot: {
					const exp = stack.pop()
					stack.push(`not ${exp}`)
					break
				}
				case BoolOp.If: {
					const offset = tokens[p++]
					const exp = stack.pop()
					stack.push(`if ${exp}:`)
					mode = "normal"
					break
				}
				default:
					throw "Unrecognised bool opcode " + op
			}
		}
	}
	return stack.join(' ')
}

function renderLiteralInt(n: number, presentation: number): string {
	switch (presentation){
		case NumPres.DecimalInt: return n.toString()
		case NumPres.Hex: return "&"+n.toString(16).toLowerCase()
		case NumPres.Bin: return "%"+n.toString(2)
		default: throw "unrecognised number format: " + presentation
	}
}
