#!/usr/bin/env node
/**
 * Semi-automated ownership monitor.
 *
 * Runs on a schedule (see .github/workflows/monitor.yml). It asks Claude — with
 * live web search — to look for AI-company ownership / investment / M&A news
 * that isn't yet reflected in data/ownership.json, then writes a human-readable
 * review document to data/proposals/. It NEVER edits ownership.json directly:
 * a person reviews the proposals and applies the ones that check out. That
 * human gate is what keeps unverified or hallucinated "deals" out of the site.
 *
 * Requires ANTHROPIC_API_KEY. Optional env:
 *   MONITOR_MODEL   (default: claude-sonnet-5)
 *   MONITOR_LOOKBACK_DAYS (default: 45)
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dataPath = join(root, "data", "ownership.json");
const proposalsDir = join(root, "data", "proposals");

const MODEL = process.env.MONITOR_MODEL || "claude-opus-4-8";
const LOOKBACK = Number(process.env.MONITOR_LOOKBACK_DAYS || 45);

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "ANTHROPIC_API_KEY is not set.\n" +
      "The monitor needs it to run web searches. Set it locally or as a GitHub Actions secret.\n" +
      "Skipping (this is expected in environments without the key).",
  );
  process.exit(process.env.CI ? 0 : 1);
}

const data = JSON.parse(readFileSync(dataPath, "utf8"));
const today = new Date().toISOString().slice(0, 10);

// A compact snapshot so the model knows what we already track.
const snapshot = {
  updatedAt: data.updatedAt,
  companies: data.entities
    .filter((e) => e.kind === "lab")
    .map((e) => e.name),
  ties: data.relationships.map(
    (r) => `${nameOf(r.from)} → ${nameOf(r.to)}: ${r.kind}${r.stake ? ` (${r.stake})` : ""} [verified ${r.verified}]`,
  ),
};

function nameOf(id) {
  return data.entities.find((e) => e.id === id)?.name ?? id;
}

const prompt = `You are the change-detection monitor for an "AI company ownership" dataset.
Today is ${today}. Use web search to find ownership-relevant news from roughly the last ${LOOKBACK} days.

Ownership-relevant = equity investments, acquisitions, mergers, acqui-hires,
tech-licensing+talent deals, corporate restructurings, or material changes to a
stake/valuation for companies that build or sell AI models.

Here is what the dataset ALREADY tracks (do not re-report these unless the figure has changed):
${JSON.stringify(snapshot, null, 2)}

Find:
1. NEW deals not represented above.
2. CHANGES to existing ties (e.g. a stake percentage changed, a round closed, control shifted).
3. NEW notable companies worth adding.

For every item, you MUST cite at least one reputable source URL you actually found via search.
Do NOT invent deals, figures, or URLs. If you are unsure, mark confidence "low" and say why.
If nothing material is found, return an empty "proposals" array.

Return ONLY a JSON object (no prose, no markdown fences) shaped exactly:
{
  "proposals": [
    {
      "type": "new-tie" | "update-tie" | "new-company",
      "company": "<AI company name>",
      "counterparty": "<owner/investor name, or null for new-company>",
      "summary": "<one sentence describing the change>",
      "suggestedStake": "<e.g. '27%' or 'up to $40B' or null>",
      "asOf": "<YYYY-MM-DD of the deal>",
      "confidence": "high" | "medium" | "low",
      "sources": [ { "title": "<publisher/headline>", "url": "<https url>" } ]
    }
  ]
}`;

console.log(`Running monitor with ${MODEL} (lookback ${LOOKBACK}d)…`);

const client = new Anthropic();

// Adaptive thinking must be set explicitly — omitting it runs without thinking.
// web_search_20260209 is the current tool version (adds dynamic filtering).
const res = await client.messages.create({
  model: MODEL,
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  output_config: { effort: "high" },
  messages: [{ role: "user", content: prompt }],
  tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 12 }],
});

if (res.stop_reason === "refusal") {
  console.error("Request was declined by safety classifiers; nothing written.");
  process.exit(1);
}

// The final text block holds the JSON answer.
const text = res.content
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("\n")
  .trim();

let parsed;
try {
  // Tolerate markdown fences or stray prose around the JSON object.
  const unfenced = text.replace(/^```(?:json)?/gm, "").replace(/```$/gm, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object found");
  parsed = JSON.parse(unfenced.slice(start, end + 1));
} catch (e) {
  console.error(`Could not parse model output as JSON (${e.message}). Raw output:\n${text}`);
  process.exit(1);
}

const proposals = parsed.proposals ?? [];
mkdirSync(proposalsDir, { recursive: true });
const outPath = join(proposalsDir, `${today}.md`);
const hasChanges = proposals.length > 0;

const md = renderMarkdown(today, proposals);
writeFileSync(outPath, md);
console.log(`Wrote ${outPath} — ${proposals.length} proposal(s).`);

// Signal for the GitHub Action (whether to open a PR / issue).
if (process.env.GITHUB_OUTPUT) {
  writeFileSync(
    process.env.GITHUB_OUTPUT,
    `has_changes=${hasChanges ? "true" : "false"}\ncount=${proposals.length}\n`,
    { flag: "a" },
  );
}

function renderMarkdown(date, items) {
  if (!items.length) {
    return `# Ownership monitor — ${date}\n\nNo material ownership changes detected in the last ${LOOKBACK} days.\n`;
  }
  const lines = [
    `# Ownership monitor — ${date}`,
    "",
    `Detected **${items.length}** possible change(s). **Review each before merging** — apply only the ones that check out, then update the \`verified\` date in \`data/ownership.json\`.`,
    "",
  ];
  for (const [i, p] of items.entries()) {
    lines.push(`## ${i + 1}. [${p.type}] ${p.company}${p.counterparty ? ` ↔ ${p.counterparty}` : ""}`);
    lines.push("");
    lines.push(`- **What:** ${p.summary}`);
    if (p.suggestedStake) lines.push(`- **Stake/amount:** ${p.suggestedStake}`);
    if (p.asOf) lines.push(`- **As of:** ${p.asOf}`);
    lines.push(`- **Confidence:** ${p.confidence}`);
    lines.push(`- **Sources:**`);
    for (const s of p.sources ?? []) lines.push(`  - [${s.title}](${s.url})`);
    lines.push("");
    lines.push("- [ ] Verified & applied to `data/ownership.json`");
    lines.push("");
  }
  return lines.join("\n");
}
