// Test the startup sequence:
import {describe, test} from '@jest/globals'
import {emulatorWasm, Vm} from './testutils/testvm'
import {getScreenMono, Bitmap, cls1, getScreenColour, assertBitmapImageMatches} from "./testutils/screen"
import {rom} from './generated/symbols'

const loadedVm = WebAssembly.instantiate(emulatorWasm)
	.then(results =>
		new Vm(results.instance.exports))

describe("Splash-screen", () => {

	test("Splash initially sets screen to blue", async () => {
		const vm = await loadedVm
		cls1(vm)

		vm.runPcAt(rom.SPLASH, 20000)

		const actual = getScreenColour(vm)
		await assertExpectedImage("splash-colour", actual)
	})

	test("Splash prepares zigzag pixels", async () => {
		const vm = await loadedVm
		cls1(vm)

		vm.runPcAt(rom.SPLASH, 200000)

		const actual = getScreenMono(vm)
		await assertExpectedImage("splash-pixels", actual)
	})

	test("UnitTests prepare zigzag pixels", async () => {
		const vm = await loadedVm

		writeZigzags(vm)

		const actual = getScreenMono(vm)
		await assertExpectedImage("zigzag-pixels", actual)
	})
})

async function assertExpectedImage(expectedPngFilename: string, actualOutput: Bitmap): Promise<void> {
	assertBitmapImageMatches('splashscreen.test', expectedPngFilename, actualOutput)
}

function writeZigzags(vm: Vm) {
	const core = vm.core
	let p = 0x4000
	for(let y = 0, n = 192; n > 0; y ++, n --) {
		const i = ((y >> 3) & 0b111) | ((y << 3) & 0b1000)
		const pattern = 0b1111_1111 >>> (15 - (i >> 1))
		for(let x = 0; x < 32; x++) {
			core.poke(p, pattern)
			p++
		}
	}
}