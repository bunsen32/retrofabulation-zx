// Test the startup sequence:
import { describe, it } from "jsr:@std/testing/bdd";
import {emulatorWasm, Vm} from './testutils/testvm.ts'
import {getScreenMono, Bitmap, cls1, getScreenColour, assertBitmapImageMatches} from "./testutils/screen.ts"

const loadedVm = WebAssembly.instantiate(emulatorWasm)
	.then(results =>
		new Vm(results.instance.exports))

describe("Startup sequence", () => {
	it("null test…", () => {})
})

async function assertExpectedImage(expectedPngFilename: string, actualOutput: Bitmap): Promise<void> {
	await assertBitmapImageMatches('startup.test', expectedPngFilename, actualOutput)
}
