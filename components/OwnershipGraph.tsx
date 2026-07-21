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

// ---- size hierarchy --------------------------------------------------------
// Bigger / more prominent companies render as larger nodes.

function sizeFor(weight = 20) {
  const t = Math.max(0, Math.min(1, (weight - 16) / (100 - 16)));
  const width = Math.round(158 + t * 116); // 158 → 274px
  const fontSize = +(14 + t * 5).toFixed(2); // 14 → 19px
  const halfH = 28 + t * 10;
  return { width, fontSize, halfW: width / 2, halfH };
}

// ---- custom node -----------------------------------------------------------

type NodeData = {
  label: string;
  sub?: string;
  valuation?: string;
  kind: Entity["kind"];
  width: number;
  fontSize: number;
  state: "normal" | "focused" | "dimmed";
};

function EntityNode({ data }: NodeProps) {
  const d = data as NodeData;
  return (
    <div
      className={`rf-node kind-${d.kind} ${d.state === "dimmed" ? "dimmed" : ""} ${d.state === "focused" ? "focused" : ""}`}
      style={{ width: d.width, fontSize: d.fontSize }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div>{d.label}</div>
      {d.sub ? <div className="rf-node-sub">{d.sub}</div> : null}
      {d.valuation ? <div className="rf-node-val">{d.valuation}</div> : null}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { entity: EntityNode };

// ---- edge colours by relationship kind ------------------------------------

const EDGE_COLOR: Record<RelationKind, string> = {
  controls: "#d98a1f",
  subsidiary: "#d98a1f",
  equity: "#4f5bd5",
  convertible: "#4f5bd5",
  investment: "#159a6b",
  "acqui-hire": "#b5449e",
  licensing: "#b5449e",
};

const KIND_SUB: Record<Entity["kind"], string> = {
  lab: "AI company",
  bigtech: "Big tech",
  investor: "Investor",
  foundation: "Foundation",
};

function valuationLabel(v?: number): string | undefined {
  if (v == null) return undefined;
  if (v >= 1000) return `~$${(v / 1000).toFixed(1)}T`;
  return `~$${v}B`;
}

// ---- radial layout ---------------------------------------------------------
// AI companies form an inner ring, ordered by size with the largest at the top
// (12 o'clock) and descending clockwise; backers sit on an outer ring near the
// companies they're tied to.

function computeLayout() {
  const labs = entities
    .filter((e) => e.kind === "lab")
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  const backers = entities.filter((e) => e.kind !== "lab");

  // Enough radius that even the largest nodes don't collide on the ring.
  const innerR = Math.max(360, Math.ceil((250 * labs.length) / (2 * Math.PI)));
  const outerR = innerR + 300;
  const cx = outerR + 180;
  const cy = outerR + 180;

  const pos = new Map<string, { x: number; y: number }>();
  const angle = new Map<string, number>();

  const place = (e: Entity, r: number, a: number) => {
    const { halfW, halfH } = sizeFor(e.weight);
    pos.set(e.id, { x: cx + r * Math.cos(a) - halfW, y: cy + r * Math.sin(a) - halfH });
  };

  labs.forEach((lab, i) => {
    const a = (i / labs.length) * Math.PI * 2 - Math.PI / 2; // start at top
    angle.set(lab.id, a);
    place(lab, innerR, a);
  });

  const used: number[] = [];
  backers.forEach((b, i) => {
    const targets = relationships
      .filter((r) => r.from === b.id)
      .map((r) => angle.get(r.to))
      .filter((v): v is number => v !== undefined);
    let a: number;
    if (targets.length) {
      const sx = targets.reduce((s, t) => s + Math.cos(t), 0);
      const sy = targets.reduce((s, t) => s + Math.sin(t), 0);
      a = Math.atan2(sy, sx);
    } else {
      a = (i / backers.length) * Math.PI * 2;
    }
    let guard = 0;
    while (used.some((u) => Math.abs(u - a) < 0.28) && guard++ < 40) a += 0.3;
    used.push(a);
    place(b, outerR, a);
  });

  return pos;
}

// ---------------------------------------------------------------------------

export default function OwnershipGraph() {
  const [focus, setFocus] = useState<string | null>(null);
  const layout = useMemo(() => computeLayout(), []);

  const connected = useMemo(() => {
    if (!focus) return null;
    const s = new Set<string>([focus]);
    for (const r of relationships) {
      if (r.from === focus) s.add(r.to);
      if (r.to === focus) s.add(r.from);
    }
    return s;
  }, [focus]);

  const nodes: Node[] = useMemo(
    () =>
      entities.map((e) => {
        const { width, fontSize } = sizeFor(e.weight);
        return {
          id: e.id,
          type: "entity",
          position: layout.get(e.id) ?? { x: 0, y: 0 },
          data: {
            label: e.name,
            sub: KIND_SUB[e.kind],
            valuation: e.kind === "lab" ? valuationLabel(e.valuationB) : undefined,
            kind: e.kind,
            width,
            fontSize,
            state: !connected
              ? "normal"
              : connected.has(e.id)
                ? e.id === focus
                  ? "focused"
                  : "normal"
                : "dimmed",
          } satisfies NodeData,
          draggable: true,
        };
      }),
    [layout, connected, focus],
  );

  const edges: Edge[] = useMemo(
    () =>
      relationships.map((r) => {
        const touches = focus === r.from || focus === r.to;
        const active = !focus || touches;
        return {
          id: r.id,
          source: r.from,
          target: r.to,
          // Only label ties for the focused node — keeps the default view clean.
          label: touches ? r.stake : undefined,
          animated: touches && (r.kind === "controls" || r.kind === "subsidiary"),
          style: {
            stroke: EDGE_COLOR[r.kind],
            strokeWidth: active ? 2.2 : 1,
            opacity: active ? 0.85 : 0.12,
          },
          labelStyle: { fill: "#1a1e2e", fontSize: 11, fontWeight: 700 },
          labelBgStyle: { fill: "#ffffff", opacity: 0.96 },
          labelBgPadding: [5, 3],
          labelBgBorderRadius: 5,
          labelShowBg: true,
        } satisfies Edge;
      }),
    [focus],
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => setFocus((cur) => (cur === node.id ? null : node.id)),
    [],
  );

  return (
    <div style={{ width: "100%", height: 660 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => setFocus(null)}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        proOptions={{ hideAttribution: false }}
        minZoom={0.3}
        maxZoom={1.6}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#d7dced" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
