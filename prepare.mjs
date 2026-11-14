// Planetar: перший крок збирання на Cloudflare (варіант GitHub). Запускається сам — див. wrangler.toml → [build].
// Якщо в репозиторії лежить planetar-project.zip (так зручно оновлювати з iPad: один файл замість сотні),
// спершу розпаковує його поверх, а тоді запускає звичайне збирання build.mjs.
// Якщо архіву немає (файли проєкту лежать у репозиторії як є) — одразу build.mjs.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { dirname, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const ZIP = 'planetar-project.zip';
if (existsSync(ZIP)) {
  const b = readFileSync(ZIP);
  let e = b.length - 22; while (e >= 0 && b.readUInt32LE(e) !== 0x06054b50) e--; // кінець архіву
  if (e < 0) { console.error(`Planetar: ${ZIP} пошкоджений — завантаж його ще раз`); process.exit(1); }
  let p = b.readUInt32LE(e + 16), n = 0;
  const count = b.readUInt16LE(e + 10);
  for (let i = 0; i < count; i++) {
    if (b.readUInt32LE(p) !== 0x02014b50) { console.error(`Planetar: ${ZIP} пошкоджений`); process.exit(1); }
    const method = b.readUInt16LE(p + 10), size = b.readUInt32LE(p + 20), nl = b.readUInt16LE(p + 28), xl = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32), off = b.readUInt32LE(p + 42);
    const name = b.toString('utf8', p + 46, p + 46 + nl); p += 46 + nl + xl + cl;
    const rel = normalize(name.replace(/^planetar\//, '')).replace(/\\/g, '/');
    if (name.endsWith('/') || !rel || rel.startsWith('..') || rel.startsWith('/')) continue;
    const start = off + 30 + b.readUInt16LE(off + 26) + b.readUInt16LE(off + 28);
    const raw = b.subarray(start, start + size);
    const data = method === 8 ? inflateRawSync(raw) : method === 0 ? raw : null;
    if (!data) { console.error(`Planetar: ${name} стиснуто незнайомим способом`); process.exit(1); }
    if (existsSync(rel) && readFileSync(rel).equals(data)) continue; // однакові не переписуємо (інакше wrangler dev збирає по колу)
    mkdirSync(dirname(rel), { recursive: true }); writeFileSync(rel, data); n++;
  }
  console.log(`Planetar: із ${ZIP} оновлено ${n} файлів`);
}
if (!existsSync('build.mjs')) { console.error(`Planetar: немає ні ${ZIP}, ні файлів проєкту — завантаж ${ZIP} у репозиторій`); process.exit(1); }
await import(pathToFileURL('build.mjs').href);
