// lib.mjs - tokenisoitu omaisuus Stellarissa. Data luetaan suoraan ketjusta (Horizon) ja
// tokenien liikkeeseenlaskijat haetaan liikkeeseenlaskijan omasta stellar.toml-tiedostosta.
// Ei kolmannen osapuolen koottua aineistoa.

const HORIZON = "https://horizon.stellar.org";
const to = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };

export function parseToml(text) {
  // Poimii [[CURRENCIES]]-lohkoista code- ja issuer-rivit.
  const out = [];
  const blocks = String(text).split(/^\s*\[\[CURRENCIES\]\]\s*$/m).slice(1);
  for (const b of blocks) {
    const body = b.split(/^\s*\[/m)[0];
    const code = (body.match(/^\s*code\s*=\s*"([^"]+)"/m) || [])[1];
    const issuer = (body.match(/^\s*issuer\s*=\s*"(G[A-Z2-7]{55})"/m) || [])[1];
    if (code && issuer) out.push({ code, issuer });
  }
  return out;
}

export async function resolveIssuers(t, log) {
  if (t.issuer) return [t.issuer]; // liikkeeseenlaskijan omalta sivulta varmistettu osoite
  try {
    const r = await fetch(`https://${t.domain}/.well-known/stellar.toml`, { signal: to(20000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const found = parseToml(await r.text()).filter((c) => c.code === t.code);
    if (!found.length) throw new Error("koodia ei löytynyt stellar.tomlista");
    return found.map((c) => c.issuer);
  } catch (e) { log(`  ${t.code}: liikkeeseenlaskijaa ei saatu (${e.message})`); return []; }
}

const nz = (x) => { const n = parseFloat(x); return isFinite(n) ? n : 0; };

export async function readAsset(code, issuer, log) {
  try {
    const r = await fetch(`${HORIZON}/assets?asset_code=${encodeURIComponent(code)}&asset_issuer=${issuer}&limit=1`, { signal: to(20000), headers: { accept: "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const rec = (((await r.json())._embedded || {}).records || [])[0];
    if (!rec) throw new Error("ei tulosta");
    const b = rec.balances || {};
    const amount = nz(b.authorized ?? rec.amount) + nz(rec.claimable_balances_amount) + nz(rec.liquidity_pools_amount);
    const holders = (rec.accounts && rec.accounts.authorized) ?? rec.num_accounts ?? null;
    return { amount, holders };
  } catch (e) { log(`  ${code}: Horizon-haku epäonnistui (${e.message})`); return null; }
}

export async function loadStellar(cfg, log = console.log) {
  const rows = [], missing = [];
  for (const t of cfg.stellar) {
    const issuers = await resolveIssuers(t, log);
    let total = 0, holders = 0, ok = false;
    for (const iss of issuers) {
      const a = await readAsset(t.code, iss, log);
      if (a) { ok = true; total += a.amount; holders += a.holders || 0; }
    }
    if (ok) rows.push({ ...t, amount: total, holders, issuers }); else missing.push(t);
  }
  return { rows, missing, at: new Date().toISOString() };
}

const fmt = (v) => v >= 1e9 ? (v / 1e9).toFixed(2).replace(".", ",") + " mrd" : v >= 1e6 ? (v / 1e6).toFixed(1).replace(".", ",") + " milj." : Math.round(v).toLocaleString("fi-FI");

export function page({ shell, esc, data }) {
  const rows = [...data.rows].sort((a, b) => b.amount - a.amount);
  const at = new Date(data.at).toLocaleString("fi-FI", { timeZone: "Europe/Helsinki", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
  const trs = rows.map((r) => `<tr><td>${esc(r.nimi)}<div class="meta">${esc(r.yritys)} · ${esc(r.code)}</div></td><td class="n">${fmt(r.amount)}</td><td class="n">${r.holders ? r.holders.toLocaleString("fi-FI") : "–"}</td></tr>`).join("");
  const miss = data.missing.length ? `<p class="note">Ei saatu haettua tällä kertaa: ${data.missing.map((m) => esc(m.code)).join(", ")}.</p>` : "";
  const css = `<style>.rt{width:100%;border-collapse:collapse;font-size:15px}.rt td,.rt th{padding:8px 4px;border-bottom:1px solid var(--line);text-align:left}.rt .n,.rt th.n{text-align:right;white-space:nowrap}.sw{overflow-x:auto}</style>`;
  const body = `${css}<h1>Tokenisoitu omaisuus Stellarissa</h1>
<p><b>Prototyyppi.</b> Tämä sivu näyttää, kuinka paljon tiettyjä tokenisoituja rahastoja ja velkakirjoja on liikkeessä Stellar-ketjussa. Luvut luetaan suoraan ketjusta tunnin välein.</p>
<div class="card"><div class="meta">Seuratut tokenit</div><div class="big" style="font-size:34px;font-weight:800">${rows.length} kpl</div><div class="meta">päivitetty ${esc(at)}</div></div>
<div class="sw"><table class="rt"><thead><tr><th>Token</th><th class="n">Liikkeessä (kpl)</th><th class="n">Haltijoita</th></tr></thead><tbody>${trs}</tbody></table></div>${miss}
<h2>Mitä luvut tarkoittavat</h2>
<p>Luku on tokenien määrä kappaleina, ei dollareina. Esimerkiksi rahastotokenin yksikön arvo voi poiketa yhdestä dollarista. Haltijoiden määrä on tilien määrä, ei ihmisten.</p>
<h2>Mistä tieto tulee</h2>
<p class="note">Tokenin liikkeeseenlaskija haetaan liikkeeseenlaskijan omasta stellar.toml-tiedostosta. Määrä ja haltijat luetaan Stellarin julkisesta pääkirjasta (Horizon). Sivu on luettelo seurattavista tokeneista ja näyttää vain ne, jotka on tarkistettu. Tämä ei ole sijoitusneuvontaa eikä täydellinen luettelo.</p>
<p class="note">Sivu ei ole yhteydessä mainittuihin yhtiöihin, eikä ne tue tai suosittele sitä. Sivu ei anna ostosuosituksia eikä arvioi tuottoa. Ei-kaupallinen prototyyppi: ei mainoksia eikä maksullista sisältöä.</p>`;
  return [{ path: "/", html: shell({ title: "Tokenisoitu omaisuus Stellarissa (prototyyppi)", desc: "Prototyyppi: tokenisoitujen rahastojen ja velkakirjojen määrä Stellar-ketjussa.", path: "/", body, head: '<meta name="robots" content="noindex">' }) }];
}
