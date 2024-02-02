type byte = number

// OP-code: 0b_JUMP_DATA

enum opHigh {
	Nop = 0, // Padding, if required. (nop, endif, line-continuation, else)
	NeedsAnalysis = 1, // If func/proc requires name or type resolution before execution. 
	Literal = 2,
	IntOp = 3,
	FltOp = 4,
	StrOp = 5,

	// All of these are followed by a 1-byte LSB of jump offset
	// Offset is (hex) xYY, where x is low-nyble of OP.
	If = 8, // fwd
	Elif = 9, //fwd
	EndIfBranch = 10, // fwd: "else" (if followed by anything other than an "elif" statement)
	While = 11, // fwd: 'loop' is encoded (and parsed from) "true, while"
	For = 12, // fwd
	Break = 13, // fwd
	Continue = 14, // back
	EndLoop = 15, // back
}

enum Op {
	Nop = 0x00, // Padding, if required. (nop, endif, line-continuation, else)
	NopContinuation = 0x01,
	NopEndIf = 0x02,
	NopElse = 0x03,

	NeedsAnalysis = 0x10, // If func/proc requires name or type resolution before execution. 
	Assignment = 0x11, // And dereferences?
	Definition = 0x12, // And other definitions within a proc/func
	CallReturn = 0x13, // Calls and returns

	Literal = 0x20,
	LiteralIntBin = 0x21, 
	LiteralIntDec = 0x22, 
	LiteralIntHex = 0x23, 
	LiteralFloat = 0x24,
	LiteralString = 0x25,
	LiteralFalseStack = 0x2C,
	LiteralTrueStack = 0x2D,
	LiteralFalse = 0x2E,
	LiteralTrue = 0x2F,

	// Integer:
	IntEq = 0x30,
	IntNe = 0x31,
	IntGt = 0x32,
	IntGe = 0x33,
	IntLt = 0x34,
	IntLe = 0x35,

	IntAdd = 0x36,
	IntSub = 0x37,
	IntMul = 0x38,
	IntDiv = 0x39,
	IntMod = 0x3A,

	// Float:
	FltAdd = 0x41,
	FltSub = 0x42,
	FltMul = 0x43,
	FltDiv = 0x44,
	FltMod = 0x45,

	FltEq = 0x46,
	FltNe = 0x47,
	FltGt = 0x48,
	FltGe = 0x49,
	FltLt = 0x4A,
	FltLe = 0x4B,

	// String:
	StrCat = 0x51,

	StrEq = 0x56,
	StrNe = 0x57,
	StrGt = 0x58,
	StrGe = 0x59,
	StrLt = 0x5A,
	StrLe = 0x5B,

	// All of these are followed by a 1-byte LSB of jump offset
	// Offset is (hex) xYY, where x is low-nyble of OP.
	If =	0x80, // fwd
	Elif =	0x90, //fwd
	EndIfBranch = 0xA0, // fwd: "else" (if followed by anything other than an "elif" statement)
	While = 0xB0, // fwd: 'loop' is encoded (and parsed from) "true, while"
	For = 0xC0, // fwd
	Break = 0xD0, // fwd
	Continue = 0xE0, // back
	EndLoop = 0xF0, // back
}

enum BoolOp {
	Nop = 0x00,
	BoolEq = 0x08,
	BoolNe = 0x10,	// Same as "xor"
	BoolAnd = 0x18, // Short-circuit, conditional execution, like an "if"
	BoolOr = 0x20, // Short-circuit, conditional execution, like an "if"
	BoolNot = 0x28,
	BoolStoreLocal = 0x30,
	BoolStoreModule = 0x38,
	BoolPush = 0x40,

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
	Bin = 1,
	DecimalInt = 2,
	Hex = 3,
	Float = 4,
}

function parse(text: string): byte[] {
	const lines = text.split('\n')
	let out = []
	let p = 0

	return out
}

function literal(pres: NumPres) {
	return (opHigh.Literal << 4) | pres
}

const sample: byte[][] = [
	[
		literal(NumPres.DecimalInt), 0xee, 0x3a,
		literal(NumPres.Hex), 0xee, 0x3a,
		Op.IntAdd,
		literal(NumPres.Bin), 0xee, 0x3a,
		Op.IntEq,

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
	let mode = "normal"
	let p = start
	while (p < tokens.length) {
		const b = tokens[p++]
		if (mode == "normal") {
			const cat = (b >> 4) as opHigh
			if (b & 0x80) {
				switch (cat) {
				case opHigh.If:
					{
					}
					break;

				default:
					throw "Unrecognised symbol category " + cat
				}
			} else if (cat == opHigh.Literal) {
				switch (b as Op){
				case Op.LiteralIntBin:
				case Op.LiteralIntDec:
				case Op.LiteralIntHex:
					const n = tokens[p++] + (tokens[p++] << 8)
					const presentation = (b & 3) as NumPres
					stack.push(renderLiteralInt(n, presentation))
					break;
				}
		
			} else if (cat == opHigh.IntOp) {
				const op = intOperators[b & 0xf]			
				const o2 = stack.pop()
				const o1 = stack.pop()
				stack.push(`${o1} ${op} ${o2}`)
				console.log(stack[stack.length - 1])
				if (b < Op.IntAdd) mode = "bool"
			}
		} else {
			// Mode == "bool"
			const op = (b & 0xF8) as BoolOp
			switch (op) {
				case BoolOp.If: {
					const offset = tokens[p++]
					const exp = stack.pop()
					stack.push(`if ${exp}:`)
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
