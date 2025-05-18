import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import {literal16, Op, BoolOp, NumPres, load16, store16} from "../zxsys/parsing.ts"
import {type CpuSnapshot, loadVm, logSnapshots, stackTop, type Vm} from './testutils/testvm.ts'
import type {byte} from '@zx/sys'
import { rom } from "./generated/symbols.ts";

const loadedVm = loadVm()

function makeArray<T>(value: T, len: number): T[] {
	const n: T[] = []
	for (let u = 0; u < len; u++) n.push(value)
	return n
}

describe('New ROM!', () => {
	it('runs some Z80', async () => {
		const vm = await loadedVm

		vm.setRam(0x8000, [
			0x3E, 0x3E, // ld a, $3e
			0x32, 0xff, 0x7f, // ld ($7fff), a
			0x76, // HALT
		])
		vm.runPcAt({addr:0x8000})

		expect(vm.core.getHalted()).toBe(1)
		expect(vm.core.peek(0x7fff)).toBe(0x3e)
	})

	it('interprets the bytestream', async () => {
		const vm = await loadedVm

		interpret(vm, [ Op.HALT ], 80)
	})

	it('int16 literal16', async () => {
		const vm = await loadedVm

		interpret(vm, [ literal16(NumPres.Hex), 0x44, 0x99, Op.HALT], 200)

		expect(vm.getStack()).toEqual([0x9944])
	})

	it('int16 add', async () => {
		const vm = await loadedVm

		interpret(vm, [
			literal16(NumPres.Hex), 0x44, 0x99,
			literal16(NumPres.Hex), 0x22, 0x33,
			Op.IntAdd,
			Op.HALT], 400)

		expect(vm.getStack()).toEqual([0xcc66])
	})

	it('int16 eq (true)', async () => {
		const vm = await loadedVm

		interpret(vm, [
			literal16(NumPres.Hex), 0x44, 0x99,
			literal16(NumPres.Hex), 0x44, 0x99,
			Op.IntEq,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean(vm)).toBeTruthy()
	})

	it('int16 eq (false)', async () => {
		const vm = await loadedVm

		interpret(vm, [
			literal16(NumPres.Hex), 0x44, 0x99,
			literal16(NumPres.Hex), 0x41, 0x99,
			Op.IntEq,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean(vm)).toBeFalsy()
	})

	it('int16 ne (true)', async () => {
		const vm = await loadedVm

		interpret(vm, [
			literal16(NumPres.Hex), 0x12, 0x89,
			literal16(NumPres.Hex), 0xab, 0xcd,
			Op.IntNe,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean(vm)).toBeTruthy()
	})

	it('int16 ne (false)', async () => {
		const vm = await loadedVm

		interpret(vm, [
			literal16(NumPres.Hex), 0x12, 0x78,
			literal16(NumPres.Hex), 0x12, 0x78,
			Op.IntNe,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean(vm)).toBeFalsy()
	})

	it('int16 lt (A < B)', async () => {
		const vm = await loadedVm

		interpret(vm, [
			literal16(NumPres.Hex), 0x10, 0x78,
			literal16(NumPres.Hex), 0x12, 0x78,
			Op.IntLt,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean(vm)).toBeTruthy()
	})

	it('int16 lt (A = B)', async () => {
		const vm = await loadedVm

		interpret(vm, [
			literal16(NumPres.Hex), 0xAB, 0xCD,
			literal16(NumPres.Hex), 0xAB, 0xCD,
			Op.IntLt,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean(vm)).toBeFalsy()
	})

	it('int16 lt (A > B)', async () => {
		const vm = await loadedVm

		interpret(vm, [
			literal16(NumPres.Hex), 0xFF, 0xCD,
			literal16(NumPres.Hex), 0xAB, 0xCD,
			Op.IntLt,
			BoolOp.BoolPush,
			Op.HALT], 500)

		expect(getStackBoolean(vm)).toBeFalsy()
	})

	it('if true', async () => {
		const vm = await loadedVm

		interpret(vm, [
			Op.LiteralTrue,
			BoolOp.If, 0x01,
			literal16(NumPres.Hex), 0x10, 0x32,
			Op.HALT], 500)

		expect(vm.getStack()).toEqual([0x3210])
	})

	it('if false', async () => {
		const vm = await loadedVm

		interpret(vm, [
			Op.LiteralFalse,
			BoolOp.If, 0x02,
			Op.HALT,
			literal16(NumPres.Hex), 0x10, 0x32,
			Op.HALT], 500)

		expect(vm.getStack()).toEqual([0x3210])
	})

	it('if false (big-jump)', async () => {
		const vm = await loadedVm

		interpret(vm, [
			Op.LiteralFalse,
			(BoolOp.If | 0x0f)as byte, 0x02,
			Op.HALT,
			...makeArray(Op.HALT, 15 * 256),
			literal16(NumPres.Hex), 0x10, 0x32,
			Op.HALT], 400)

		expect(vm.getStack()).toEqual([0x3210])
	})

	it('Loop 10 times', async () => {
		const vm = await loadedVm

		interpret(vm, [
			Op.LiteralInt0,
			store16(0),
			load16(0),
			Op.Literal16IntDec, 0x0a, 0x00,
			Op.IntLt,
			(BoolOp.While | 0x00) as byte, 0x07, // = 7
			load16(0),
			Op.LiteralInt1,
			Op.IntAdd,
			store16(0),
			(Op.EndLoop | 0x0f) as byte, 0xf4, // = -12
			Op.HALT
		], 7985)
	})
/*
*/
})

function traceInterpret(vm: Vm, bytes: byte[], forTStates: number): CpuSnapshot[] {
	const address = 0x8000
	vm.setRam(address, bytes)
	vm.setRegisters({ HL: address, SP: stackTop })
	return vm.tracePcAt(rom.interpreter, forTStates)
}

function interpret(vm: Vm, bytes: byte[], forTStates: number = 200) {
	const address = 0x8000
	vm.setRam(address, bytes)
	vm.setRegisters({ HL: address, SP: stackTop })
	vm.runPcAt(rom.interpreter, forTStates)
	if (vm.core.getHalted()) return

	const trace = traceInterpret(vm, bytes, forTStates)
	logSnapshots(trace)
	expect(vm.core.getHalted()).toBe(1)
}

function getStackBoolean(vm: Vm): boolean {
	const stack = vm.getStack()
	expect(stack).toHaveLength(1)
	const zeroFlag = stack[0] & 0b01000000
	return !zeroFlag
}

