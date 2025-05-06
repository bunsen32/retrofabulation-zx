
import { type Attr, SpecScreen } from './SpecScreen.ts'
import { glyphs } from '@zx/fonts'
import { type Line, tokeniseLine, type LineComment } from '@zx/interpreter'
import { CharsetFromUnicode, NARROW_DOLLAR, NARROW_HASH, NARROW_PERCENT, NARROW_QUEST } from '@zx/sys'
import type { byte } from "../zxsys/Byte.ts";

const store = globalThis.localStorage

const scale = 16
const editor = document.getElementById("editor") as HTMLCanvasElement
const rect = editor.getBoundingClientRect() // abs. size of element
const scaleX = editor.width / rect.width    // relationship bitmap vs. element for x
const scaleY = editor.height / rect.height  // relationship bitmap vs. element for y
const cx = editor.getContext("2d")!
cx.imageSmoothingEnabled = false

const screenElement = document.getElementById("screen") as HTMLCanvasElement
const screenCx = screenElement.getContext("2d")!
const screen = new SpecScreen(screenCx)
screenCx.imageSmoothingEnabled = false

const textEditor = document.getElementById("text-editor") as HTMLTextAreaElement

type GlyphWidth = 'h'|'n'|'w'
interface Glyph {
	width: GlyphWidth
	bytes: byte[]
}

function drawGrid(widthPixels: number){
	const xMax = scale * widthPixels, yMax = scale * 8
	cx.fillStyle = "#fff"
	cx.fillRect(0, 0, xMax, yMax)
	cx.fillStyle = "#ddd"
	cx.fillRect(xMax, 0, 12 * scale, yMax)

	function afterXPix(x: number) {
		const xp = (x * scale) + scale - 1
		cx.fillRect(xp, 0, 1, yMax)
	}
	function afterYPix(y: number) {
		const yp = (y * scale) + scale - 1
		cx.fillRect(0, yp, xMax, 1)
	}

	for (let x = 0; x < widthPixels; x++){
		cx.fillStyle = (x % 4) == 3 ? "#777" : "#ddd"
		afterXPix(x)
	}

	cx.fillStyle = "#ddd"
	for (let y = 0; y < 8; y++){
		afterYPix(y)
	}
	cx.fillStyle = "#444"
	afterYPix(6)
}

function editorPixel(x: number, y: number, v: boolean){
	cx.fillStyle = v ? "#000" : "#fff"
	cx.fillRect(x*scale, y*scale, scale-1, scale-1)
}

function screenPixel(x: number, y: number, v: boolean){
	screen.pixel(x, y, v)
}

function byteAndBitFromXAndY(x: number, y: number)
{
	if (x > 12 || y > 8) throw "out of range";
	const byte = (y * 2) + Math.floor(x / 8)
	const bit = (7 - (x % 8))
	return [byte, bit]
}

function renderToEditor(data: Glyph){
	const w = widthPixels(data.width)
	for (let y = 0; y < 8; y++){
		for(let x = 0; x < w; x++){
			const [byte, bitPos] = byteAndBitFromXAndY(x, y)
			const bits = data.bytes[byte]
			const bit = (bits & (1 << bitPos)) != 0
			editorPixel(x, y, bit)
		}
	}
}

function renderToScreen(data: Glyph, left: number, top: number){
	for (let y = 0; y < 8; y++){
		for(let x = 0; x < 12; x++){
			const [byte, bitPos] = byteAndBitFromXAndY(x, y)
			const bits = data.bytes[byte]
			const bit = (bits & (1 << bitPos)) != 0
			screenPixel(left+x, top+y, bit)
		}
	}
}

function emptyChar(): Glyph{
	return {
		width: "n",
		bytes: [0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0]
	}
}

let selected: number|undefined
let data = emptyChar()
let isDirty = false

function encode(data: Glyph){
	const w = data.width
	const s = data.bytes.map(b => b.toString(16)).join(",")
	console.log("encoding...", w, s)
	return `${w}${s}`
}

function decode(str: string): Glyph {
	let width: 'h'|'n'|'w', byteString
	switch(str[0]) {
		case 'h': case 'n': case 'w':
			width = str[0]
			byteString = str.substring(1)
			break;
		default:
			width = 'n'
			byteString = str
			break
	}

	const result = {
		width: width,
		bytes: byteString.split(",").map(b => parseInt(b, 16) as byte)
	}
	//console.log("decoded: ", result)
	return result
}

function saveChar(i: number, data: Glyph){
	if (i == undefined) throw "i is undefined"+i
	const encoded = encode(data)
	console.log("saving "+i, encoded)
	store.setItem(`char${i}`, encoded)
}

function saveCurrentChar() {
	if (!isDirty) return
	if (selected == undefined) throw new Error('No character selected')
	saveChar(selected, data)
	isDirty = false
}

function loadCurrentChar(i: number) {
	console.log("loading char " + i)
	data = loadChar(i) ?? emptyChar()
	drawGrid(widthPixels(data.width));
	(document.getElementById(`char-size-${data.width}`) as HTMLInputElement).checked = true
	selected = i
	isDirty = false
}

function loadChar(i: number): Glyph|null {
	if (i == undefined) return null
	const data = store.getItem(`char${i}`)
	if (data) return decode(data)
	const obj = glyphs[i] as Glyph
	return obj || null
}

export function selectChar(i: number){
	console.log("selected", i)
	if (selected != undefined) {
		saveCurrentChar()
		const oldC = document.getElementById(`char-${selected}`)
		oldC?.classList.remove("selected")
	}
	loadCurrentChar(i)
	const newC = document.getElementById(`char-${i}`)
	newC?.classList.add("selected")
	console.log("data: "+ data)
	renderToEditor(data)
}

export function toggleWidth(newW: GlyphWidth){
	if (data.width == newW) return
	data.width = newW
	drawGrid(widthPixels(newW))
	isDirty = true
	renderToEditor(data)
}

function togglePixel(event: MouseEvent){
	const x = Math.floor(event.offsetX * scaleX / scale)
	const y = Math.floor(event.offsetY * scaleY / scale)

	const [byte, bitPos] = byteAndBitFromXAndY(x, y)
	const mask = (1 << bitPos)
	data.bytes[byte] ^= mask
	isDirty = true
	renderToEditor(data)
}
editor.addEventListener("click", togglePixel)

export function rotateDown() {
	const bytes = data.bytes
	bytes.unshift(bytes.pop()!)
	bytes.unshift(bytes.pop()!)
	isDirty = true
	renderToEditor(data)
}

export function rotateUp() {
	const bytes = data.bytes
	bytes.push(bytes.shift()!)
	bytes.push(bytes.shift()!)
	isDirty = true
	renderToEditor(data)
}

export function saveFont() {
	saveCurrentChar()
	let s = ""
	for (let c = 0x00; c <= 0xbf; c++) {
		const char = loadChar(c)
		if (!char) continue
		if (s) s+= ",\n"
		const asString = escapeCharacterToJavaScriptString(c as byte)
		s += `\t${c}: {"width": "${char.width}", "bytes": [${char.bytes}], "char": "${asString}"}`.replace(/NaN/g,"0")
	}
	textEditor.value = `{\n${s}\n}`
}

function escapeCharacterToJavaScriptString(c: byte) {
	const character = String.fromCodePoint(c)
	if (character == '"' || character == '\\') return `\\${character}`
	if (c >= 32 && c < 128) return character
	const hex = c.toString(16)
	return hex.length === 1
		? `\\x0${hex}`
		: `\\x${hex}`
}

function cls(paper?: Attr){
	screen.cls(paper ?? {paper: 'white', ink: 'black', isBright: false})
}

export function doTestRender(){
	saveCurrentChar()
	cls()
	const lines = [
		"def DOUBLE(a)",
		"  return a + a",
		'',
		'print "Hello mighty World!"',
		'print "Hello minty softly? #88"',
		'let A=[1; 7; 8; 11, 2, 3456]',
		'print "Hello { name }"',
		'let x_thing = 23',
		'let y-thing = 23',
		'THE QUICK BROWN FOX JUMPS OVER',
		'THE LAZY DOG. ‘The quick brown fox',
		'jumps over the lazy dog’',
		'01234567890',
		'{i} {j} {f}',
		`1234, ${NARROW_PERCENT}1010101, ${NARROW_DOLLAR}5ef8`,
		'one/two/three/four... C:\\dir.name',
		`let v${NARROW_HASH} = 3.44`,
		`let s${NARROW_DOLLAR} = "salutation"`,
		`let s${NARROW_PERCENT} = MAX_INT`,
		`let p${NARROW_QUEST} = @something`,
		'',
		'© 1982 ZX Spectrum Research Ltd'
	]
	let row = 1
	for(let line of lines) {
		printLine(1, row, line)
		row ++
	}
}
function widthPixels(width: GlyphWidth): number {
	switch(width){
		case 'h': return 4
		case 'n': return 8
		case 'w': return 12
		default: throw "illegal width " + width
	}
}

function renderText(left: number, top: number, str: string, attr?: Attr): number {
	const y = top
	let x = left
	for (let i = 0; i < str.length; i++){
		const u = str[i]
		const c = CharsetFromUnicode[u]
		const char = loadChar(c) ?? emptyChar()
		if (attr) {
			screen.setAttr(x>>3, y>>3, attr)
			screen.setAttr((x>>3) + 1,y>>3, attr)
		}
		renderToScreen(char, x, y)
		x += widthPixels(char.width)
	}
	return x
}

function printLine(col: number, row: number, line: string) {
	renderText(col << 3, row << 3, line)
}

function parse(text: string): number[] {
	throw new Error('Not implemented')
}

function combine(base: Attr, diff?: Partial<Attr>): Attr {
	const result = {
		ink: diff?.ink ?? base.ink,
		paper: diff?.paper ?? base.paper,
		isBright: diff?.isBright ?? base.isBright
	}
	return result
}
const theme = {
	paper: {paper: 'black', ink: 'white', isBright: false} as Attr,
	literal: {ink: 'green', isBright: true} as Partial<Attr>,
	keyword: {ink: 'red', isBright: true} as Partial<Attr>,
	symbol: {ink: 'white'} as Partial<Attr>,
	comment: {ink: 'green', isBright: false} as Partial<Attr>,
	identifier: {ink: 'cyan', isBright: false} as Partial<Attr>,
	error: {ink: 'red', isBright: true} as Partial<Attr>
}

function printTokenisedLine(col: number, row: number, line: Line) {
	const y = row << 3
	let x = (col << 3) + (line.indent * 20)
	for (let token of line.tokens) {
		let text: string
		let attr: Partial<Attr>|undefined = undefined
		if (typeof token === 'string') {
			attr = (token >= 'a' && token <= 'z') ? theme.keyword : theme.symbol
			text = token
		} else {
			switch(token.t) {
				case 'identifier':
					text = token.v
					attr = theme.identifier
					break
				case 'stringliteral':
					text = '“' + token.v + '”'
					attr = theme.literal
					break
				case 'intliteral':
					switch (token.s) {
						case 2:
							text = NARROW_PERCENT + token.v.toString(2)
							break
						case 10: 
							text = token.v.toString(10)
							break
						case 16:
							text = NARROW_DOLLAR + token.v.toString(16)
							break
					}
					attr = theme.literal
					break
				case 'floatliteral':
					text = ''+token.v
					attr = theme.literal
					break
				case 'boolliteral':
					text = token.v ? 'true' : 'false'
					attr = theme.literal
					break
				case 'comment':
					const token3 = token as LineComment
					text = '#'+token3.v
					attr = theme.comment
					break
				case '!!':
					text = 'error'
					attr = theme.error
					break
			}
		}
		x = renderText(x, y, text, combine(theme.paper, attr)) + 4
	}
}

export function parseAndRender() {
	cls(theme.paper)
	const textLines = textEditor.value.split('\n')
	let row = 1
	for(let line of textLines) {
		const t = tokeniseLine(line)
		printTokenisedLine(1, row, t)
		row++
	}
}
