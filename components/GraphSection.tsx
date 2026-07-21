"use client";

import dynamic from "next/dynamic";

// React Flow needs the browser; render the graph client-side only.
const OwnershipGraph = dynamic(() => import("@/components/OwnershipGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[640px] items-center justify-center text-sm text-[var(--muted)]">
      Loading ownership graph…
    </div>
  ),
});

export default function GraphSection() {
  return <OwnershipGraph />;
}
