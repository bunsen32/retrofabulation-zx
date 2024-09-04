// Test the interpreter:
import {describe, expect, test} from '@jest/globals'
import {byte, emulatorWasm, logSnapshots, stackTop, Vm} from './testutils/testvm'
import {writeClip, getScreenMono, cls, Bitmap, readClip, cls1} from "./testutils/screen"
import {CharsetFromUnicode} from '../encoding'

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
		await assertBitmapImageMatches("testout/shapes.png", actual)
	})

	test("Render 8-pixel characters", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, 'ReTro…', 0, 0)

		const actual = getScreenMono(vm)
		await assertBitmapImageMatches("testout/singlechar.png", actual)
	})

	test("Render 4-pixel characters", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, '‘tf;i’', 0, 0)

		const actual = getScreenMono(vm)
		await assertBitmapImageMatches("testout/half-width.png", actual)
	})

	test("Render 12-pixel characters", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, 'wm\x7f™', 0, 0)

		const actual = getScreenMono(vm)
		await assertBitmapImageMatches("testout/extra-width.png", actual)
	})

	test("Render mix of characters", async () => {
		const vm = await loadedVm
		cls(vm)

		renderAt(vm, '‘The Long, Dark Tea-Time of The Soul’, by Douglas Adams', 0, 0)

		const actual = getScreenMono(vm)
		await assertBitmapImageMatches("testout/mix-width.png", actual)
	})
})

function renderAt(vm: Vm, text: string, x: number, y: number) {
	const charBytes: byte[] = []
	const textLength = text.length
	for(let i = 0; i < textLength; i++) {
		const c = CharsetFromUnicode[text.charAt(i)]
		charBytes[i] = c
	}
	vm.setRam(0x9000, charBytes)
	vm.setRegisters({ SP: stackTop, DE: 0x9000, BC: (textLength << 8), HL: ((x << 8) | y)})
	vm.setRam(0x8000, [
		0xCD, 0x00, 0x06, // call $0600
		0x76, // HALT
	])
	vm.runPcAt(0x8000, 20000)
}

async function assertBitmapImageMatches(expectedOutputImageFilename: string, actualOutput: Bitmap): Promise<void> {
	const expected = await readClip(expectedOutputImageFilename)
	// Compare the two
	await writeClip(actualOutput, `${expectedOutputImageFilename}_actual.png`)
}