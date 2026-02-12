import type { byte } from "../../zxsys/Byte.ts";

export type KeyRowIndex = 0|1|2|3|4|5|6|7
export type ExecutionRunState = 0 | 1 | 2

export interface VmCore {
  	readonly ROM_PAGE_0: byte
	readonly ROM_PAGE_1: byte
	readonly ROM_PAGE_DOS: byte
	readonly memory: { buffer: ArrayBuffer }
	readonly FRAME_BUFFER: number
	readonly REGISTERS: number
	readonly TAPE_PULSES: number
	readonly TAPE_PULSES_LENGTH: number
	readonly MACHINE_MEMORY: number

	addAddressTrap(page: byte, address: number): boolean
	clearAllTraps(): void
	peek(address: number): byte
	poke(address: number, v: byte): void
	keyUp(row: KeyRowIndex, mask: byte): void
	keyDown(row: KeyRowIndex, mask: byte): void
	reset(): void
	setPC(address: number): void
	getPC(): number
	getHalted(): 0 | 1
	getTStates(): number
	runUntil(tStates: number): ExecutionRunState
}