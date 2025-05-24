# Retrofabulation ZX: The Spectrum ROM Reimagined
Rebuilding the ZX Spectrum ROM; better, faster, stronger

## TL;DR
A from-scratch redesign of the ZX Spectrum ROM:
 1. With a ‘better’ BASIC replacement: an easier, more space-efficient, faster language.
 2. Faster tape loading, faster graphics primitives
 3. Stronger support for games (e.g., bult-in sprite routines); support for modular programs. 

Why? This is purely an intellectual exercise to see how far we could improve a design with the benefit of hindsight.
 1. Might have made programming more attractive and accessible to beginners
 2. Might have made it easier to develop games, on the device itself
 3. Might have encouraged more creativity and usefulness.

 But really the reason for this project is for the creative and technical challenge, developing for a constrained and ‘fixed’ retro platform.

## (not) Contributing

This is very much a personal project, at least at the moment. I’m not looking for help or contributions, at least until I know what the finished design is going to look like.

However, it’s all public, from the start, because I don’t have any reason to keep it private. Everything is MIT-licensed, so feel free to copy, read, adapt, steal; whatever you like.

## How to develop/build

To build this software, you will need, in addition to the source code:
1. [Deno](https://deno.com): JavaScript runtime, package-manager and build system, with native support for TypeScript
2. [SjASMPlus](https://github.com/z00m128/sjasmplus): Z80/ZX Spectrum cross-assembler. Needs to be accessible on the path.
3. [JSSpeccy3](https://github.com/gasman/jsspeccy3): WebAssembly ZX Spectrum emulator. Copy to a directory right next to this one, and build it. (Should become a package dependency of this package at some point.)

### Other information

There’s a brief description of the development pipeline, and unit test mechanism in this blog posting: https://dysphoria.net/2025/05/18/setting-up-a-modern-zx-spectrum-toolchain-part-1-of-2/
