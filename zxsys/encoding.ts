import { byte } from "./Byte.ts";

export const Ascii = 
	Array.from(
		{ length: 128 },
		(_, index) => String.fromCharCode(index));

const NUL = String.fromCharCode(0)
const _LF = String.fromCharCode(0x0a)
const _FF = String.fromCharCode(0x0c)
const NULx16 = [
	NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL
]

export const CODES = {
	NUL: 0x00,
	LEFT: 0x01,
	RIGHT: 0x02,
	DOWN: 0x03,
	UP: 0x04,
	INV_VIDEO: 0x05,
	TRUE_VIDEO: 0x06,
	_7: 0x07,	// BELL. Leave unassigned, because it’s annoying.
	BACKSPACE: 0x08,	// ‘Delete’
	TAB: 0x09,
	LINEFEED: 0x0A,	// Going with Unix-style line-endings!	
	ESCAPE: 0x0B,	// Aka: ‘EDIT’
	_12: 0x0C,	// Form-feed. Could actually be useful for printers.
	ENTER: 0x0D,	// This is the key. Maps to $0A (LINEFEED) in output.
	CAPS_LOCK: 0x0E,
	GRAPHICS: 0x0F,

	
	NARROW_AMP: 0x1b,
	NARROW_QUEST: 0x1c,
	NARROW_PERCENT: 0x1d,
	NARROW_HASH: 0x1e,
	NARROW_DOLLAR: 0x1f,
}

export const NARROW_AMP = String.fromCharCode(CODES.NARROW_AMP)
export const NARROW_QUEST = String.fromCharCode(CODES.NARROW_QUEST)
export const NARROW_PERCENT = String.fromCharCode(CODES.NARROW_PERCENT)
export const NARROW_HASH = String.fromCharCode(CODES.NARROW_HASH)
export const NARROW_DOLLAR = String.fromCharCode(CODES.NARROW_DOLLAR)

export const Charset = [
	NUL, '⇦', '⇨', '⇩', '⇧', '☀︎', '☼', '␇', '⌫','\t', _LF, '␛', _FF, '↵', '⇪', ' ',
	NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, '&', '?', '%', '#', '$',
	...Ascii.slice(0x20, 0x7F), '░',
	// 80 hex:
	'€', '≠', '‚', '×', '„', '…', '†', '‡', 'Ł', '‰', 'Þ', '‹', 'Œ', 'Æ', 'Ð', 'Ø',
	'π', '‘', '’', '“', '”', '•', '–', '—', 'ł', '™', 'þ', '›', 'œ', 'æ', 'ð', 'ø',
	NUL, '¡', '¢', '£', '¤', '¥', '∆', '§', '≤', '©', 'ª', '«', '¬', 'ß', '®', '√',
	'°', '±', '²', '³', '∞', 'µ', '¶', '·', '≥', '¹', 'º', '»', '¼', '½', '¾', '¿',
	...NULx16,
	...NULx16,
	...NULx16,
	'¸', '˛', NUL, NUL, 'ı', 'ˋ', '´', '¨', 'ˆ', '˜', '¯', '˘', '˙', '˚', '˝', 'ˇ'
]
Charset[CODES.NARROW_AMP] = '&'
Charset[CODES.NARROW_QUEST] = '?'
Charset[CODES.NARROW_PERCENT] = '%'
Charset[CODES.NARROW_HASH] = '#'
Charset[CODES.NARROW_DOLLAR] = '$'

export const CharsetFromUnicode: { [k: string]: byte } = {}
for (let i = 0; i < 0xc0; i++) CharsetFromUnicode[Charset[i]] = i as byte
for (let i = 0x1b; i <= 0x1f; i++) CharsetFromUnicode[String.fromCharCode(i)] = i as byte

const Windows1252 = [
	...Ascii,
	// 80 hex:
	'€', NUL, '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ', '‰', 'Š', '‹', 'Œ', NUL, 'Ž', NUL,
	NUL, '‘', '’', '“', '”', '•', '–', '—', '˜', '™', 'š', '›', 'œ', NUL, 'ž', 'Ÿ',
	NUL, '¡', '¢', '£', '¤', '¥', '¦', '§', '¨', '©', 'ª', '«', '¬', NUL, '®', '¯',
	'°', '±', '²', '³', '´', 'µ', '¶', '·', '¸', '¹', 'º', '»', '¼', '½', '¾', '¿',
]

