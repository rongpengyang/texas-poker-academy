import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const prototypeRoot = path.resolve(root, "..", "smartpokerlab-ui-prototype");
const requiredProductionFiles = [
  "src/generate-site.js",
  "src/english-content.js",
  "script.js",
  "styles.css",
  "package.json",
];
const usefulPrototypePaths = [
  "src",
  "src/components",
  "src/routes",
  "src/styles.css",
];
const prohibitedTerms = [
  "agent",
  "rakeback",
  "private game",
  "deposit",
  "withdrawal",
  "guaranteed profit",
];

const results = [];

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

function pass(label, detail = "") {
  results.push({ ok: true, label, detail });
  console.log(`PASS ${label}${detail ? ` - ${detail}` : ""}`);
}

function fail(label, detail = "") {
  results.push({ ok: false, label, detail });
  console.log(`FAIL ${label}${detail ? ` - ${detail}` : ""}`);
}

function exists(relativeOrAbsolute) {
  return fs.existsSync(path.isAbsolute(relativeOrAbsolute) ? relativeOrAbsolute : path.join(root, relativeOrAbsolute));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function runCommand(command, args) {
  const display = [command, ...args].join(" ");
  console.log(`\n$ ${display}`);
  const executable = process.platform === "win32" && command === "npm" ? process.env.ComSpec || "cmd.exe" : command;
  const commandArgs = process.platform === "win32" && command === "npm" ? ["/d", "/s", "/c", display] : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status === 0;
}

function getHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...getHtmlFiles(full));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function termPattern(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

printSection("Repository");
const productionPackagePath = path.join(root, "package.json");
if (exists(productionPackagePath)) {
  const productionPackage = readJson(productionPackagePath);
  if (productionPackage.name === "smart-poker-lab") {
    pass("production package name", productionPackage.name);
  } else {
    fail("production package name", `expected smart-poker-lab, found ${productionPackage.name || "(missing)"}`);
  }
} else {
  fail("production package.json exists");
}

const productionRootLooksRight = requiredProductionFiles.every((file) => exists(file));
if (productionRootLooksRight) {
  pass("running from production repo", root);
} else {
  fail("running from production repo", "required production files were not all found");
}

printSection("Lovable Prototype");
if (exists(prototypeRoot)) {
  pass("prototype repo exists", prototypeRoot);
} else {
  fail("prototype repo exists", prototypeRoot);
}

const prototypePackagePath = path.join(prototypeRoot, "package.json");
if (exists(prototypePackagePath)) {
  pass("prototype package.json exists");
} else {
  fail("prototype package.json exists", prototypePackagePath);
}

for (const item of usefulPrototypePaths) {
  const absolute = path.join(prototypeRoot, item);
  if (exists(absolute)) pass(`prototype path ${item}`);
  else fail(`prototype path ${item}`);
}

printSection("Production Files");
for (const file of requiredProductionFiles) {
  if (exists(file)) pass(`production file ${file}`);
  else fail(`production file ${file}`);
}

printSection("Build Commands");
if (runCommand("npm", ["run", "check"])) pass("npm run check");
else fail("npm run check");

if (runCommand("npm", ["run", "build"])) pass("npm run build");
else fail("npm run build");

printSection("Generated Output");
const sitemapPath = path.join(root, "dist", "sitemap.xml");
if (exists(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const count = (sitemap.match(/<url>\s*<loc>/g) || sitemap.match(/<url>/g) || []).length;
  if (count === 143) pass("sitemap URL count", String(count));
  else fail("sitemap URL count", `expected 143, found ${count}`);
} else {
  fail("dist/sitemap.xml exists");
}

const htmlFiles = getHtmlFiles(path.join(root, "dist"));
if (htmlFiles.length) {
  pass("dist HTML files found", String(htmlFiles.length));
} else {
  fail("dist HTML files found");
}

const prohibitedHits = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  for (const term of prohibitedTerms) {
    if (termPattern(term).test(html)) {
      prohibitedHits.push({ term, file: path.relative(root, file) });
    }
  }
}

if (prohibitedHits.length === 0) {
  pass("prohibited public HTML scan", "0 hits");
} else {
  fail("prohibited public HTML scan", `${prohibitedHits.length} hits`);
  for (const hit of prohibitedHits.slice(0, 25)) {
    console.log(`  ${hit.term}: ${hit.file}`);
  }
  if (prohibitedHits.length > 25) console.log(`  ...and ${prohibitedHits.length - 25} more`);
}

printSection("Result");
const failed = results.filter((result) => !result.ok);
if (failed.length) {
  console.log(`FAIL - ${failed.length} check(s) failed`);
  process.exitCode = 1;
} else {
  console.log("PASS - Lovable UI sync audit passed");
}
