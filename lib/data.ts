import raw from "@/data/ownership.json";
import type { Entity, OwnershipData, Relationship } from "./types";

export const data = raw as OwnershipData;

export const entities: Entity[] = data.entities;
export const relationships: Relationship[] = data.relationships;

const byId = new Map(entities.map((e) => [e.id, e]));

export function getEntity(id: string): Entity | undefined {
  return byId.get(id);
}

export function entityName(id: string): string {
  return byId.get(id)?.name ?? id;
}

/** Relationships where `id` is the AI company being owned/invested in. */
export function ownersOf(id: string): Relationship[] {
  return relationships.filter((r) => r.to === id);
}

/** Relationships where `id` is the owner/investor. */
export function holdingsOf(id: string): Relationship[] {
  return relationships.filter((r) => r.from === id);
}

/** Days since a row was last human-verified — used for the staleness badge. */
export function verificationAgeDays(r: Relationship, now = new Date()): number {
  const then = new Date(r.verified + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((now.getTime() - then) / 86_400_000));
}

export type Freshness = "fresh" | "aging" | "stale";

export function freshness(r: Relationship, now = new Date()): Freshness {
  const days = verificationAgeDays(r, now);
  if (days <= 180) return "fresh";
  if (days <= 365) return "aging";
  return "stale";
}

/** "Jul 2026" — friendlier than a raw ISO date in the UI. */
export function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export const RELATION_LABELS: Record<Relationship["kind"], string> = {
  controls: "Controls",
  equity: "Equity stake",
  investment: "Investor",
  convertible: "Convertible / notes",
  "acqui-hire": "Acqui-hire",
  licensing: "Licensing + talent",
  subsidiary: "Wholly owned",
  pending: "Pending acquisition",
};
