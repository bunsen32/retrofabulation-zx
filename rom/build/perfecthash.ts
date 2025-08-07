import * as process from 'node:process'

interface Writeable {
	write(chunk: string, callback?: (error: Error | null | undefined) => void): boolean
}
const out: Writeable = process.stdout

const TABLE_BITS = 6
const TABLE_SIZE = 1 << TABLE_BITS
const reserved: Record<string, string> = {
//	"_": "TOK_DISCARD",	// We deal with discard explicitly.
	"and": "TOK_AND",
	"as": "TOK_AS",
	"break": "TOK_BREAK",
	"continue": "TOK_CONTINUE",
	"def": "TOK_DEF",
	"elif": "TOK_ELIF",
	"else": "TOK_ELSE",
	"for": "TOK_FOR",
	"if": "TOK_IF",
	"import": "TOK_IMPORT",
	"in": "TOK_IN",
	"let": "TOK_LET",
	"loop": "TOK_LOOP",
	"not": "TOK_NOT",
	"or": "TOK_OR",
	"pass": "TOK_PASS",
	"pi": "TOK_X_PI",
	"return": "TOK_RETURN",
	"while": "TOK_WHILE",
}

const words = Object.keys(reserved)
const hashes: number[] = []

const rev: string[][] = []
for(let i = 0; i < TABLE_SIZE; i++) rev[i] = []

out.write("\n")
const [min, start, xor] = findSolution()
if (min > 0){
	out.write("NO SOLUTION :(\n")
	out.write(`Best solution has ${min} collisions: ${start}, ${xor}\n`)
	for(let i = 0; i < TABLE_SIZE; i++) {
		const all = rev[i]
		out.write(`[${i}] = ${all}\n`)
	}
}else{
	const first = -min
	out.write(`RESERVEDW_HASH:\t; Hash-table for reserved words (perfect hash)\n`)
	out.write(`\tSAME_PAGE .end\n`)
	out.write(`.size:\tEQU ${TABLE_SIZE}\n`)
	out.write(`.bits:\tEQU ${TABLE_BITS}\n`)
	out.write(`.first:\tEQU ${first}\n`)
	out.write(`.seed:\tEQU ${start}\n`)
	out.write(`.xor:\tEQU ${xor}\n`)
	out.write(`\t; Skipping ${first} entries\n`)

	for(let i = first; i < TABLE_SIZE; i++) {
		const word = rev[i].pop() ?? ''
		const token = word ? reserved[word] : 0
		out.write(`\tdb ${token}\t; '${word}'\n`)
	}
	out.write(`.end:\n\n`)
}

function findSolution(): [min: number, start: number, xor: number] {
	let min = 99
	let minParams: [number, number] = [0, 0]
	for(let st = 0; st < 256; st ++) {
		for(let xor = 0; xor < 256; xor ++) {
			const score = attempt(st, xor)
			if (score < min) {
				min = score
				minParams = [st, xor]
			}
		}
	}
	attempt(...minParams)
	return [min, ...minParams]
}

function attempt(st: number, xor: number): number {
	for(let i = 0; i < TABLE_SIZE; i++) {
		rev[i].length = 0
	}

	let collisions = 0
	for(let i = 0; i < words.length; i ++){
		const word = words[i]
		const h = hash(word, st, xor)
		hashes[i] = h
		if (rev[h].length) collisions ++
		rev[h].push(word)
	}
	return collisions === 0 ? -firstNonEmpty(rev) : collisions
}

function hash(word: string, start: number, xor: number): number {
	let a = start
	for(let i = 0; i < word.length; i ++) {
		const c = word.charCodeAt(i)
		a = add(a, c)
		a = rr(a) ^ xor
	}
	a = add(a, word.length)
	a = rr(a) ^ xor
	return a % TABLE_SIZE
}

function rr(n: number): number {
	return ((n >> 1) | (n << 7)) & 0xff
}

function add(n: number, m: number) {
	return (n + m) & 0xff
}

function firstNonEmpty(array: unknown[][]): number {
	for(let i = 0; i < array.length; i++) {
		if (array[i].length) return i
	}
	throw "No non-empty element."
}