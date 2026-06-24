import { PlaybookItem, PlaybookItemType } from "@prisma/client";
import { CheckSquare2, CircleHelp, FileText, Lightbulb, ShieldQuestion, Target } from "lucide-react";

import {
  groupPlaybookItems,
  playbookItemLabels,
} from "@/server/services/playbooks";

const icons = {
  KEY_QUESTION: CircleHelp,
  QUALIFICATION_CRITERIA: Target,
  COMMON_OBJECTION: ShieldQuestion,
  SUGGESTED_NEXT_STEP: Lightbulb,
  PROPOSAL_CHECKLIST: CheckSquare2,
  SUGGESTED_DOCUMENT: FileText,
} satisfies Record<PlaybookItemType, typeof CircleHelp>;

export function PlaybookGuide({
  items,
  compact = false,
}: {
  items: PlaybookItem[];
  compact?: boolean;
}) {
  const grouped = groupPlaybookItems(
    items.filter((item) => item.deletedAt === null),
  );

  return (
    <div className={compact ? "space-y-3" : "grid gap-4 lg:grid-cols-2"}>
      {Object.values(PlaybookItemType).map((type) => {
        const typeItems = grouped[type];
        if (typeItems.length === 0) return null;
        const Icon = icons[type];

        return (
          <section
            className="rounded-md border border-slate-200 bg-white p-4"
            key={type}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <h3 className="text-sm font-semibold">
                {playbookItemLabels[type]}
              </h3>
            </div>
            <ul className="mt-3 space-y-3">
              {typeItems.map((item) => (
                <li className="text-sm" key={item.id}>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 whitespace-pre-wrap leading-5 text-slate-600">
                    {item.content}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
