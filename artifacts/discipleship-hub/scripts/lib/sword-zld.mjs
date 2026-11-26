// Minimal reader for CrossWire SWORD compressed lexicon/dictionary modules
// (zLD driver, ZIP compression). Maintenance-only.
import fs from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";

/** Returns [key, text] for every entry, in module (alphabetical key) order. */
export function readZLD(moduleDir) {
  const confDir = path.join(moduleDir, "mods.d");
  const conf = fs.readdirSync(confDir).find(f => f.endsWith(".conf"));
  const text = fs.readFileSync(path.join(confDir, conf), "utf8");
  const get = key => new RegExp(`^${key}=(.*)$`, "m").exec(text)?.[1].trim();
  if (get("ModDrv") !== "zLD") throw new Error(`${conf}: only the zLD driver is supported`);
  if (get("CompressType") !== "ZIP") throw new Error(`${conf}: only ZIP compression is supported`);
  const base = path.join(moduleDir, get("DataPath").replace(/^\.\//, ""));
  const idx = fs.readFileSync(`${base}.idx`), dat = fs.readFileSync(`${base}.dat`);
  const zdx = fs.readFileSync(`${base}.zdx`), zdt = fs.readFileSync(`${base}.zdt`);
  const blocks = new Map();
  const block = n => {
    if (!blocks.has(n)) {
      const off = zdx.readUInt32LE(n * 8), size = zdx.readUInt32LE(n * 8 + 4);
      blocks.set(n, inflateSync(zdt.subarray(off, off + size)));
    }
    return blocks.get(n);
  };
  const out = [];
  for (let i = 0; i < idx.length; i += 8) {
    const rec = dat.subarray(idx.readUInt32LE(i), idx.readUInt32LE(i) + idx.readUInt32LE(i + 4));
    const nl = rec.indexOf(10);
    const key = rec.subarray(0, nl).toString("utf8").replace(/\r$/, "");
    const b = block(rec.readUInt32LE(nl + 1)), e = rec.readUInt32LE(nl + 5);
    const off = b.readUInt32LE(4 + e * 8), size = b.readUInt32LE(8 + e * 8);
    out.push([key, b.subarray(off, off + size).toString("utf8").replace(/\0+$/, "")]);
  }
  return out;
}
