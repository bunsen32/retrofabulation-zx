import { byte } from "./Byte.ts";

export const Ascii = 
	Array.from(
		{ length: 128 },
		(_, index) => String.fromCharCode(index));

const NUL = String.fromCharCode(0)
const NULx16 = [
	NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL
]

export const NARROW_AMP_CODE = 0x1b
export const NARROW_QUEST_CODE = 0x1c
export const NARROW_PERCENT_CODE = 0x1d
export const NARROW_HASH_CODE = 0x1e
export const NARROW_DOLLAR_CODE = 0x1f

export const NARROW_AMP = String.fromCharCode(NARROW_AMP_CODE)
export const NARROW_QUEST = String.fromCharCode(NARROW_QUEST_CODE)
export const NARROW_PERCENT = String.fromCharCode(NARROW_PERCENT_CODE)
export const NARROW_HASH = String.fromCharCode(NARROW_HASH_CODE)
export const NARROW_DOLLAR = String.fromCharCode(NARROW_DOLLAR_CODE)

export const Charset = [
	...Ascii,
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
Charset[NARROW_AMP_CODE] = '&'
Charset[NARROW_QUEST_CODE] = '?'
Charset[NARROW_PERCENT_CODE] = '%'
Charset[NARROW_HASH_CODE] = '#'
Charset[NARROW_DOLLAR_CODE] = '$'

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

