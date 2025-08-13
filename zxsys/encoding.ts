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

export const CODES: {[key: string]: byte} = {
	NUL: 0x00,
	LEFT: 0x01,
	RIGHT: 0x02,
	DOWN: 0x03,
	UP: 0x04,
	INV_VIDEO: 0x05,
	TRUE_VIDEO: 0x06,
	BREAK: 0x07,	// SHIFT-SPACE => BREAK into PROGRAM
	BACKSPACE: 0x08,	// ‘DELETE’
	TAB: 0x09,
	LINEFEED: 0x0A,	// Aka: ‘ENTER’ (Going with Unix-style line-endings!)
	ESCAPE: 0x0B,	// Aka: ‘EDIT’
	EXTENDED_MODE: 0x0C,	// Two shifts => ‘extended’ symbol mode.
	_13: 0x0D,
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
	NUL, '⇦', '⇨', '⇩', '⇧', '☀︎', '☼', '␇', '⌫','⇥', '↵', '␛', _FF, NUL, '⇪', NUL,
	NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, '﹠', '﹖', '﹪', '﹟', '﹩',
	...Ascii.slice(0x20, 0x7F), '░',
	// 80 hex:
	'€', '≠', '‚', '×', '„', '…', '†', '‡', 'Ł', '‰', 'Þ', '‹', 'Œ', 'Æ', 'Ð', 'Ø',
	'π', '‘', '’', '“', '”', '•', '–', '—', 'ł', '™', 'þ', '›', 'œ', 'æ', 'ð', 'ø',
	NUL, '¡', '¢', '£', '¤', '¥', '∆', '§', '≤', '©', 'ª', '«', '¬', 'ß', '®', '√',
	'°', '±', '²', '³', '∞', 'µ', '¶', '·', '≥', '¹', 'º', '»', '¼', '½', '¾', '¿',
	...NULx16,
	' ', '▝', '▘', '▀', '▗', '▐', '▚', '▜', '▖', '▞', '▌', '▛', '▄', '▟', '▙', '█', 
	'𝙰', '𝙱', '𝙲', '𝙳', '𝙴', '𝙵', '𝙶', '𝙷', '𝙸', '𝙹', '𝙺', '𝙻', '𝙼', '𝙽', '𝙾', '𝙿',
	'¸', '˛', NUL, NUL, 'ı', 'ˋ', '´', '¨', 'ˆ', '˜', '¯', '˘', '˙', '˚', '˝', 'ˇ'
]

export const CharsetFromUnicode: { [k: string]: byte } = {}
for (let i = 0xbf; i > 0x00; i--) CharsetFromUnicode[Charset[i]] = i as byte
for (let i = 0x1b; i <= 0x1f; i++) CharsetFromUnicode[String.fromCharCode(i)] = i as byte
CharsetFromUnicode['\0'] = 0 as byte

export const Windows1252 = [
	...Ascii,
	// 80 hex:
	'€', NUL, '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ', '‰', 'Š', '‹', 'Œ', NUL, 'Ž', NUL,
	NUL, '‘', '’', '“', '”', '•', '–', '—', '˜', '™', 'š', '›', 'œ', NUL, 'ž', 'Ÿ',
	NUL, '¡', '¢', '£', '¤', '¥', '¦', '§', '¨', '©', 'ª', '«', '¬', NUL, '®', '¯',
	'°', '±', '²', '³', '´', 'µ', '¶', '·', '¸', '¹', 'º', '»', '¼', '½', '¾', '¿',
]

