#!/usr/bin/env node
// Validates data/ownership.json for referential integrity and required fields.
// Run in CI and before any monitor-proposed change is merged.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, "..", "data", "ownership.json");

const RELATION_KINDS = new Set([
  "controls",
  "equity",
  "investment",
  "convertible",
  "acqui-hire",
  "licensing",
  "subsidiary",
  "pending",
]);
const ENTITY_KINDS = new Set(["lab", "bigtech", "investor", "foundation"]);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];
const warnings = [];

let data;
try {
  data = JSON.parse(readFileSync(dataPath, "utf8"));
} catch (e) {
  console.error("✖ Could not parse data/ownership.json:", e.message);
  process.exit(1);
}

const ids = new Set();
for (const e of data.entities ?? []) {
  if (!e.id) errors.push("entity missing id");
  if (ids.has(e.id)) errors.push(`duplicate entity id: ${e.id}`);
  ids.add(e.id);
  if (!ENTITY_KINDS.has(e.kind)) errors.push(`entity ${e.id}: bad kind "${e.kind}"`);
  if (!e.name) errors.push(`entity ${e.id}: missing name`);
  if (!e.blurb) warnings.push(`entity ${e.id}: missing blurb`);
}

const relIds = new Set();
for (const r of data.relationships ?? []) {
  if (!r.id) errors.push("relationship missing id");
  if (relIds.has(r.id)) errors.push(`duplicate relationship id: ${r.id}`);
  relIds.add(r.id);
  if (!ids.has(r.from)) errors.push(`relationship ${r.id}: unknown from "${r.from}"`);
  if (!ids.has(r.to)) errors.push(`relationship ${r.id}: unknown to "${r.to}"`);
  if (!RELATION_KINDS.has(r.kind)) errors.push(`relationship ${r.id}: bad kind "${r.kind}"`);
  if (!ISO.test(r.asOf ?? "")) errors.push(`relationship ${r.id}: bad asOf date`);
  if (!ISO.test(r.verified ?? "")) errors.push(`relationship ${r.id}: bad verified date`);
  if (!Array.isArray(r.sources) || r.sources.length === 0)
    errors.push(`relationship ${r.id}: needs at least one source`);
  for (const s of r.sources ?? []) {
    if (!s.url || !/^https?:\/\//.test(s.url))
      errors.push(`relationship ${r.id}: source has no valid url`);
  }
}

for (const w of warnings) console.warn("⚠ " + w);
if (errors.length) {
  for (const e of errors) console.error("✖ " + e);
  console.error(`\n${errors.length} error(s). Data is invalid.`);
  process.exit(1);
}

console.log(
  `✓ Data valid: ${data.entities.length} entities, ${data.relationships.length} relationships.`,
);
