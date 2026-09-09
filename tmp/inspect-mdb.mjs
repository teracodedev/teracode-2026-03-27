import fs from "fs";
import MDBReader from "mdb-reader";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node inspect-mdb.mjs <file.mdb>");
  process.exit(1);
}
const buffer = fs.readFileSync(path);
const reader = new MDBReader(buffer);
const tables = reader.getTableNames();
console.log("=== TABLES ===");
console.log(tables.join("\n"));
console.log("\n=== ADDRESS-RELATED TABLES ===");
const related = tables.filter((t) => /住所|転居|履歴|変更/.test(t));
console.log(related.length ? related.join("\n") : "(none by name)");
for (const name of tables) {
  if (!/住所|転居|履歴|変更|戸主|家族/.test(name)) continue;
  try {
    const table = reader.getTable(name);
    const cols = table.getColumnNames();
    const rows = table.getData();
    console.log(`\n--- ${name} (${rows.length} rows) ---`);
    console.log("columns:", cols.join(", "));
    if (rows[0]) {
      const sample = {};
      for (const c of cols.slice(0, 20)) sample[c] = rows[0][c];
      console.log("sample[0]:", JSON.stringify(sample, null, 2));
    }
    // If looks like address table, show how many rows per key
    if (cols.includes("家族ID") || cols.includes("台帳ID")) {
      const key = cols.includes("台帳ID") ? "台帳ID" : "家族ID";
      const counts = new Map();
      for (const r of rows) {
        const k = r[key];
        counts.set(k, (counts.get(k) || 0) + 1);
      }
      const multi = [...counts.values()].filter((n) => n > 1);
      console.log(`unique ${key}: ${counts.size}, multi-row keys: ${multi.length}, max rows/key: ${Math.max(0, ...counts.values())}`);
    }
  } catch (e) {
    console.log(`\n--- ${name} ERROR: ${e.message} ---`);
  }
}
