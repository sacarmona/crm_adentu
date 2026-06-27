"use client";

import { useState } from "react";

export function ExpandableBody({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <p
        className={`whitespace-pre-wrap text-sm leading-6 text-slate-700 ${
          expanded ? "" : "line-clamp-[6]"
        }`}
      >
        {text}
      </p>
      <button
        className="mt-2 text-xs font-medium text-emerald-700 hover:underline"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        {expanded ? "Ver menos" : "Ver completo"}
      </button>
    </div>
  );
}
