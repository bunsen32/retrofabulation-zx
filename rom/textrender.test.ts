// Test the interpreter:
import {describe, expect, test} from '@jest/globals'
import {byte, emulatorWasm, logSnapshots, stackTop, Vm} from './testutils/testvm'
import {writeClip, getScreenMono, cls, Bitmap, readClip, cls1, assertSamePixels, getScreenColour} from "./testutils/screen"
import {CharsetFromUnicode} from '../encoding'

const rootExpectedFiles = "./rom"
const rootActualMismatchFiles = "./testout"

const loadedVm = WebAssembly.instantiate(emulatorWasm)
	.then(results =>
		new Vm(results.instance.exports))

describe("Text rendering", () => {

	test("Can write a screen", async () => {
		const vm = await loadedVm
		cls(vm)

		vm.setRam(0x4000, [0x33, 0x55, 0xff, 0x00, 0x8f])
		vm.core.poke(0x4000, 0xff)
		vm.core.poke(0x4100, 0xfe)
		vm.core.poke(0x4200, 0xfc)
		vm.core.poke(0x4300, 0xf8)
		vm.core.poke(0x4400, 0xf0)
		vm.core.poke(0x4500, 0xe0)
		vm.core.poke(0x4600, 0xc0)
		vm.core.poke(0x4700, 0x80)

		const actual = getScreenMono(vm)
		await assertBitmapImageMatches("shapes", actual)
	})

	test("Render 8-pixel characters", async () => {
		const vm = await loadedVm
		cls1(vm)

		renderAt(vm, 'ReTro…', 0, 0)

		const actual = getScreenMono(vm)
		await assertBitmapImageMatches("singlechar", actual)
	})

	test("Render 4-pixel characters", async () => {
		const vm = await loadedVm
		cls1(vm)

		renderAt(vm, '‘tf;i’', 1, 1)

		const actual = getScreenMono(vm)
		await assertBitmapImageMatches("half-width", actual)
	})

	test("Render 12-pixel characters", async () => {
		const vm = await loadedVm
		cls1(vm)

		renderAt(vm, 'wm\x7f™', 0, 0)

		const actual = getScreenMono(vm)
		await assertBitmapImageMatches("extra-width", actual)
	})

	test("Render at half-cell offset", async () => {
		const vm = await loadedVm
		cls1(vm)
		vm.setRam(0x5820, [7])

		renderAt(vm, 'ReTro…', 1, 1)

		const actual = getScreenMono(vm)
		await assertBitmapImageMatches("half-cell-offset", actual)
	})

	test("Render at half-cell offset onto hidden cell", async () => {
		const vm = await loadedVm
		cls1(vm)
		vm.setRam(0x5820, [0])

		renderAt(vm, 'ReTro…', 1, 1)

		const actual = getScreenMono(vm)
		await assertBitmapImageMatches("half-cell-offset-hidden", actual)
	})

	test("Colours text 0.5 cells wide", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, '.', 4, 4, 0b01110001)

		const actual = getScreenColour(vm)
		await assertBitmapImageMatches("applies-attrs-0_5", actual)
	})

	test("Colours text 1 cell wide", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, 'R', 4, 4, 0b01110001)

		const actual = getScreenColour(vm)
		await assertBitmapImageMatches("applies-attrs-1", actual)
	})

	test("Colours text 1.5 cells wide", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, 'R!', 4, 4, 0b01110001)

		const actual = getScreenColour(vm)
		await assertBitmapImageMatches("applies-attrs-1_5", actual)
	})

	test("Render mix of characters", async () => {
		const vm = await loadedVm
		cls1(vm)

		renderAt(vm, '‘The Long, Dark Tea-Time’', 0, 0)

		const actual = getScreenMono(vm)
		await assertBitmapImageMatches("mix-width", actual)
	})
})

function renderAt(vm: Vm, text: string, x: number, y: number, attr: byte = 0b00111000) {
	const charBytes: byte[] = []
	const textLength = text.length
	for(let i = 0; i < textLength; i++) {
		const c = CharsetFromUnicode[text.charAt(i)]
		charBytes[i] = c
	}
	vm.setRam(0x9000, charBytes)
	vm.setRegisters({ SP: stackTop, DE: 0x9000, BC: (textLength << 8), AF: (attr << 8), HL: ((y << 8) | x)})
	vm.setRam(0x8000, [
		0xCD, 0x00, 0x08, // call $0600
		0x76, // HALT
	])
	vm.runPcAt(0x8000, 20000)
}

async function assertBitmapImageMatches(expectedPngFilename: string, actualOutput: Bitmap): Promise<void> {
	const expectFilePath = `textrender.test/${expectedPngFilename}-expected.png`

	const expected = await readClip(`${rootExpectedFiles}/${expectFilePath}`)
	try {
		if (!expected) throw `Cannot find file: ${expectFilePath}`
		assertSamePixels(expected, actualOutput)

	} catch(problem) {
		const actualFilePath = expectFilePath.replace('-expected.', '-actual.')
		const actualFullPath = `${rootActualMismatchFiles}/${actualFilePath}`
		await writeClip(actualOutput, actualFullPath)
		throw problem
	}
}