// substitute.ts
const [find, replace] = Deno.args;

if (!find || !replace) {
  console.error("Usage: deno run substitute.ts <seach-for> <replace-with>");
  Deno.exit(1);
}

const text = new TextDecoder().decode(await new Response(Deno.stdin.readable).arrayBuffer());
const output = text.replace(find, replace);

await Deno.stdout.write(new TextEncoder().encode(output));
