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

// ---- custom node -----------------------------------------------------------

type NodeData = {
  label: string;
  sub?: string;
  kind: Entity["kind"];
  state: "normal" | "focused" | "dimmed";
};

function EntityNode({ data }: NodeProps) {
  const d = data as NodeData;
  return (
    <div className={`rf-node kind-${d.kind} ${d.state === "dimmed" ? "dimmed" : ""} ${d.state === "focused" ? "focused" : ""}`}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div>{d.label}</div>
      {d.sub ? <div className="rf-node-sub">{d.sub}</div> : null}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { entity: EntityNode };

// ---- edge colours by relationship kind ------------------------------------

const EDGE_COLOR: Record<RelationKind, string> = {
  controls: "#f0a742",
  subsidiary: "#f0a742",
  equity: "#7c8cff",
  convertible: "#7c8cff",
  investment: "#4bb58f",
  "acqui-hire": "#c56bd6",
  licensing: "#c56bd6",
};

// ---- radial layout ---------------------------------------------------------

const KIND_SUB: Record<Entity["kind"], string> = {
  lab: "AI company",
  bigtech: "Big tech",
  investor: "Investor",
  foundation: "Foundation",
};

// half the node footprint, used to centre each node on its computed point
const NODE_HALF_W = 85;
const NODE_HALF_H = 26;

function computeLayout() {
  const labs = entities.filter((e) => e.kind === "lab");
  const backers = entities.filter((e) => e.kind !== "lab");

  // Radii scale with node count so the ring nodes never overlap
  // (arc length per node must clear the ~200px node width).
  const innerR = Math.max(300, Math.round((34 * labs.length) / (Math.PI * 2)) * 6);
  const outerR = innerR + 320;
  const cx = outerR + 120;
  const cy = outerR + 120;

  const pos = new Map<string, { x: number; y: number }>();
  const angle = new Map<string, number>();

  const place = (id: string, r: number, a: number) => {
    pos.set(id, {
      x: cx + r * Math.cos(a) - NODE_HALF_W,
      y: cy + r * Math.sin(a) - NODE_HALF_H,
    });
  };

  labs.forEach((lab, i) => {
    const a = (i / labs.length) * Math.PI * 2 - Math.PI / 2;
    angle.set(lab.id, a);
    place(lab.id, innerR, a);
  });

  // place each backer near the mean angle of the labs it connects to
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
    // nudge apart from already-placed backers at a similar angle
    let guard = 0;
    while (used.some((u) => Math.abs(u - a) < 0.3) && guard++ < 40) a += 0.32;
    used.push(a);
    place(b.id, outerR, a);
  });

  return pos;
}

// ---------------------------------------------------------------------------

export default function OwnershipGraph() {
  const [focus, setFocus] = useState<string | null>(null);
  const layout = useMemo(() => computeLayout(), []);

  // set of entity ids connected to the focused node
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
      entities.map((e) => ({
        id: e.id,
        type: "entity",
        position: layout.get(e.id) ?? { x: 0, y: 0 },
        data: {
          label: e.name,
          sub: KIND_SUB[e.kind],
          kind: e.kind,
          state: !connected
            ? "normal"
            : connected.has(e.id)
              ? e.id === focus
                ? "focused"
                : "normal"
              : "dimmed",
        } satisfies NodeData,
        draggable: true,
      })),
    [layout, connected, focus],
  );

  const edges: Edge[] = useMemo(
    () =>
      relationships.map((r) => {
        const active = !focus || r.from === focus || r.to === focus;
        return {
          id: r.id,
          source: r.from,
          target: r.to,
          label: r.stake,
          animated: active && (r.kind === "controls" || r.kind === "subsidiary"),
          style: {
            stroke: EDGE_COLOR[r.kind],
            strokeWidth: active ? 2 : 1,
            opacity: active ? 0.9 : 0.08,
          },
          labelStyle: { fill: "#c9cee0", fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: "#12141d", opacity: active ? 0.9 : 0 },
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
    <div style={{ width: "100%", height: 640 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => setFocus(null)}
        fitView
        proOptions={{ hideAttribution: false }}
        minZoom={0.4}
        maxZoom={1.6}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#232838" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
