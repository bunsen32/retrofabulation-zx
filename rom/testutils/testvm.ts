import { expect } from "jsr:@std/expect";
import {readFileSync} from 'node:fs'

export const FRAME_BUFFER_SIZE = 0x6600;

import {Charset, CharsetFromUnicode, type byte} from '@zx/sys'
export type word = number

export type Z80Address = { addr: number }

const REGISTER_PAIRS: RegisterName[][] = [
	['AF', 'A', 'F'],
	['BC', 'B', 'C'],
	['DE', 'D', 'E'],
	['HL', 'H', 'L'],
	['AF_', 'A_', 'F_'],
	['BC_', 'B_', 'C_'],
	['DE_', 'D_', 'E_'],
	['HL_', 'H_', 'L_'],
	['IX', 'IXh', 'IXl'],
	['IY', 'IYh', 'IYl'],
	['SP'],
	['IR', 'I', 'R']
]

export function loadVm(): Promise<Vm> {
	return WebAssembly.instantiate(emulatorWasm)
		.then(results =>
			new Vm((results as any).instance.exports))
}

export class Vm {
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

	loadRom(filename: string, page: number) {
		const romBytes = readFileSync(filename)
		const bytes = new Uint8Array(romBytes as unknown as ArrayBuffer)
		this.memoryData.set(bytes, this.core.MACHINE_MEMORY + page * 0x4000)
	}

	/**
	 * Return the Z80 stack, as 16-bit words, from top to bottom.
	 * (So ".pop()" on the result returns what Z80 POP would return.)
	 */
	getStack(): word[] {
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

	getRegisters(): RegisterSet {
		const result: any = {};
		REGISTER_PAIRS.forEach(
			(registers, i) => {
				const [rPair, rHigh, rLow] = registers
				const word = this.registerPairs[i]
				result[rPair] = word
				if (rHigh) {
					result[rHigh] = (word >> 8)
					result[rLow] = (word & 0xff)
				}
			}
		)
		return result as RegisterSet
	}

	setRegisters(registerValues: PartialRegisterSet) {
		const reg: any = registerValues
		REGISTER_PAIRS.forEach(
			([rPair, rHigh, rLow], i) => {
				const word = reg[rPair]
				const highByte = reg[rHigh]
				const lowByte = reg[rLow]
				if (word != undefined) {
					this.registerPairs[i] = word
				} else {
					if (highByte != undefined) this.registerPairs[i] = (this.registerPairs[i] & 0x00ff) | (highByte << 8)
					if (lowByte != undefined) this.registerPairs[i] = (this.registerPairs[i] & 0xff00) | (lowByte & 0xff)
				}
			}
		)
	}

	keyDown(row: number, mask: byte) {
		this.keysDown([{row, mask}])
	}
		
	keysDown(keys: {row: number, mask: byte}[]) {
		for(let row = 0; row < 8; row ++) {
			this.core.keyUp(row, 0x1f)
		}
		for(let k of keys) {
			this.core.keyDown(k.row, k.mask)
		}
	}
		
	setRam(pos: number, bytesOrString: ArrayLike<byte> | string) {
		const bytes = asBytes(bytesOrString)
		const page = memoryPageWriteMap[Math.floor(pos / 0x4000)]
		const offset = pos % 0x4000
		const p = this.core.MACHINE_MEMORY + page * 0x4000 + offset
		this.memoryData.set(bytes, p)
	}

	getRam(pos: number, span: number): ArrayLike<byte> {
		const page = memoryPageWriteMap[Math.floor(pos / 0x4000)]
		const offset = pos % 0x4000
		const p = this.core.MACHINE_MEMORY + page * 0x4000 + offset
		return this.memoryData.subarray(p, p + span) as ArrayLike<byte>
	}

	peekByte(pos: Z80Address): byte {
		return this.core.peek(pos.addr) as byte
	}
	
	peekWord(pos: Z80Address): number {
		return this.core.peek(pos.addr) +
			(this.core.peek(pos.addr + 1) << 8)
	}

	pokeByte(pos: Z80Address, v: byte) {
		this.core.poke(pos.addr, v)
	}
	
	pokeWord(pos: Z80Address, v: number) {
		this.core.poke(pos.addr + 0, v & 0xff)
		this.core.poke(pos.addr + 1, v >> 8)
	}
	
	runPcAt(address: Z80Address, forTStates: number = 100){
		this.core.reset()
		this.core.setPC(address.addr)
		const result = this.core.runUntil(forTStates)
		expect(result).toBe(0)
	}
	
	tracePcAt(address: Z80Address, forTStates: number): CpuSnapshot[] {
		this.core.reset()
		this.core.setPC(address.addr)
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
	
	callSubroutine(address: Z80Address, forTStates: number) {
		const sub = address.addr
		this.setRam(0x8000, [
			0xCD, (sub & 0xff) as byte, (sub >> 8) as byte, // call sub
			0x76, // HALT
		])
		const tStatesPlusOverhead = forTStates + 17 + 4 // Add overhead for CALL + HALT
		this.setRegisters({SP: stackTop})
		this.runPcAt({addr:0x8000}, tStatesPlusOverhead)

		expect(this.core.getHalted(), `Should have HALTED (PC=${this.core.getPC()})`).toBe(1)
	}
}

const JSPECCY = "../../jsspeccy3/dist/jsspeccy"
const ROM = "./dist/neo48.rom"
const memoryPageWriteMap = [11, 5, 2, 0]
export const stackTop = 0xF000

export type RegisterSet = {
	AF: number,
	BC: number,
	DE: number,
	HL: number,
	AF_: number,
	BC_: number,
	DE_: number,
	HL_: number,
	IX: number,
	IY: number,
	SP: number,
	IR: number,
	A: byte,
	F: byte,
	B: byte,
	C: byte,
	D: byte,
	E: byte,
	H: byte,
	L: byte,
	A_: byte,
	F_: byte,
	B_: byte,
	C_: byte,
	D_: byte,
	E_: byte,
	H_: byte,
	L_: byte,
	IXh: byte,
	IXl: byte,
	IYh: byte,
	IYl: byte,
	I: byte,
	R: byte,
}
type RegisterName = keyof RegisterSet
export type PartialRegisterSet = Partial<RegisterSet>
export type CpuSnapshot = RegisterSet & {
	t: number,
	PC: number,
	stack: number[]
}
export const emulatorWasm = readFileSync(`${JSPECCY}/jsspeccy-core.wasm`)

export function logSnapshots(trace: CpuSnapshot[]) {
	const hex = (n: word) => ((+n).toString(16)).padStart(4, "0")
	console.log("Some test name")
	const full: string[] = []
	for(const cpu of trace){
		full.push(`${hex(cpu.PC)}: AF=${hex(cpu.AF)}, BC=${hex(cpu.BC)}, DE=${hex(cpu.DE)}, HL=${hex(cpu.HL)} [${cpu.stack}]`)
	}
	console.log(full)
}

export function asBytes(bytesOrString: ArrayLike<byte>|string): ArrayLike<byte> {
	if (typeof bytesOrString !== 'string') return bytesOrString

	const charBytes: byte[] = []
	const textLength = bytesOrString.length as byte
	for(let i = 0; i < textLength; i++) {
		const c = CharsetFromUnicode[bytesOrString.charAt(i)]
		charBytes[i] = c
	}
	return charBytes
}

export function asString(bytesOrString: ArrayLike<byte>|string): string {
	if (typeof bytesOrString === 'string') return bytesOrString

	let str = ''
	const textLength = bytesOrString.length as byte
	for(let i = 0; i < textLength; i++) {
		const c = Charset[bytesOrString[i]]
		str += c
	}
	return str
}

