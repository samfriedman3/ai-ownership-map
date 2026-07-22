import GraphSection from "@/components/GraphSection";
import OwnershipTable from "@/components/OwnershipTable";
import { data, entities, relationships } from "@/lib/data";

const LEGEND: { label: string; color: string; dashed?: boolean }[] = [
  { label: "Control / wholly owned", color: "var(--tie-control)" },
  { label: "Equity / convertible", color: "var(--tie-equity)" },
  { label: "Investor", color: "var(--tie-investor)" },
  { label: "Acqui-hire / licensing", color: "var(--tie-talent)" },
  { label: "Pending / announced", color: "#8a8f9c", dashed: true },
];

function Stat({ figure, label }: { figure: string; label: string }) {
  return (
    <div className="pr-8 last:pr-0">
      <div className="display tnum text-2xl text-[var(--ink)] sm:text-[28px]">{figure}</div>
      <div className="eyebrow mt-1">{label}</div>
    </div>
  );
}

export default function Home() {
  const labCount = entities.filter((e) => e.kind === "lab").length;
  const backerCount = entities.filter((e) => e.kind !== "lab").length;
  const updated = new Date(data.updatedAt + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-10 sm:px-10 sm:py-14">
      {/* ---------- masthead ---------- */}
      <header>
        <div className="eyebrow">Selected Ownership &amp; Financing Relationships · AI Sector</div>
        <h1 className="display mt-3 text-[42px] leading-[1.02] text-[var(--ink)] sm:text-[58px]">
          The AI Ownership Map
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-2)]">
          A curated map of the <strong>major</strong> ownership, control and
          financing ties among the companies building artificial intelligence —
          not a complete cap table. Each relationship is source-linked and carries
          the date it was last verified; figures for private companies are
          approximate and many smaller shareholders are intentionally omitted.
        </p>

        <div className="mt-8 flex flex-wrap items-end gap-y-6 border-y border-[var(--rule)] py-5">
          <Stat figure={String(labCount)} label="Companies" />
          <Stat figure={String(backerCount)} label="Owners &amp; backers" />
          <Stat figure={String(relationships.length)} label="Ownership ties" />
          <div className="ml-auto text-right">
            <div className="eyebrow">Data as at</div>
            <div className="tnum mt-1 text-sm font-semibold text-[var(--ink)]">{updated}</div>
          </div>
        </div>
      </header>

      {/* ---------- exhibit 1: the flow ---------- */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="display text-[26px] text-[var(--ink)]">
            <span className="eyebrow mr-3 align-middle">Exhibit 1</span>
            Who owns whom
          </h2>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[var(--rule)] pb-3">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-2 text-[12px] text-[var(--ink-2)]">
              <span
                className="inline-block w-6"
                style={
                  l.dashed
                    ? { borderTop: `2px dashed ${l.color}` }
                    : { height: "3px", background: l.color, borderRadius: "9999px" }
                }
              />
              {l.label}
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-sm border border-[var(--rule)] bg-[var(--paper-2)]">
          <GraphSection />
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--muted)]">
          Ownership flows left to right. Companies are ordered by scale, largest
          first; backers are ordered to minimise crossing lines. Stakes for
          private companies are frequently undisclosed and figures shown are
          approximate.
        </p>
      </section>

      {/* ---------- exhibit 2: the detail ---------- */}
      <section className="mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--rule)] pb-3">
          <h2 className="display text-[26px] text-[var(--ink)]">
            <span className="eyebrow mr-3 align-middle">Exhibit 2</span>
            Ownership detail
          </h2>
          <span className="text-[12px] text-[var(--muted)]">
            Each tie shows its stake, sources and verification date
          </span>
        </div>
        <div className="mt-6">
          <OwnershipTable />
        </div>
      </section>

      {/* ---------- source note ---------- */}
      <footer className="mt-16 border-t border-[var(--rule)] pt-6">
        <div className="eyebrow">Source note &amp; disclaimer</div>
        <div className="mt-3 grid gap-4 text-[12px] leading-relaxed text-[var(--muted)] sm:grid-cols-2">
          <p>
            Compiled from public reporting; each relationship links its
            underlying sources. Stakes in private companies are often
            undisclosed, reported as ranges, or measured on different bases
            (fully diluted vs. as-converted), so all figures should be treated as
            approximate. This page is informational only and is not investment
            advice.
          </p>
          <p>
            Changes are surfaced by a scheduled monitor that searches for new
            ownership, investment and M&amp;A activity and drafts proposed
            revisions. No revision is published without human review, so the
            verification date on each row reflects a person having checked it
            against the cited sources.
          </p>
        </div>
      </footer>
    </main>
  );
}
