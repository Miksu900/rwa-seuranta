// build.mjs - hakee datan ja kirjoittaa dist/index.html. Jos haku epäonnistuu, rakennus kaatuu ja vanha sivu jää voimaan.
import { mkdir, writeFile } from "node:fs/promises";
import { loadRwa, rwaPages } from "./lib.mjs";

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const CSS = `:root{--bg:#0b1020;--text:#e8ecf6;--mute:#9aa6c4;--surface:#141b33;--line:#26304f}
@media (prefers-color-scheme:light){:root{--bg:#f6f7fb;--text:#141a2e;--mute:#5a6483;--surface:#e9edf7;--line:#d3d9e8}}
body{margin:0;background:var(--bg);color:var(--text);font:17px/1.55 system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:20px 16px 60px}a{color:#6f9bff}
.card{background:var(--surface);border-radius:14px;padding:14px 16px;margin:14px 0}.meta,.note{color:var(--mute);font-size:14px}h1{font-size:28px;line-height:1.2}h2{margin-top:30px}`;
function shell({ title, desc, body, head = "" }) {
  return `<!DOCTYPE html><html lang="fi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}">${head}<style>${CSS}</style></head><body><main>${body}</main></body></html>`;
}
const data = await loadRwa();
if (!data.items.length) throw new Error("DeFiLlamasta ei tullut yhtään RWA-protokollaa");
await mkdir("dist", { recursive: true });
for (const pg of rwaPages({ shell, esc, data })) await writeFile("dist/index.html", pg.html);
console.log("Valmis:", data.items.length, "protokollaa");
