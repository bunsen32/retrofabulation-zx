// Test the startup sequence:
import {describe, test} from '@jest/globals'
import {emulatorWasm, Vm} from './testutils/testvm'
import {getScreenMono, Bitmap, cls1, getScreenColour, assertBitmapImageMatches} from "./testutils/screen"

const loadedVm = WebAssembly.instantiate(emulatorWasm)
	.then(results =>
		new Vm(results.instance.exports))

describe("Startup sequence", () => {

	test("Splash initially sets screen to blue", async () => {
		const vm = await loadedVm
		cls1(vm)

		vm.runPcAt(0x65, 20000)

		const actual = getScreenColour(vm)
		await assertExpectedImage("splash-colour", actual)
	})

	test("Splash prepares zigzag pixels", async () => {
		const vm = await loadedVm
		cls1(vm)

		vm.runPcAt(0x65, 200000)

		const actual = getScreenMono(vm)
		await assertExpectedImage("splash-pixels", actual)
	})
})

async function assertExpectedImage(expectedPngFilename: string, actualOutput: Bitmap): Promise<void> {
	assertBitmapImageMatches('startup.test', expectedPngFilename, actualOutput)
}
