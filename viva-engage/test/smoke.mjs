// Smoke test for the Viva Engage templates page.
// Run: cd viva-engage && npm install && npm test
// Exits non-zero on the first failed check group, listing every failure found.
import { chromium } from "playwright";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageUrl = pathToFileURL(join(root, "index.html")).href;
const data = JSON.parse(readFileSync(join(root, "templates.json"), "utf8"));
const templateCount = data.departments.reduce((n, d) => n + d.blocks.filter((b) => b.type === "template").length, 0);

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

// Use a preinstalled Chromium when one is provided (cloud sessions); otherwise Playwright's own.
const exe = process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});

try {
  // ---------- desktop ----------
  const ctx = await browser.newContext({ viewport: { width: 1320, height: 900 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(pageUrl);

  // 1. The data copied into the page matches templates.json (build.mjs was run).
  const inlined = await page.$eval("#templates-data", (el) => JSON.parse(el.textContent));
  check(JSON.stringify(inlined) === JSON.stringify(data), "index.html is out of date with templates.json. Run: node viva-engage/build.mjs");

  // 2. Every department rendered, every template present, every copy button present.
  const deptIds = data.departments.map((d) => d.id);
  for (const id of deptIds) {
    const has = await page.$(`#${id} .dept`);
    check(has, `department "${id}" did not render`);
  }
  const unrendered = await page.$$eval("[data-dept]", (els) => els.filter((e) => !e.querySelector(".dept")).map((e) => e.id));
  check(unrendered.length === 0, `sections with no data: ${unrendered.join(", ")}`);
  const nTpl = await page.$$eval("[data-tpl]", (e) => e.length);
  const nCopy = await page.$$eval("[data-copy]", (e) => e.length);
  check(nTpl === templateCount, `expected ${templateCount} templates, found ${nTpl}`);
  check(nCopy === templateCount, `expected ${templateCount} copy buttons, found ${nCopy}`);

  // 3. Every nav chip points at a section that exists.
  const sectionIds = await page.$$eval(".section", (els) => els.map((e) => e.id));
  const chips = await page.$$eval(".chip", (els) => els.map((e) => e.getAttribute("href").slice(1)));
  const deadChips = chips.filter((c) => !sectionIds.includes(c));
  check(deadChips.length === 0, `nav chips with no section: ${deadChips.join(", ")}`);
  const unlisted = deptIds.filter((id) => !chips.includes(id));
  check(unlisted.length === 0, `departments missing a nav chip: ${unlisted.join(", ")}`);

  // 4. Quick-fill substitutes into a copied template, and nothing unfilled leaks as {KEY}.
  await page.fill('input[data-k="COMPANY"]', "test co");
  await page.fill('input[data-k="WO"]', "12345");
  const firstId = deptIds[0];
  await page.click(`#${firstId} [data-copy]`);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check(clip.includes("TEST CO") && clip.includes("12345"), `quick-fill did not reach the copied ${firstId} template`);
  check(!/\{[A-Z]+\}/.test(clip), "copied text still contains an unfilled {KEY}");

  // 5. Revision stamp and one feedback link per department.
  const stamp = await page.textContent("#hdrRev");
  check(stamp && stamp.includes(data.formatRevision), `header stamp does not show format revision ${data.formatRevision}`);
  const fb = await page.$$eval(".fb", (els) => els.map((a) => a.getAttribute("href")));
  if (data.feedback && data.feedback.email) {
    check(fb.length === deptIds.length, `expected ${deptIds.length} feedback links, found ${fb.length}`);
    check(fb.every((h) => h.startsWith("mailto:")), "a feedback link is not a mailto link");
  }

  // 6. No one is tagged by name. Roles use @[role]. Catches "@First Last" style tags.
  const text = await page.evaluate(() => document.body.innerText);
  const tagged = text.match(/@[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
  check(tagged.length === 0, `people tagged by name: ${[...new Set(tagged)].join(", ")}`);

  // 7. Search narrows and clears.
  await page.fill("#search", "router");
  const visible = await page.$$eval(".section:not(.hidden)", (e) => e.length);
  check(visible > 0 && visible < sectionIds.length, `search "router" should narrow sections, showed ${visible} of ${sectionIds.length}`);
  await page.fill("#search", "");
  const all = await page.$$eval(".section:not(.hidden)", (e) => e.length);
  check(all === sectionIds.length, "clearing search did not restore every section");

  check(errors.length === 0, `script errors on desktop: ${errors.join(" | ")}`);
  await ctx.close();

  // ---------- phone ----------
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await phone.newPage();
  const perr = [];
  p2.on("pageerror", (e) => perr.push(String(e)));
  await p2.goto(pageUrl);
  const [sw, iw] = await p2.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  check(sw <= iw, `page scrolls sideways at phone width (${sw}px content in a ${iw}px screen)`);
  check(perr.length === 0, `script errors on phone: ${perr.join(" | ")}`);
  await phone.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`smoke test FAILED (${failures.length}):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`smoke test passed: ${data.departments.length} departments, ${templateCount} templates, format revision ${data.formatRevision}`);
