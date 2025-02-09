// Test the startup sequence:
import {describe, test} from '@jest/globals'
import {emulatorWasm, Vm} from './testutils/testvm.ts'
import {getScreenMono, Bitmap, cls1, getScreenColour, assertBitmapImageMatches} from "./testutils/screen.ts"

const loadedVm = WebAssembly.instantiate(emulatorWasm)
	.then(results =>
		new Vm(results.instance.exports))

describe("Startup sequence", () => {
	test("null test…", () => {})
})

async function assertExpectedImage(expectedPngFilename: string, actualOutput: Bitmap): Promise<void> {
	await assertBitmapImageMatches('startup.test', expectedPngFilename, actualOutput)
}
