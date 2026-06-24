import { PlaybookItemType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { groupPlaybookItems, playbookItemLabels } from "./playbooks";

describe("playbooks", () => {
  it("groups items by commercial purpose", () => {
    const items = [
      { id: "1", type: PlaybookItemType.KEY_QUESTION },
      { id: "2", type: PlaybookItemType.COMMON_OBJECTION },
      { id: "3", type: PlaybookItemType.KEY_QUESTION },
    ];
    const grouped = groupPlaybookItems(items);

    expect(grouped.KEY_QUESTION).toHaveLength(2);
    expect(grouped.COMMON_OBJECTION).toHaveLength(1);
    expect(grouped.PROPOSAL_CHECKLIST).toHaveLength(0);
  });

  it("provides a visible label for every enum value", () => {
    for (const type of Object.values(PlaybookItemType)) {
      expect(playbookItemLabels[type]).toBeTruthy();
    }
  });
});
