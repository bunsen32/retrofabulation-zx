// Test the startup sequence:
import {describe, test} from '@jest/globals'
import {emulatorWasm, Vm} from './testutils/testvm.ts'
import {getScreenMono, Bitmap, cls1, getScreenColour, assertBitmapImageMatches, clearAttrs} from "./testutils/screen.ts"
import {rom} from './generated/symbols.ts'

const loadedVm = WebAssembly.instantiate(emulatorWasm)
	.then(results =>
		new Vm(results.instance.exports))

describe("Splash-screen", () => {

	test("Splash initially sets screen to blue", async () => {
		const vm = await loadedVm
		cls1(vm)

		vm.runPcAt(rom.SPLASH_INIT, 20000)

		const actual = getScreenColour(vm)
		await assertExpectedImage("splash-colour", actual)
	})

	test("Splash prepares zigzag pixels", async () => {
		const vm = await loadedVm
		cls1(vm)

		vm.runPcAt(rom.SPLASH_INIT, 200000)

		const actual = getScreenMono(vm)
		await assertExpectedImage("splash-pixels", actual)
	})

	test("UnitTests prepare zigzag pixels", async () => {
		const vm = await loadedVm

		writeZigzags(vm)

		const actual = getScreenMono(vm)
		await assertExpectedImage("zigzag-pixels", actual)
	})

	test("Splash stripe mid", async () => {
		const vm = await loadedVm
		writeZigzags(vm)
		clearAttrs(vm, 0b00110110) // yellow ink & paper

		vm.setRegisters({A: 0x14, BC:0b00101110_00101101})
		vm.runPcAt(rom.STRIPE, 1500)

		const actual = getScreenColour(vm)
		await assertExpectedImage("stripe-mid", actual)
	})

	test("Splash stripe 0", async () => {
		const vm = await loadedVm
		writeZigzags(vm)
		clearAttrs(vm, 0b00110110) // yellow ink & paper

		vm.setRegisters({A: 0x00, BC:0b00000000_00101110})
		vm.runPcAt(rom.STRIPE, 1500)

		const actual = getScreenColour(vm)
		await assertExpectedImage("stripe-0", actual)
	})

	test("Splash stripe 10", async () => {
		const vm = await loadedVm
		writeZigzags(vm)
		clearAttrs(vm, 0b00110110) // yellow ink & paper

		vm.setRegisters({A: 0x0A, BC:0b00000000_00101110})
		vm.runPcAt(rom.STRIPE, 1500)

		const actual = getScreenColour(vm)
		await assertExpectedImage("stripe-10", actual)
	})

	test("Splash stripe 32", async () => {
		const vm = await loadedVm
		writeZigzags(vm)
		clearAttrs(vm, 0b00110110) // yellow ink & paper

		vm.setRegisters({A: 0x20, BC:0b00000000_00101110})
		vm.runPcAt(rom.STRIPE, 1500)

		const actual = getScreenColour(vm)
		await assertExpectedImage("stripe-32", actual)
	})

	test("Splash stripe 35", async () => {
		const vm = await loadedVm
		writeZigzags(vm)
		clearAttrs(vm, 0b00110110) // yellow ink & paper

		vm.setRegisters({A: 0x23, BC:0b00000000_00101110})
		vm.runPcAt(rom.STRIPE, 1500)

		const actual = getScreenColour(vm)
		await assertExpectedImage("stripe-35", actual)
	})
})

async function assertExpectedImage(expectedPngFilename: string, actualOutput: Bitmap): Promise<void> {
	await assertBitmapImageMatches('startup.test', expectedPngFilename, actualOutput)
}

function writeZigzags(vm: Vm) {
	const core = vm.core
	let p = 0x4000
	for(let y = 0, n = 192; n > 0; y ++, n --) {
		const i = ((y >> 3) & 0b111) | ((y << 3) & 0b1000)
		const pattern = 0b1111_1111 >>> (7 - (i >> 1))
		for(let x = 0; x < 32; x++) {
			core.poke(p, pattern)
			p++
		}
	}
}