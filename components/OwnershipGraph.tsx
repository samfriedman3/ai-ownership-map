"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { entities, relationships } from "@/lib/data";
import type { Entity, RelationKind } from "@/lib/types";

// A two-column "who owns whom" flow: backers on the left, AI companies on the
// right, read left → right. Companies are ordered largest-first; backers are
// ordered by the average position of what they own, which keeps the connecting
// lines from crossing into a hairball.

const NODE_W = 244;
const ROW_H = 78;
const COL_GAP = 880;

const EDGE_COLOR: Record<RelationKind, string> = {
  controls: "#9a6a2f",
  subsidiary: "#9a6a2f",
  equity: "#1b4f8a",
  convertible: "#1b4f8a",
  investment: "#3e7c6a",
  "acqui-hire": "#8c4a5f",
  licensing: "#8c4a5f",
};

function fontFor(weight = 20) {
  const t = Math.max(0, Math.min(1, (weight - 16) / (100 - 16)));
  return +(12.5 + t * 4).toFixed(2); // 12.5 → 16.5px
}

function valuationLabel(v?: number): string | undefined {
  if (v == null) return undefined;
  if (v >= 1000) return `~$${(v / 1000).toFixed(1)}T`;
  return `~$${v}B`;
}

// ---- nodes -----------------------------------------------------------------

type NodeData = {
  label: string;
  meta?: string;
  kind: Entity["kind"];
  fontSize: number;
  state: "normal" | "focused" | "dimmed";
};

function EntityNode({ data }: NodeProps) {
  const d = data as NodeData;
  return (
    <div
      className={`rf-node kind-${d.kind} ${d.state === "dimmed" ? "dimmed" : ""} ${d.state === "focused" ? "focused" : ""}`}
      style={{ width: NODE_W, fontSize: d.fontSize }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div>{d.label}</div>
      {d.meta ? <div className="rf-node-sub">{d.meta}</div> : null}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

function HeaderNode({ data }: NodeProps) {
  const d = data as { label: string };
  return <div className="rf-col-header">{d.label}</div>;
}

const nodeTypes = { entity: EntityNode, header: HeaderNode };

// ---------------------------------------------------------------------------

export default function OwnershipGraph() {
  const [focus, setFocus] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const { nodes, edges, hiddenCount } = useMemo(() => {
    const allLabs = entities
      .filter((e) => e.kind === "lab")
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

    const labs = showAll ? allLabs : allLabs.slice(0, 8);
    const labIds = new Set(labs.map((l) => l.id));

    const rels = relationships.filter((r) => labIds.has(r.to));
    const backerIds = new Set(rels.map((r) => r.from));
    const backers = entities.filter((e) => backerIds.has(e.id));

    // right column: largest company at top
    const labRow = new Map(labs.map((l, i) => [l.id, i]));

    // left column: order backers by the mean row of what they own,
    // which minimises line crossings
    const scored = backers.map((b) => {
      const rows = rels
        .filter((r) => r.from === b.id)
        .map((r) => labRow.get(r.to) ?? 0);
      const mean = rows.reduce((s, v) => s + v, 0) / (rows.length || 1);
      return { b, mean, ties: rows.length };
    });
    scored.sort((x, y) => x.mean - y.mean || y.ties - x.ties);

    // vertically centre the two columns against each other
    const labsH = (labs.length - 1) * ROW_H;
    const backH = (scored.length - 1) * ROW_H;
    const mid = Math.max(labsH, backH) / 2;
    const labY0 = mid - labsH / 2;
    const backY0 = mid - backH / 2;

    const connected = focus
      ? new Set<string>([
          focus,
          ...rels.filter((r) => r.from === focus).map((r) => r.to),
          ...rels.filter((r) => r.to === focus).map((r) => r.from),
        ])
      : null;

    const stateOf = (id: string): NodeData["state"] =>
      !connected ? "normal" : connected.has(id) ? (id === focus ? "focused" : "normal") : "dimmed";

    const n: Node[] = [
      {
        id: "__h_backers",
        type: "header",
        position: { x: 0, y: -78 },
        data: { label: "Owners & investors" },
        draggable: false,
        selectable: false,
      },
      {
        id: "__h_companies",
        type: "header",
        position: { x: COL_GAP, y: -78 },
        data: { label: "AI companies" },
        draggable: false,
        selectable: false,
      },
      ...scored.map(({ b }, i) => ({
        id: b.id,
        type: "entity",
        position: { x: 0, y: backY0 + i * ROW_H },
        data: {
          label: b.name,
          meta: b.kind === "investor" ? "Investor" : b.kind === "foundation" ? "Foundation" : "Big tech",
          kind: b.kind,
          fontSize: fontFor(b.weight),
          state: stateOf(b.id),
        } satisfies NodeData,
        draggable: true,
      })),
      ...labs.map((l, i) => ({
        id: l.id,
        type: "entity",
        position: { x: COL_GAP, y: labY0 + i * ROW_H },
        data: {
          label: l.name,
          meta: valuationLabel(l.valuationB) ?? "private",
          kind: l.kind,
          fontSize: fontFor(l.weight),
          state: stateOf(l.id),
        } satisfies NodeData,
        draggable: true,
      })),
    ];

    const e: Edge[] = rels.map((r) => {
      const touches = focus === r.from || focus === r.to;
      const active = !focus || touches;
      return {
        id: r.id,
        source: r.from,
        target: r.to,
        type: "bezier",
        label: touches ? r.stake : undefined,
        animated: touches && (r.kind === "controls" || r.kind === "subsidiary"),
        style: {
          stroke: EDGE_COLOR[r.kind],
          strokeWidth: active ? 2.2 : 1.2,
          opacity: active ? 0.8 : 0.1,
        },
        labelStyle: { fill: "#14181f", fontSize: 11, fontWeight: 700 },
        labelBgStyle: { fill: "#ffffff", opacity: 0.97, stroke: "#e4e1da" },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 3,
        labelShowBg: true,
      } satisfies Edge;
    });

    return { nodes: n, edges: e, hiddenCount: allLabs.length - labs.length };
  }, [focus, showAll]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) =>
      setFocus((cur) => (node.id.startsWith("__h") ? cur : cur === node.id ? null : node.id)),
    [],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] bg-[var(--paper)] px-4 py-3">
        <p className="text-[12px] text-[var(--muted)]">
          {focus
            ? "Isolating one entity's ties — click it again, or the background, to reset."
            : "Ownership flows left → right. Click any box to isolate its ties."}
        </p>
        <div className="flex overflow-hidden rounded-sm border border-[var(--rule-strong)]">
          <button
            onClick={() => setShowAll(false)}
            className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition ${!showAll ? "bg-[var(--navy)] text-white" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"}`}
          >
            Largest 8
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`border-l border-[var(--rule-strong)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition ${showAll ? "bg-[var(--navy)] text-white" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"}`}
          >
            All {hiddenCount > 0 ? `+${hiddenCount}` : ""}
          </button>
        </div>
      </div>

      <div className="h-[clamp(620px,86vh,1040px)] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => setFocus(null)}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.25}
          maxZoom={1.6}
          nodesConnectable={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="#e0ddd5" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
