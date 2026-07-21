"use client";

import { useMemo, useState } from "react";
import {
  entities,
  entityName,
  freshness,
  ownersOf,
  RELATION_LABELS,
  shortDate,
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

// Fresh rows stay visually silent; only aging/stale rows draw the eye.
const FRESH_STYLE: Record<string, string> = {
  fresh: "border-transparent text-[var(--muted)]",
  aging: "border-amber-600/40 bg-amber-50 text-amber-800",
  stale: "border-rose-600/40 bg-rose-50 text-rose-800",
};

function valuationLabel(v?: number): string | null {
  if (v == null) return null;
  if (v >= 1000) return `~$${(v / 1000).toFixed(1)}T`;
  return `~$${v}B`;
}

function FreshnessBadge({ r }: { r: Relationship }) {
  const f = freshness(r);
  const days = verificationAgeDays(r);
  const prefix = f === "fresh" ? "✓" : f === "aging" ? "aging ·" : "recheck ·";
  return (
    <span
      title={`Last verified ${r.verified} (${days} days ago)`}
      className={`tnum inline-block whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${FRESH_STYLE[f]}`}
    >
      {prefix} {shortDate(r.verified)}
    </span>
  );
}

function OwnerRow({ r }: { r: Relationship }) {
  return (
    <li className="border-t border-[var(--rule)] py-3 first:border-t-0 first:pt-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-[15px] font-bold text-[var(--ink)]">
              {entityName(r.from)}
            </span>
            <span className="eyebrow !text-[10px] !tracking-[0.1em]">
              {RELATION_LABELS[r.kind]}
            </span>
            {r.stake ? (
              <span className="tnum text-[14px] font-bold text-[var(--navy)]">{r.stake}</span>
            ) : null}
            {r.voting === false ? (
              <span className="text-[11px] font-medium text-[var(--muted)]">non-voting</span>
            ) : null}
          </div>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-[1.55] text-[var(--ink-2)]">
            {r.detail}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {r.sources.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11.5px] text-[var(--navy)] underline decoration-[var(--rule-strong)] hover:decoration-[var(--navy)]"
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>
        <div className="shrink-0 pt-0.5">
          <FreshnessBadge r={r} />
        </div>
      </div>
    </li>
  );
}

function CompanyCard({ company }: { company: Entity }) {
  const owners = ownersOf(company.id);
  const val = valuationLabel(company.valuationB);
  return (
    <article className="rounded-sm border border-[var(--rule)] bg-[var(--paper)] p-5 shadow-[0_1px_3px_rgba(20,24,31,0.05)]">
      <header className="border-b border-[var(--rule-strong)] pb-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="display text-[22px] text-[var(--ink)]">
            {company.website ? (
              <a href={company.website} target="_blank" rel="noreferrer" className="hover:text-[var(--navy)]">
                {company.name}
              </a>
            ) : (
              company.name
            )}
          </h3>
          {val ? (
            <div className="text-right">
              <div className="tnum text-[17px] font-bold leading-none text-[var(--bronze)]">
                {val}
              </div>
              <div className="eyebrow mt-1 !text-[9px]">Valuation</div>
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[var(--muted)]">
          {company.sector ? (
            <span className="eyebrow !text-[10px]">{company.sector.replace("-", " ")}</span>
          ) : null}
          <span>
            {[company.hq, company.founded ? `est. ${company.founded}` : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      </header>

      <p className="mt-3 text-[13px] leading-[1.6] text-[var(--ink-2)]">{company.blurb}</p>

      <div className="mt-4">
        <div className="eyebrow">Owners &amp; backers</div>
        {owners.length ? (
          <ul className="mt-2">
            {owners.map((r) => (
              <OwnerRow key={r.id} r={r} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-[var(--ink-2)]">
            Independent — no outside ownership on record.
          </p>
        )}
      </div>
    </article>
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
      return ownersOf(c.id).some((r) => entityName(r.from).toLowerCase().includes(needle));
    });
  }, [labs, q, sector]);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies or backers…"
          className="w-full rounded-sm border border-[var(--rule-strong)] bg-[var(--paper)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--navy)] sm:max-w-xs"
        />
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-[var(--rule-strong)]">
          {SECTORS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSector(s.id)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${i > 0 ? "border-l border-[var(--rule-strong)]" : ""} ${
                sector === s.id
                  ? "bg-[var(--navy)] text-white"
                  : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {filtered.map((c) => (
          <CompanyCard key={c.id} company={c} />
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-[13px] text-[var(--muted)]">No matches.</p>
      ) : null}
    </section>
  );
}
