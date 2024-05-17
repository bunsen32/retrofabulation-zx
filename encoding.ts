
export const Ascii = 
	Array.from(
		{ length: 128 },
		(_, index) => String.fromCharCode(index));

const NUL = String.fromCharCode(0)
const NULx16 = [
	NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL, NUL
]

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

export const CharsetFromUnicode = {}
for (let i = 0; i < 0xc0; i++) CharsetFromUnicode[Charset[i]] = i

const Windows1252 = [
	...Ascii,
	// 80 hex:
	'€', NUL, '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ', '‰', 'Š', '‹', 'Œ', NUL, 'Ž', NUL,
	NUL, '‘', '’', '“', '”', '•', '–', '—', '˜', '™', 'š', '›', 'œ', NUL, 'ž', 'Ÿ',
	NUL, '¡', '¢', '£', '¤', '¥', '¦', '§', '¨', '©', 'ª', '«', '¬', NUL, '®', '¯',
	'°', '±', '²', '³', '´', 'µ', '¶', '·', '¸', '¹', 'º', '»', '¼', '½', '¾', '¿',
]

