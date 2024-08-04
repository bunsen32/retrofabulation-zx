import {describe, expect, test} from '@jest/globals'
import {literal16, Op, BoolOp, NumPres, load16, store16} from "./parsing"

import {readFileSync} from 'node:fs'

export const FRAME_BUFFER_SIZE = 0x6600;

class Vm {
	memory: {buffer: ArrayBuffer}
	memoryData: Uint8Array
	workerFrameData: Uint8Array
	registerPairs: Uint16Array
	tapePulses: Uint16Array

	constructor(public core: any) {
		this.memory = core.memory
		this.memoryData = new Uint8Array(this.memory.buffer);
		this.workerFrameData = this.memoryData.subarray(core.FRAME_BUFFER, FRAME_BUFFER_SIZE);
		this.registerPairs = new Uint16Array(this.memory.buffer, core.REGISTERS, 12);
		this.tapePulses = new Uint16Array(this.memory.buffer, core.TAPE_PULSES, core.TAPE_PULSES_LENGTH);
	
		this.loadRom(ROM, 10)
		this.core.setTapeTraps(false)
	}

	async loadRom(filename: string, page: number) {
		const romBytes = readFileSync(filename)
		const bytes = new Uint8Array(romBytes)
		this.memoryData.set(bytes, this.core.MACHINE_MEMORY + page * 0x4000)
	}

	/**
	 * Return the Z80 stack, as 16-bit words, from top to bottom.
	 * (So ".pop()" on the result returns what Z80 POP would return.)
	 */
	getStack(): number[] {
		const reg = this.getRegisters()
		let sp = reg.SP
		if (sp > stackTop) throw "Stack underflow!"
		const result: number[] = []
		while (sp < stackTop) {
			const v16 = this.core.peek(sp++) + (this.core.peek(sp++) << 8)
			result.push(v16)
		}
		return result
	}

	getStackBoolean(): boolean {
		const stack = this.getStack()
		expect(stack).toHaveLength(1)
		const zeroFlag = stack[0] & 0b01000000
		return !zeroFlag
	}

	getRegisters(): RegisterSet {
		const result = {};
		['AF', 'BC', 'DE', 'HL', 'AF_', 'BC_', 'DE_', 'HL_', 'IX', 'IY', 'SP', 'IR'].forEach(
			(r, i) => {
				result[r] = this.registerPairs[i]
			}
		)
		return result as RegisterSet
	}

	setRegisters(registerValues: PartialRegisterSet) {
		['AF', 'BC', 'DE', 'HL', 'AF_', 'BC_', 'DE_', 'HL_', 'IX', 'IY', 'SP', 'IR'].forEach(
			(r, i) => {
				this.registerPairs[i] = registerValues[r]
			}
		)
	}
		
	setRam(pos: number, bytes: ArrayLike<number>) {
		const page = memoryPageWriteMap[Math.floor(pos / 0x4000)]
		const offset = pos % 0x4000
		const p = this.core.MACHINE_MEMORY + page * 0x4000 + offset
		this.memoryData.set(bytes, p)
	}
	
	runPcAt(address: number, forTStates: number = 100){
		this.core.reset()
		this.core.setPC(address)
		const result = this.core.runUntil(forTStates)
		expect(result).toBe(0)
	}
	
	tracePcAt(address: number, forTStates: number): CpuSnapshot[] {
		this.core.reset()
		this.core.setPC(address)
		const trace: CpuSnapshot[] = []
		while (1) {
			const cpu = this.getRegisters() as any
			cpu.PC = this.core.getPC()
			cpu.t = this.core.getTStates()
			cpu.stack = this.getStack()
			trace.push(cpu)
			if (cpu.t >= forTStates) break
	
			const result = this.core.runUntil(cpu.t + 4)
			expect(result).toBe(0)
		}
		return trace
	}
	
	traceInterpret(bytes: number[], forTStates: number): CpuSnapshot[] {
		const address = 0x8000
		this.setRam(address, bytes)
		this.setRegisters({ HL: address, SP: stackTop })
		return this.tracePcAt(0x0080, forTStates)
	}
	
	interpret(bytes: number[], forTStates: number = 200) {
		const address = 0x8000
		this.setRam(address, bytes)
		this.setRegisters({ HL: address, SP: stackTop })
		this.runPcAt(0x0080, forTStates)
		if (this.core.getHalted()) return
	
		const trace = this.traceInterpret(bytes, forTStates)
		const hex = (n) => ((+n).toString(16)).padStart(4, "0")
		console.log(expect.getState().currentConcurrentTestName)
		const full: string[] = []
		for(const cpu of trace){
			full.push(`${hex(cpu.PC)}: AF=${hex(cpu.AF)}, BC=${hex(cpu.BC)}, DE=${hex(cpu.DE)}, HL=${hex(cpu.HL)} [${cpu.stack}]`)
		}
		console.log(full)
		expect(this.core.getHalted()).toBe(1)
	}	
}


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

const emulatorWasm = readFileSync(`${JSPECCY}/jsspeccy-core.wasm`)
const loadedVm = WebAssembly.instantiate(emulatorWasm)
	.then(results =>
		new Vm(results.instance.exports))

function makeArray<T>(value: T, len: number): T[] {
	const n: T[] = []
	for (let u = 0; u < len; u++) n.push(value)
	return n
}

describe('New ROM!', () => {
	test('runs some Z80', async () => {
		const vm = await loadedVm

		vm.setRam(0x8000, [
			0x3E, 0x3E, // ld a, $3e
			0x32, 0xff, 0x7f, // ld ($7fff), a
			0x76, // HALT
		])
		vm.runPcAt(0x8000)

		expect(vm.core.getHalted()).toBe(1)
		expect(vm.core.peek(0x7fff)).toBe(0x3e)
	})

	test('interprets the bytestream', async () => {
		const vm = await loadedVm

		vm.interpret([ Op.HALT ], 80)
	})

	test('int16 literal16', async () => {
		const vm = await loadedVm

		vm.interpret([ literal16(NumPres.Hex), 0x44, 0x99, Op.HALT], 200)

		expect(vm.getStack()).toEqual([0x9944])
	})

	test('int16 add', async () => {
		const vm = await loadedVm

		vm.interpret([
			literal16(NumPres.Hex), 0x44, 0x99,
			literal16(NumPres.Hex), 0x22, 0x33,
			Op.IntAdd,
			Op.HALT], 400)

		expect(vm.getStack()).toEqual([0xcc66])
	})

	test('int16 eq (true)', async () => {
		const vm = await loadedVm

		vm.interpret([
			literal16(NumPres.Hex), 0x44, 0x99,
			literal16(NumPres.Hex), 0x44, 0x99,
			Op.IntEq,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(vm.getStackBoolean()).toBeTruthy()
	})

	test('int16 eq (false)', async () => {
		const vm = await loadedVm

		vm.interpret([
			literal16(NumPres.Hex), 0x44, 0x99,
			literal16(NumPres.Hex), 0x41, 0x99,
			Op.IntEq,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(vm.getStackBoolean()).toBeFalsy()
	})

	test('int16 ne (true)', async () => {
		const vm = await loadedVm

		vm.interpret([
			literal16(NumPres.Hex), 0x12, 0x89,
			literal16(NumPres.Hex), 0xab, 0xcd,
			Op.IntNe,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(vm.getStackBoolean()).toBeTruthy()
	})

	test('int16 ne (false)', async () => {
		const vm = await loadedVm

		vm.interpret([
			literal16(NumPres.Hex), 0x12, 0x78,
			literal16(NumPres.Hex), 0x12, 0x78,
			Op.IntNe,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(vm.getStackBoolean()).toBeFalsy()
	})

	test('int16 lt (A < B)', async () => {
		const vm = await loadedVm

		vm.interpret([
			literal16(NumPres.Hex), 0x10, 0x78,
			literal16(NumPres.Hex), 0x12, 0x78,
			Op.IntLt,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(vm.getStackBoolean()).toBeTruthy()
	})

	test('int16 lt (A = B)', async () => {
		const vm = await loadedVm

		vm.interpret([
			literal16(NumPres.Hex), 0xAB, 0xCD,
			literal16(NumPres.Hex), 0xAB, 0xCD,
			Op.IntLt,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(vm.getStackBoolean()).toBeFalsy()
	})

	test('int16 lt (A > B)', async () => {
		const vm = await loadedVm

		vm.interpret([
			literal16(NumPres.Hex), 0xFF, 0xCD,
			literal16(NumPres.Hex), 0xAB, 0xCD,
			Op.IntLt,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(vm.getStackBoolean()).toBeFalsy()
	})

	test('if true', async () => {
		const vm = await loadedVm

		vm.interpret([
			Op.LiteralTrue,
			BoolOp.If, 0x01,
			literal16(NumPres.Hex), 0x10, 0x32,
			Op.HALT], 500)

		expect(vm.getStack()).toEqual([0x3210])
	})

	test('if false', async () => {
		const vm = await loadedVm

		vm.interpret([
			Op.LiteralFalse,
			BoolOp.If, 0x02,
			Op.HALT,
			literal16(NumPres.Hex), 0x10, 0x32,
			Op.HALT], 500)

		expect(vm.getStack()).toEqual([0x3210])
	})

	test('if false (big-jump)', async () => {
		const vm = await loadedVm

		vm.interpret([
			Op.LiteralFalse,
			BoolOp.If | 0x0f, 0x02,
			Op.HALT,
			...makeArray(Op.HALT, 15 * 256),
			literal16(NumPres.Hex), 0x10, 0x32,
			Op.HALT], 400)

		expect(vm.getStack()).toEqual([0x3210])
	})

	test('Loop 10 times', async () => {
		const vm = await loadedVm

		vm.interpret([
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