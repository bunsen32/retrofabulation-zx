import * as process from 'node:process'
import { createInterface } from 'node:readline'

interface Writeable {
	write(chunk: any, callback?: (error: Error | null | undefined) => void): boolean;
}
const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false,
})
const out = process.stdout

const indent = ['', '\t', '\t\t', '\t\t\t', '\t\t\t\t']

out.write("// ASM ENTRY POINTS\n")
out.write("// AUTOGENERATED\n\n")
out.write("export const rom = {\n")

const seenPaths = {}
const pairs: [string, string][] = []
rl.on('line', (line: string) => {
	const pieces = line.split(': EQU ')
	if (pieces.length !== 2) return

	pieces[0] = pieces[0].replace('.', '\x00')
	pairs.push(pieces as [string, string])
	ensureParentPath(pieces[0], seenPaths)
})
rl.on('close', () => {
	pairs.sort((a, b) => symCmp((a[0]+'\x00'), (b[0]+'\x00')))
	let currentPath: Array<string> = []
	for(let pair of pairs) {
		const [pathDotted, fullValue] = pair
		const path = pathDotted.split('\x00')
		
		const value = fullValue.replace('0x0000', '0x')
		const commonDepth = differenceAtLevel(currentPath, path)
		closeLevels(out, currentPath.length, commonDepth)
		openLevels(out, commonDepth, path)
		out.write(`${indent[1+path.length]}addr: ${value},\n`)
		currentPath = path
	}
	closeLevels(out, currentPath.length, 0)
	out.write(`}\n\n`)
})

function symCmp(a: string, b: string) {
	if (a === b) return 0

	return (a < b) ? -1 : +1
}

function ensureParentPath(dottedPath: string, seenPaths) {
	const lastDot = dottedPath.lastIndexOf('.')
	if (lastDot === -1) return

	const parentPath = dottedPath.substring(0, lastDot)
	if (seenPaths[parentPath]) return
	ensureParentPath(parentPath, seenPaths)
	seenPaths[parentPath] = true
}

function differenceAtLevel(currentPath: string[], path: string[]): number {
	let l = 0;
	for(; l < Math.min(currentPath.length, path.length); l++){
		if (currentPath[l] != path[l]) return l
	}
	return l 
}

function closeLevels(out: Writeable, currentDepth: number, closeToDepth: number) {
	for (let d = currentDepth; d > closeToDepth; d--) {
		out.write(`${indent[1+d-1]}},\n`)
	}
}

function openLevels(out: Writeable, commonDepth: number, path: string[]) {
	for (let d = commonDepth; d < path.length; d++){
		out.write(`${indent[1+d]}${path[d]}: {\n`)
	}
}

async function write(out: Writeable, str: string): Promise<void> {
	return new Promise((resolve, reject) => {
		out.write(str, (anyError: Error|null) => {
			if (anyError) reject(anyError); else resolve()
		})
	})
}