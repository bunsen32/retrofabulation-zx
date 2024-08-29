import {describe, expect, test} from '@jest/globals'
import {literal16, Op, BoolOp, NumPres, load16, store16} from "../parsing"
import {emulatorWasm, Vm} from './testutils/testvm'

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