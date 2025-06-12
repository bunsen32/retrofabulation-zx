import type {Vm} from './testvm.ts'
import { coloursFromAttr, type RGB } from '@zx/sys'
import * as PImage from 'pureimage'
import { createWriteStream, createReadStream, existsSync } from 'node:fs'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { expect } from "jsr:@std/expect";
import type { byte } from '@zx/sys'
import { createInterface, Readline } from "node:readline/promises";

const rootExpectedFiles = "./"
const rootActualMismatchFiles = "./testout"

export function readStream(filename: string): [fs.ReadStream, Promise<void>] {
	const stream = createReadStream(filename)
	const closure =  new Promise<void>((accept, reject) => {
		stream
			.on("close", accept)
			.on("error", reject)
	})
	return [stream, closure]
}

export function writeStream(filename: string): [fs.WriteStream, Promise<void>] {
	const stream = createWriteStream(filename)
	const closure =  new Promise<void>((accept, reject) => {
		stream
			.on("close", accept)
			.on("error", reject)
	})
	return [stream, closure]
}

export function readLinesFromFile(filename: string): Promise<string[]> {
	return new Promise<string[]>((resolve, reject) => {
		const stream = createReadStream(filename)
		const lines = createInterface({ input: stream, terminal: false })
		const result: string[]  = []
		lines.on('line', line => {
			result.push(line)
		});
		lines.on('close', () => {
			resolve(result)
		})
		lines.on('error', err => reject(err))
	})
}
