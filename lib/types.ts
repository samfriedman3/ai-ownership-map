// Data model for the AI Ownership Map.
//
// Two collections drive the whole app:
//   - `entities`      — every company/lab/investor/foundation shown as a node
//   - `relationships` — a directed edge (owner/investor) -> (AI company)
//
// Everything is plain JSON so the semi-automated monitor (and a human reviewer)
// can propose edits as a normal diff / pull request. See data/ownership.json.

export type EntityKind =
  | "lab" // builds frontier/foundation models (OpenAI, Anthropic, Mistral…)
  | "bigtech" // large public tech company that also invests (Microsoft, Google…)
  | "investor" // VC / sovereign fund / strategic investor
  | "foundation"; // non-profit / controlling foundation

export type Sector =
  | "frontier" // building the largest general models
  | "open-source" // open-weight focus
  | "specialist" // narrow domain: voice, images, search, data, coding…
  | "infrastructure" // chips, data, compute
  | "platform"; // big tech platform owner

export interface Entity {
  id: string;
  name: string;
  kind: EntityKind;
  sector?: Sector;
  blurb: string;
  hq?: string;
  founded?: number;
  website?: string;
  /** Prominence score (roughly 15–100) driving node size and default sort order. */
  weight?: number;
  /** Approximate valuation in USD billions, where publicly known. Display only. */
  valuationB?: number;
}

// How a `from` entity relates to a `to` company.
export type RelationKind =
  | "controls" // majority / governance control
  | "equity" // holds an equity stake (may be minority)
  | "investment" // has invested capital (round participation)
  | "convertible" // convertible notes / SAFEs
  | "acqui-hire" // absorbed the team / key talent
  | "licensing" // tech-licensing + talent deal (e.g. Character.AI, Inflection)
  | "subsidiary" // wholly-owned part of the parent
  | "pending"; // announced/agreed acquisition not yet closed (no control until close)

export interface Source {
  title: string;
  url: string;
}

export interface Relationship {
  id: string;
  from: string; // entity id of the owner / investor
  to: string; // entity id of the AI company
  kind: RelationKind;
  /** Human-readable stake, e.g. "27%", "49% (non-voting)", "up to $40B". */
  stake?: string;
  /** Whether the stake carries voting power. `false` flags a non-voting stake. */
  voting?: boolean;
  /** One-line description of the deal / relationship. */
  detail: string;
  /** ISO date (YYYY-MM-DD) the deal was struck / last materially changed. */
  asOf: string;
  /** ISO date a human last verified this row against the sources. */
  verified: string;
  sources: Source[];
}

export interface OwnershipData {
  /** ISO timestamp the dataset was last updated. */
  updatedAt: string;
  entities: Entity[];
  relationships: Relationship[];
}
