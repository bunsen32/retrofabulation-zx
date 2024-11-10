// Test the startup sequence:
import {describe, test} from '@jest/globals'
import {emulatorWasm, Vm} from './testutils/testvm'
import {getScreenMono, Bitmap, cls1, getScreenColour, assertBitmapImageMatches} from "./testutils/screen"
import {rom} from './generated/symbols'

const loadedVm = WebAssembly.instantiate(emulatorWasm)
	.then(results =>
		new Vm(results.instance.exports))

describe("Startup sequence", () => {
	test("null test…", () => {})
})

async function assertExpectedImage(expectedPngFilename: string, actualOutput: Bitmap): Promise<void> {
	await assertBitmapImageMatches('startup.test', expectedPngFilename, actualOutput)
}
