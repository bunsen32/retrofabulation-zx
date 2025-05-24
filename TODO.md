# TODOs

## Reset & Startup

* RAM test needs to at least allow 16 kB and 32 kB Spectrum models to boot. Should set RAMTOP variable
* RAM test could show text on screen:
  * "RAM TEST 1|2|3" then on the next line "RAM FAIL" or "16kB"|"32kB"|"48kB"
  * Text rendering routine _does_ use stack, but only simply, and we could construct a fake stack in ROM.
* Nice-to-have: If too restrictive a RAMTOP (<16 k? Less than 8 k ?) could show disagnostic/HALT
* Need to copy user-defined graphics characters into RAM.

## Text-rendering

* Endpoint for rendering up to a particular column (instead of, at the moment, rendering to certain # of columns, or right edge of screen)
* Render accents/diacritics on characters. (Implementation thought: can store diacritics prerotated to each 2-px offset, since there should be so few of them, and they occupy so few pixels.)
* Render clipped 1-cell and 1.5-cell characters, and expose rendering endpoint for that.

## Font & font-generation
* Diacritics: 0-width characters & pre-rotation encoding
* User-defined graphics characters (needs substitute, fixed-width "I", possibly fixed-width "M" if that ends up being wider)
* ~~Block graphics characters~~ [Done! 2025.05.22 1fa4fe]
* Wider, 1.5-cell ‘M’ & ‘W’?

## Text editing

* Rename from REPL to ‘editor’
* Key-click sound!
* ~~Accommodate composability (`CALL` screen commands, maybe don’t directly call line routine for moving right after insert?)~~ [Done!]
* CAPS-LOCK animation…? And audio?
* ~~Graphics mode~~ [Done! 2025.05.16]
* ~~Extended mode~~ [Done!]
* ~~Decode "BREAK" (SHIFT + SPACE)~~  [Done!]
* Decode INK, PAPER and colour keys.
* Display INK, PAPER, etc
* ~~Unified key character decoding~~ [Done!]
* Configurable editing screen window-rect

## Code editing/entering

* Code variant of text editor, which does some ‘lexing’ (transform input to insert some spaces, prevent multiple spaces, transform some characters—like sigils)
* Tokeniser running opportistically.
* Syntax colouring
* Compiler/encoder
* First actual simple REPL loop

## Code module editor

* (Currently in the long future...)

## Execution engine

* Stop on BREAK
* Basic standard functions, like "print" so we can write some sample code!

## Other

* Input & output channels
* Audio
* Bitmap graphics operations
