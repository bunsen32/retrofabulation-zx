# TODOs

## Build process

* [x] ~~How we define global variables is a bit broken (it essentially allocates ROM-space). There should be a mechanism in the assembler for defining a ‘structure’, I think?~~

## Reset & Startup

* [ ] RAM test needs to at least allow 16 kB and 32 kB Spectrum models to boot. Should set RAMTOP variable
* [ ] RAM test could show text on screen:
  * [ ] "RAM TEST 1|2|3" then on the next line "RAM FAIL" or "16kB"|"32kB"|"48kB"
  * [ ] Text rendering routine _does_ use stack, but only simply, and we could construct a fake stack in ROM.
* [ ] Nice-to-have: If too restrictive a RAMTOP (<16 k? Less than 8 k ?) could show disagnostic/HALT
* [x] ~~Need to copy user-defined graphics characters into RAM.~~ [Done: 2025.06.07]
* [x] ~~Move User Defined Graphics characters to just after screen memory, as a buffer before the global variables.~~ [Done: 2025.06.19]

## Text-rendering

* [ ] Endpoint for rendering up to a particular column (instead of, at the moment, rendering to certain # of columns, or right edge of screen)
* [ ] Render accents/diacritics on characters. (Implementation thought: can store diacritics prerotated to each 2-px offset, since there should be so few of them, and they occupy so few pixels.)
* [ ] Render clipped 1-cell and 1.5-cell characters, and expose rendering endpoint for that.
* [ ] Malformed font data can cause renderer to clobber random memory. Would be good to make it more robust. Could special-
  case all-zero metadata byte and render as blank character, perhaps. Otherwise mask height to 0b111 and add 1 (and
	ignore spurious other bits).
* [ ] Could represent 1.5-cell character as 2 parts (1-cell + 0.5-cell) and render separately, which would reduce amount of rendering code at minimal cost to font data size (1 byte extra per such character), and minimal rendering cost, since wide characters occur infrequently. Also, if we want to draw clipped characters, that’s also fewer cases to handle: we just need logic to slice 1-cell glyph, really.
* [x] ~~System font should be a global variable.~~ [Done: 2025.06.22]

## Font & font-generation
* [ ] Diacritics: 0-width characters & pre-rotation encoding
* [x] ~~User-defined graphics characters (needs substitute, fixed-width "I", possibly fixed-width "M" if that ends up being wider)~~ [Done! 2025.06.12]
* [x] ~~Block graphics characters~~ [Done! 2025.05.22 1fa4fe]
* [ ] Wider, 1.5-cell ‘M’ & ‘W’?

## Text editing

* [ ] Rename from REPL to ‘editor’
* [ ] Key-click sound!
* [x] ~~Accommodate composability (`CALL` screen commands, maybe don’t directly call line routine for moving right after insert?)~~ [Done!]
* [ ] CAPS-LOCK animation…? And audio?
* [x] ~~Graphics mode~~ [Done! 2025.05.16]
* [x] ~~Extended mode~~ [Done!]
* [x] ~~Decode "BREAK" (SHIFT + SPACE)~~  [Done!]
* [ ] Decode INK, PAPER and colour keys.
* [ ] Display INK, PAPER, etc
* [x] ~~Unified key character decoding~~ [Done!]
* [ ] Configurable editing screen window-rect

## Code editing/entering

### Lexing
* [ ] Code variant of text editor, which does some ‘lexing’ (transform input to insert some spaces, prevent multiple spaces, transform some characters—like sigils)

### Tokeniser
* [x] BUG! Space after identifier not being recognised?
* [x] Change space-before-token semantics to be more consistent, including for first token. 1 should indicate space.
* [ ] Tokeniser running opportistically.
* [ ] Syntax colouring
  * [ ] Distinguish categories of tokens and select colour from colour scheme
  * [ ] Tokens are coloured live inline in edited text.
* [ ] PARSING…
  * [x] ~~Numbers with leading minus sign~~ [Done!]
	* [ ] Numbers with leading plus sign?
	* [ ] Interpret 1/4, 1/2, 3/4 symbols as numbers? (Either as special symbols or shortcuts for 0.25, 0.5, 0.75)

### Parser & Code Generator
* [ ] Compiler/encoder
* [ ] First actual simple REPL loop

## Code module editor

* [ ] (Currently in the long future...)

## Execution engine

* [ ] Stop on BREAK
* [ ] Basic standard functions, like "print" so we can write some sample code!

## Other

* [ ] Input & output channels
* [ ] Audio
* [ ] Bitmap graphics operations
