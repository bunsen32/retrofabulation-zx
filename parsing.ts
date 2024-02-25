type byte = number

// OP-code: 0b_JUMP_DATA

enum opHigh {
	Nop = 0, // Padding, if required. (nop, endif, line-continuation, else)
	NeedsAnalysis = 1, // If func/proc requires name or type resolution before execution. 
	Literal = 2,
	IntOp = 4,
	Int32Op = 5,
	FltOp = 6,
	StrOp = 7,

	// All of these are followed by a 1-byte LSB of jump offset
	// Offset is (hex) xYY, where x is low-nyble of OP.
	EndIfBranch = 0x8, // fwd: "else" (if followed by anything other than an "elif" statement)
	For = 0x9, // fwd
	Break = 0xA, // fwd
	Continue = 0xB, // back
	EndLoop = 0xC, // back

	Literal8 = 0xD,
	Literal16 = 0xE,
	Literal32 = 0xF,
}

enum Op {
	Nop = 0x00, // Padding, if required. (nop, endif, line-continuation, else)
	NopLineContinuation = 0x01,
	NopEndIf = 0x02,
	NopElse = 0x03,
	NopParens = 0x04,	// A bracketed expression

	NeedsAnalysis = 0x10, // If func/proc requires name or type resolution before execution. 
	Assignment = 0x11, // And dereferences?
	Definition = 0x12, // And other definitions within a proc/func
	CallReturn = 0x13, // Calls and returns

	LiteralEmptyString = 0x1B,
	LiteralFalseStack = 0x1C,
	LiteralTrueStack = 0x1D,
	LiteralFalse = 0x1E,
	LiteralTrue = 0x1F,

	LiteralIntBin0 = 0x20,
	LiteralIntDec0 = 0x21,
	LiteralIntHex0 = 0x22,
	LiteralLongBin0 = 0x20,
	LiteralLongDec0 = 0x21,
	LiteralLongHex0 = 0x22,
	LiteralIntBin1 = 0x20,
	LiteralIntDec1 = 0x21,
	LiteralIntHex1 = 0x22,
	LiteralLongBin1 = 0x20,
	LiteralLongDec1 = 0x21,
	LiteralLongHex1 = 0x22,
	LiteralFloat1 = 0x24,

	// Integer16:
	IntEq = 0x40,
	IntNe = 0x41,
	IntGt = 0x42,
	IntGe = 0x43,
	IntLt = 0x44,
	IntLe = 0x45,

	IntAdd = 0x46,
	IntSub = 0x47,
	IntMul = 0x48,
	IntDiv = 0x49,
	IntMod = 0x4A,

	IntBitAnd = 0x4B, // '&'
	IntBitOr = 0x4C, // '|'
	IntBitXor = 0x4D, // '^'
	IntBitShl = 0x4E, // '<<'
	IntBitShr = 0x4F, // '>>'

	// Integer32:
	LongEq = 0x50,
	LongNe = 0x51,
	LongGt = 0x52,
	LongGe = 0x53,
	LongLt = 0x54,
	LongLe = 0x55,

	LongAdd = 0x56,
	LongSub = 0x57,
	LongMul = 0x58,
	LongDiv = 0x59,
	LongMod = 0x5A,

	LongBitAnd = 0x5B, // '&'
	LongBitOr = 0x5C, // '|'
	LongBitXor = 0x5D, // '^'
	LongBitShl = 0x5E, // '<<'
	LongBitShr = 0x5F, // '>>'

	// Float:
	FltEq = 0x60,
	FltNe = 0x61,
	FltGt = 0x62,
	FltGe = 0x63,
	FltLt = 0x64,
	FltLe = 0x65,

	FltAdd = 0x66,
	FltSub = 0x67,
	FltMul = 0x68,
	FltDiv = 0x69,
	FltMod = 0x6A,

	// String:
	StrEq = 0x70,
	StrNe = 0x71,
	StrGt = 0x72,
	StrGe = 0x73,
	StrLt = 0x74,
	StrLe = 0x75,

	StrCat = 0x76,

	// All of these are followed by a 1-byte LSB of jump offset
	// Offset is (hex) xYY, where x is low-nyble of OP.
	EndIfBranch = 0x80, // fwd: "else" (if followed by anything other than an "elif" statement)
	For = 0x90, // fwd
	Break = 0xA0, // fwd (include these versions? or just boolean ones?)
	Continue = 0xB0, // back (include these versions? or just boolean ones?)
	EndLoop = 0xC0, // back (0b1100)

	// Followed by 1 byte of data (0b1101):
	Literal8IntBin = 0xD0,
	Literal8IntDec = 0xD1,
	Literal8IntHex = 0xD2,
	Literal8LongBin = 0xD4,
	Literal8LongDec = 0xD5,
	Literal8LongHex = 0xD6,
	Literal8Float = 0xD8,
	LiteralString1 = 0xDE,	// One-character string

	// Followed by 2 bytes of data (0b1101):
	Literal16IntBin = 0xE0,
	Literal16IntDec = 0xE1,
	Literal16IntHex = 0xE2,
	Literal16LongBin = 0xE4,
	Literal16LongDec = 0xE5,
	Literal16LongHex = 0xE6,
	Literal16Float = 0xE8,
	LiteralString2 = 0xEE,	// Two-character string
	LiteralStringP = 0xEF,	// Literal string pointer

	// Followed by 4 bytes of data (0b1110):
	Literal32IntBin = 0xF0,	// Error (or at least: risk of overflow)
	Literal32IntDec = 0xF1,	// Error (or at least: risk of overflow)
	Literal32IntHex = 0xF2,	// Error (or at least: risk of overflow)
	Literal32LongBin = 0xF4,
	Literal32LongDec = 0xF5,
	Literal32LongHex = 0xF6,
	Literal32Float = 0xF8,
}

enum BoolOp {
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
	While = 0xB0, // fwd: 'loop' is encoded (and parsed from) "true, while"
	Break = 0xD0, // fwd
	Continue = 0xE0, // back
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
enum NumPres {
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

function literal16(pres: NumPres) {
	return (opHigh.Literal16 << 4) | pres
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

				case opHigh.Literal16: {
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
