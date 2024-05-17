
import { render } from './parsing'
import { Colour, Attr, SpecScreen } from './SpecScreen'
import { glyphs } from './font1'
import { Line, tokeniseLine } from './tokeniser'
import { FloatLiteral, identifier, Identifier, IntLiteral, LineComment, StringLiteral, Token, TokenStruct } from './tokens'
import { CharsetFromUnicode } from './encoding'

const store = window.localStorage

const scale = 16
const editor = document.getElementById("editor") as HTMLCanvasElement
const rect = editor.getBoundingClientRect() // abs. size of element
const scaleX = editor.width / rect.width    // relationship bitmap vs. element for x
const scaleY = editor.height / rect.height  // relationship bitmap vs. element for y
const cx = editor.getContext("2d")
cx.imageSmoothingEnabled = false

const screenElement = document.getElementById("screen") as HTMLCanvasElement
const screenCx = screenElement.getContext("2d")
const screen = new SpecScreen(screenCx)
screenCx.imageSmoothingEnabled = false

const textEditor = document.getElementById("text-editor") as HTMLTextAreaElement

function drawGrid(widthPixels){
	const xMax = scale * widthPixels, yMax = scale * 8
	cx.fillStyle = "#fff"
	cx.fillRect(0, 0, xMax, yMax)
	cx.fillStyle = "#ddd"
	cx.fillRect(xMax, 0, 12 * scale, yMax)

	function afterXPix(x) {
		const xp = (x * scale) + scale - 1
		cx.fillRect(xp, 0, 1, yMax)
	}
	function afterYPix(y) {
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
	afterYPix(5)
}

function editorPixel(x, y, v){
	cx.fillStyle = v ? "#000" : "#fff"
	cx.fillRect(x*scale, y*scale, scale-1, scale-1)
}

function screenPixel(x, y, v){
	screen.pixel(x, y, v)
}

function byteAndBitFromXAndY(x, y)
{
	if (x > 12 || y > 8) throw "out of range";
	const byte = (y * 2) + Math.floor(x / 8)
	const bit = (7 - (x % 8))
	return [byte, bit]
}

function renderToEditor(data){
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

function renderToScreen(data, left, top){
	for (let y = 0; y < 8; y++){
		for(let x = 0; x < 12; x++){
			const [byte, bitPos] = byteAndBitFromXAndY(x, y)
			const bits = data.bytes[byte]
			const bit = (bits & (1 << bitPos)) != 0
			screenPixel(left+x, top+y, bit)
		}
	}
}

function emptyChar(){
	return {
		width: "n",
		bytes: [0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0]
	}
}

let selected = undefined
let data = emptyChar()
let isDirty = false

function encode(data){
	const w = data.width
	const s = data.bytes.map(b => b.toString(16)).join(",")
	console.log("encoding...", w, s)
	return `${w}${s}`
}

function decode(str){
	let width, byteString
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
		bytes: byteString.split(",").map(b => parseInt(b, 16))
	}
	//console.log("decoded: ", result)
	return result
}

function saveChar(i, data){
	if (!i) throw "i is undefined"+i
	const encoded = encode(data)
	console.log("saving "+i, encoded)
	store.setItem(`char${i}`, encoded)
}

function saveCurrentChar() {
	if (!isDirty) return
	saveChar(selected, data)
	isDirty = false
}

function loadCurrentChar(i) {
	console.log("loading char " + i)
	data = loadChar(i) ?? emptyChar()
	drawGrid(widthPixels(data.width));
	(document.getElementById(`char-size-${data.width}`) as HTMLInputElement).checked = true
	selected = i
	isDirty = false
}

function loadChar(i) {
	if (!i) return null
	const data = store.getItem(`char${i}`)
	if (data) return decode(data)
	const obj = glyphs[i]
	return obj || null
}

export function selectChar(i){
	console.log("selected", i)
	if (selected) {
		saveCurrentChar()
		const oldC = document.getElementById(`char-${selected}`)
		oldC.classList.remove("selected")
	}
	loadCurrentChar(i)
	const newC = document.getElementById(`char-${i}`)
	newC.classList.add("selected")
	console.log("data: "+ data)
	renderToEditor(data)
}

export function toggleWidth(newW){
	if (data.width == newW) return
	data.width = newW
	drawGrid(widthPixels(newW))
	isDirty = true
	renderToEditor(data)
}

function togglePixel(event){
	const x = Math.floor(event.offsetX * scaleX / scale)
	const y = Math.floor(event.offsetY * scaleY / scale)

	const [byte, bitPos] = byteAndBitFromXAndY(x, y)
	const mask = (1 << bitPos)
	data.bytes[byte] ^= mask
	isDirty = true
	renderToEditor(data)
}
editor.addEventListener("click", togglePixel)

export function saveFont() {
	saveCurrentChar()
	let s = ""
	for (let c = 0x20; c < 0xbf; c++) {
		const char = loadChar(c)
		if (!char) continue
		if (s) s+= ",\n"
		s += `\t${c}: {"width": "${char.width}", "bytes": [${char.bytes}]}`.replace(/NaN/g,"0")
	}
	textEditor.value = `{\n${s}\n}`
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
		'print "Hello minty softly?"',
		'let A=[1; 7; 8; 11, 2, 3456]',
		'print "Hello { name }"',
		'let x_thing = 23',
		'THE QUICK BROWN FOX JUMPS OVER',
		'THE LAZY DOG. \'The quick brown fox',
		'jumps over the lazy dog\'',
		'01234567890',
		'{i} {j} {f}',
		'1234, %1010101, $5ef8',
		'one/two/three/four... C:\\dir.name',
		'let v# = 3.44',
		'let s$ = "salutation"',
		'let s% = MAX_INT',
		'let p@ = @something',
		'',
		'@1982 ZX Spectrum Research Ltd'
	]
	let row = 1
	for(let line of lines) {
		printLine(1, row, line)
		row ++
	}
}
function widthPixels(width): number {
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

function printLine(col, row, line) {
	renderText(col << 3, row << 3, line)
}

function parse(text: string): number[] {
	const lines = text.split('\n')
	let out = []
	let p = 0

	return out
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

function printTokenisedLine(col, row, line: Line) {
	const y = row << 3
	let x = (col << 3) + (line.indent * 20)
	for (let token of line.tokens) {
		let text: string
		let attr: Partial<Attr>|undefined = null
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
					text = '"' + token.v + '"'
					attr = theme.literal
					break
				case 'intliteral':
					text = ''+token.v
					attr = theme.literal
					break
				case 'floatliteral':
					text = ''+token.v
					attr = theme.literal
					break
				case 'comment':
					const token3 = token as LineComment
					text = '#'+token3.v
					attr = theme.comment
					break
				case 'false':
					text = 'false'
					attr = theme.literal
					break
				case 'true':
					text = 'true'
					attr = theme.literal
					break;
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
