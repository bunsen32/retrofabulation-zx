// sha256.ts
const input = await new Response(Deno.stdin.readable).arrayBuffer()
const digest = await crypto.subtle.digest("SHA-256", input);

const hash = [...new Uint8Array(digest)]
  .map(b => b.toString(16).padStart(2, "0"))
  .join("");

console.log(hash.substring(0, 8));
