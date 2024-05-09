import {describe, expect, test} from '@jest/globals'
import {literal16, Op, BoolOp, NumPres, load16, store16} from "./parsing"

import fs = require('node:fs')

export const FRAME_BUFFER_SIZE = 0x6600;
let core = null
let memory = null
let memoryData: Uint8Array = null
let workerFrameData = null
let registerPairs: Uint16Array = null
let tapePulses = null

const JSPECCY = "../jsspeccy3/dist/jsspeccy"
const ROM = "dist/roms/neo48.rom"
const memoryPageWriteMap = [11, 5, 2, 0]
const stackTop = 0xF000

type RegisterSet = {
	AF: number,
	BC: number,
	DE: number,
	HL: number,
	SP: number,
}
type PartialRegisterSet = Partial<RegisterSet>
type CpuSnapshot = RegisterSet & {
	t: number,
	PC: number,
	stack: number[]
}

async function loadRom(filename: string, page: number) {
	const romBytes = fs.readFileSync(filename)
	const bytes = new Uint8Array(romBytes)
	memoryData.set(bytes, core.MACHINE_MEMORY + page * 0x4000)
}

function setRam(pos: number, bytes: ArrayLike<number>) {
	const page = memoryPageWriteMap[Math.floor(pos / 0x4000)]
	const offset = pos % 0x4000
	const p = core.MACHINE_MEMORY + page * 0x4000 + offset
	memoryData.set(bytes, p)
}

function runPcAt(address: number, forTStates: number = 100){
	core.reset()
	core.setPC(address)
	const result = core.runUntil(forTStates)
	expect(result).toBe(0)
}

function tracePcAt(address: number, forTStates: number): CpuSnapshot[] {
	core.reset()
	core.setPC(address)
	const trace: CpuSnapshot[] = []
	while (1) {
		const cpu = getRegisters() as any
		cpu.PC = core.getPC()
		cpu.t = core.getTStates()
		cpu.stack = getStack()
		trace.push(cpu)
		if (cpu.t >= forTStates) break

		const result = core.runUntil(cpu.t + 4)
		expect(result).toBe(0)
	}
	return trace
}

function getRegisters(): RegisterSet {
	const result = {};
	['AF', 'BC', 'DE', 'HL', 'AF_', 'BC_', 'DE_', 'HL_', 'IX', 'IY', 'SP', 'IR'].forEach(
		(r, i) => {
			result[r] = registerPairs[i]
		}
	)
	return result as RegisterSet
}

function setRegisters(registerValues: PartialRegisterSet) {
	['AF', 'BC', 'DE', 'HL', 'AF_', 'BC_', 'DE_', 'HL_', 'IX', 'IY', 'SP', 'IR'].forEach(
		(r, i) => {
			registerPairs[i] = registerValues[r]
		}
	)
}

/**
 * Return the Z80 stack, as 16-bit words, from top to bottom.
 * (So ".pop()" on the result returns what Z80 POP would return.)
 */
function getStack(): number[] {
	const reg = getRegisters()
	let sp = reg.SP
	if (sp > stackTop) throw "Stack underflow!"
	const result = []
	while (sp < stackTop) {
		const v16 = core.peek(sp++) + (core.peek(sp++) << 8)
		result.push(v16)
	}
	return result
}

function getStackBoolean(): boolean {
	const stack = getStack()
	expect(stack).toHaveLength(1)
	const zeroFlag = stack[0] & 0b01000000
	return !zeroFlag
}

function traceInterpret(bytes: number[], forTStates: number): CpuSnapshot[] {
	const address = 0x8000
	setRam(address, bytes)
	setRegisters({ HL: address, SP: stackTop })
	return tracePcAt(0x0080, forTStates)
}

function interpret(bytes: number[], forTStates: number = 200) {
	const address = 0x8000
	setRam(address, bytes)
	setRegisters({ HL: address, SP: stackTop })
	runPcAt(0x0080, forTStates)
	if (core.getHalted()) return

	const trace = traceInterpret(bytes, forTStates)
	const hex = (n) => ((+n).toString(16)).padStart(4, "0")
	console.log(expect.getState().currentConcurrentTestName)
	const full = []
	for(const cpu of trace){
		full.push(`${hex(cpu.PC)}: AF=${hex(cpu.AF)}, BC=${hex(cpu.BC)}, DE=${hex(cpu.DE)}, HL=${hex(cpu.HL)} [${cpu.stack}]`)
	}
	console.log(full)
	expect(core.getHalted()).toBe(1)
}

const emulatorWasm = fs.readFileSync(`${JSPECCY}/jsspeccy-core.wasm`)
const fullyLoaded = WebAssembly.instantiate(emulatorWasm).then(results => {
	core = results.instance.exports;
	memory = core.memory;
	memoryData = new Uint8Array(memory.buffer);
	workerFrameData = memoryData.subarray(core.FRAME_BUFFER, FRAME_BUFFER_SIZE);
	registerPairs = new Uint16Array(core.memory.buffer, core.REGISTERS, 12);
	tapePulses = new Uint16Array(core.memory.buffer, core.TAPE_PULSES, core.TAPE_PULSES_LENGTH);

	loadRom(ROM, 10)
	core.setTapeTraps(false)
})

function makeArray(value, len) {
	const n = []
	for (let u = 0; u < len; u++) n.push(value)
	return n
}

describe('New ROM!', () => {
	test('runs some Z80', async () => {
		await fullyLoaded

		setRam(0x8000, [
			0x3E, 0x3E, // ld a, $3e
			0x32, 0xff, 0x7f, // ld ($7fff), a
			0x76, // HALT
		])
		runPcAt(0x8000)

		expect(core.getHalted()).toBe(1)
		expect(core.peek(0x7fff)).toBe(0x3e)
	})

	test('interprets the bytestream', async () => {
		await fullyLoaded

		interpret([ Op.HALT ], 80)
	})

	test('int16 literal16', async () => {
		await fullyLoaded

		interpret([ literal16(NumPres.Hex), 0x44, 0x99, Op.HALT], 200)

		expect(getStack()).toEqual([0x9944])
	})

	test('int16 add', async () => {
		await fullyLoaded

		interpret([
			literal16(NumPres.Hex), 0x44, 0x99,
			literal16(NumPres.Hex), 0x22, 0x33,
			Op.IntAdd,
			Op.HALT], 400)

		expect(getStack()).toEqual([0xcc66])
	})

	test('int16 eq (true)', async () => {
		await fullyLoaded

		interpret([
			literal16(NumPres.Hex), 0x44, 0x99,
			literal16(NumPres.Hex), 0x44, 0x99,
			Op.IntEq,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean()).toBeTruthy()
	})

	test('int16 eq (false)', async () => {
		await fullyLoaded

		interpret([
			literal16(NumPres.Hex), 0x44, 0x99,
			literal16(NumPres.Hex), 0x41, 0x99,
			Op.IntEq,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean()).toBeFalsy()
	})

	test('int16 ne (true)', async () => {
		await fullyLoaded

		interpret([
			literal16(NumPres.Hex), 0x12, 0x89,
			literal16(NumPres.Hex), 0xab, 0xcd,
			Op.IntNe,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean()).toBeTruthy()
	})

	test('int16 ne (false)', async () => {
		await fullyLoaded

		interpret([
			literal16(NumPres.Hex), 0x12, 0x78,
			literal16(NumPres.Hex), 0x12, 0x78,
			Op.IntNe,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean()).toBeFalsy()
	})

	test('int16 lt (A < B)', async () => {
		await fullyLoaded

		interpret([
			literal16(NumPres.Hex), 0x10, 0x78,
			literal16(NumPres.Hex), 0x12, 0x78,
			Op.IntLt,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean()).toBeTruthy()
	})

	test('int16 lt (A = B)', async () => {
		await fullyLoaded

		interpret([
			literal16(NumPres.Hex), 0xAB, 0xCD,
			literal16(NumPres.Hex), 0xAB, 0xCD,
			Op.IntLt,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean()).toBeFalsy()
	})

	test('int16 lt (A > B)', async () => {
		await fullyLoaded

		interpret([
			literal16(NumPres.Hex), 0xFF, 0xCD,
			literal16(NumPres.Hex), 0xAB, 0xCD,
			Op.IntLt,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean()).toBeFalsy()
	})

	test('if true', async () => {
		await fullyLoaded

		interpret([
			Op.LiteralTrue,
			BoolOp.If, 0x01,
			literal16(NumPres.Hex), 0x10, 0x32,
			Op.HALT], 500)

		expect(getStack()).toEqual([0x3210])
	})

	test('if false', async () => {
		await fullyLoaded

		interpret([
			Op.LiteralFalse,
			BoolOp.If, 0x02,
			Op.HALT,
			literal16(NumPres.Hex), 0x10, 0x32,
			Op.HALT], 500)

		expect(getStack()).toEqual([0x3210])
	})

	test('if false (big-jump)', async () => {
		await fullyLoaded

		interpret([
			Op.LiteralFalse,
			BoolOp.If | 0x0f, 0x02,
			Op.HALT,
			...makeArray(Op.HALT, 15 * 256),
			literal16(NumPres.Hex), 0x10, 0x32,
			Op.HALT], 400)

		expect(getStack()).toEqual([0x3210])
	})

	test('Loop 10 times', async () => {
		await fullyLoaded
		interpret([
			Op.LiteralInt0,
			store16(0),
			load16(0),
			Op.Literal16IntDec, 0x0a, 0x00,
			Op.IntLt,
			BoolOp.While | 0x00, 0x07, // = 7
			load16(0),
			Op.LiteralInt1,
			Op.IntAdd,
			store16(0),
			Op.EndLoop | 0x0f, 0xf4, // = -12
			Op.HALT
		], 7985)
	})
/*
*/
})