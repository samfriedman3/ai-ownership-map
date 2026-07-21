import GraphSection from "@/components/GraphSection";
import OwnershipTable from "@/components/OwnershipTable";
import { data, entities, relationships } from "@/lib/data";

const LEGEND: { label: string; color: string }[] = [
  { label: "Control / wholly owned", color: "#d98a1f" },
  { label: "Equity / convertible", color: "#4f5bd5" },
  { label: "Investor", color: "#159a6b" },
  { label: "Acqui-hire / licensing", color: "#b5449e" },
];

export default function Home() {
  const labCount = entities.filter((e) => e.kind === "lab").length;
  const backerCount = entities.filter((e) => e.kind !== "lab").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              AI Ownership Map
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
              Who really owns and bankrolls the companies building AI — the big
              labs and the smaller specialists. Every relationship is
              source-linked and carries a &ldquo;last verified&rdquo; date, and a
              scheduled monitor drafts updates for review whenever a new deal is
              struck.
            </p>
          </div>
          <div className="text-right text-xs text-[var(--muted)]">
            <div>
              <span className="font-semibold text-[var(--text)]">{labCount}</span> companies ·{" "}
              <span className="font-semibold text-[var(--text)]">{backerCount}</span> backers ·{" "}
              <span className="font-semibold text-[var(--text)]">{relationships.length}</span> ties
            </div>
            <div className="mt-1">Data updated {data.updatedAt}</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span
                className="inline-block h-2.5 w-5 rounded-full"
                style={{ background: l.color }}
              />
              {l.label}
            </div>
          ))}
          <span className="text-xs text-[var(--muted)]">
            · bigger node = larger company · click a node to isolate its ties
          </span>
        </div>
      </header>

      <section className="mb-12 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)]">
        <GraphSection />
      </section>

      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-bold">Ownership detail</h2>
        <span className="text-xs text-[var(--muted)]">
          Badges show how recently each tie was verified
        </span>
      </div>
      <OwnershipTable />

      <footer className="mt-14 border-t border-[var(--border)] pt-6 text-xs leading-relaxed text-[var(--muted)]">
        <p>
          Informational only, compiled from public reporting — not investment
          advice, and stakes for private companies are frequently undisclosed or
          approximate. Each entry links its sources; verify before relying on any
          figure.
        </p>
        <p className="mt-2">
          Updates are proposed by an automated monitor and published only after
          human review. See <code>scripts/monitor.mjs</code> and{" "}
          <code>.github/workflows/monitor.yml</code>.
        </p>
      </footer>
    </main>
  );
}
