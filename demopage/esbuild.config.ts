import * as esbuild from "https://deno.land/x/esbuild@v0.25.0/mod.js"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";

const result = await esbuild.build({
	plugins: [...denoPlugins()],
	entryPoints: ['./fonts.ts'], // Your main JavaScript file
	outfile: '../dist/fonts.js',        // The bundled output file
	bundle: true,             // Enable bundling
	platform: 'neutral'
  });

  esbuild.stop();