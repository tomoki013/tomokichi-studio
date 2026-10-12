import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { ActivityList } from "./ActivityList";

it("explains the previous and new master setting, while accepting older audit entries", () => {
  const entry = {
    id: "one",
    actorType: "admin" as const,
    action: "ticket.settings_updated",
    targetType: "system" as const,
    targetId: "group",
    createdAt: "2026-10-12T00:00:00.000Z",
  };
  render(
    <MemoryRouter>
      <ActivityList
        entries={[
          {
            ...entry,
            metadata: {
              kind: "group",
              from: { name: "Before", is_active: 1 },
              to: { name: "After", is_active: 0 },
            },
          },
          { ...entry, id: "old", metadata: { kind: "group" } },
        ]}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByText("変更前: 名前: Before / 有効: 有効 → 変更後: 名前: After / 有効: 無効"),
  ).toBeVisible();
  expect(screen.getAllByText("チケットのマスタ設定を更新")).toHaveLength(2);
});
