// Copies templates.json into index.html so the page works opened as a file, from a link, or offline.
// Run after every edit to templates.json:  node viva-engage/build.mjs
// No dependencies. Fails loudly if the marker is missing or the JSON is invalid.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, "templates.json");
const pagePath = join(here, "index.html");

const data = JSON.parse(readFileSync(dataPath, "utf8"));
for (const d of data.departments) {
  for (const key of ["id", "name", "confidence", "revised", "when", "blocks", "side", "source"]) {
    if (d[key] === undefined) throw new Error(`templates.json: department "${d.id}" is missing "${key}"`);
  }
}

// Escape "</" so a value can never close the script tag early.
const payload = JSON.stringify(data).replace(/<\//g, "<\\/");
const page = readFileSync(pagePath, "utf8");
const re = /(<script id="templates-data" type="application\/json">)[\s\S]*?(<\/script>)/;
if (!re.test(page)) throw new Error('index.html: <script id="templates-data"> marker not found');
const next = page.replace(re, (_, open, close) => open + payload + close);
writeFileSync(pagePath, next);
const n = data.departments.reduce((a, d) => a + d.blocks.filter((b) => b.type === "template").length, 0);
console.log(`built: ${data.departments.length} departments, ${n} templates, format revision ${data.formatRevision}`);
