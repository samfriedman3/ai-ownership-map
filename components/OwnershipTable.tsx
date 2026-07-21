"use client";

import { useMemo, useState } from "react";
import {
  entities,
  entityName,
  freshness,
  ownersOf,
  RELATION_LABELS,
  verificationAgeDays,
} from "@/lib/data";
import type { Entity, Relationship } from "@/lib/types";

const SECTORS: { id: Entity["sector"] | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "frontier", label: "Frontier" },
  { id: "open-source", label: "Open-source" },
  { id: "specialist", label: "Specialist" },
  { id: "infrastructure", label: "Infrastructure" },
];

const FRESH_STYLE: Record<string, string> = {
  fresh: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  aging: "bg-amber-500/10 text-amber-700 border-amber-500/40",
  stale: "bg-rose-500/10 text-rose-700 border-rose-500/40",
};

function valuationLabel(v?: number): string | null {
  if (v == null) return null;
  if (v >= 1000) return `~$${(v / 1000).toFixed(1)}T`;
  return `~$${v}B`;
}

function FreshnessBadge({ r }: { r: Relationship }) {
  const f = freshness(r);
  const days = verificationAgeDays(r);
  const label = f === "fresh" ? "verified" : f === "aging" ? "aging" : "recheck";
  return (
    <span
      title={`Last verified ${r.verified} (${days} days ago)`}
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${FRESH_STYLE[f]}`}
    >
      {label} · {r.verified}
    </span>
  );
}

function OwnerRow({ r }: { r: Relationship }) {
  return (
    <li className="flex flex-col gap-1 border-t border-[var(--border)] py-2 first:border-t-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-[var(--text)]">{entityName(r.from)}</span>
          <span className="rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
            {RELATION_LABELS[r.kind]}
          </span>
          {r.stake ? (
            <span className="text-sm font-semibold text-[var(--accent)]">{r.stake}</span>
          ) : null}
          {r.voting === false ? (
            <span className="text-[10px] font-medium text-[var(--muted)]">non-voting</span>
          ) : null}
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-snug text-[var(--muted)]">{r.detail}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          {r.sources.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)] underline decoration-dotted underline-offset-2 hover:opacity-80"
            >
              {s.title} ↗
            </a>
          ))}
        </div>
      </div>
      <div className="shrink-0 pt-1 sm:pl-4">
        <FreshnessBadge r={r} />
      </div>
    </li>
  );
}

function CompanyCard({ company }: { company: Entity }) {
  const owners = ownersOf(company.id);
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-[var(--text)]">
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--accent)]"
              >
                {company.name}
              </a>
            ) : (
              company.name
            )}
          </h3>
          <p className="text-xs text-[var(--muted)]">
            {[company.hq, company.founded ? `est. ${company.founded}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {valuationLabel(company.valuationB) ? (
            <span
              title="Approximate valuation (public reporting)"
              className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2 py-0.5 text-[11px] font-bold text-[var(--accent)]"
            >
              {valuationLabel(company.valuationB)}
            </span>
          ) : null}
          {company.sector ? (
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {company.sector.replace("-", " ")}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-sm leading-snug text-[var(--muted)]">{company.blurb}</p>

      <div className="mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Owners &amp; backers
        </div>
        {owners.length ? (
          <ul className="mt-1">
            {owners.map((r) => (
              <OwnerRow key={r.id} r={r} />
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-[var(--muted)]">
            Independent — no outside ownership on record.
          </p>
        )}
      </div>
    </div>
  );
}

export default function OwnershipTable() {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<Entity["sector"] | "all">("all");

  const labs = useMemo(
    () =>
      entities
        .filter((e) => e.kind === "lab")
        .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)),
    [],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return labs.filter((c) => {
      if (sector !== "all" && c.sector !== sector) return false;
      if (!needle) return true;
      if (c.name.toLowerCase().includes(needle)) return true;
      if (c.blurb.toLowerCase().includes(needle)) return true;
      // match on any owner name too
      return ownersOf(c.id).some((r) => entityName(r.from).toLowerCase().includes(needle));
    });
  }, [labs, q, sector]);

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies or backers…"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSector(s.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                sector === s.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((c) => (
          <CompanyCard key={c.id} company={c} />
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">No matches.</p>
      ) : null}
    </section>
  );
}
