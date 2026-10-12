import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Deliveries } from "./Deliveries";

let role = "operator",
  posted: string[],
  done = false;
const at = "2026-10-12T00:00:00.000Z";
beforeEach(() => {
  role = "operator";
  posted = [];
  done = false;
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), "https://admin.example.com").pathname;
    if (init?.method === "POST") {
      posted.push(path);
      done = true;
      return Response.json({ ok: true, data: {} });
    }
    if (path === "/api/session") return Response.json({ ok: true, data: { role } });
    return Response.json({
      ok: true,
      data: {
        items: [
          ...(!done
            ? [
                {
                  id: "queue/one",
                  projectId: "one",
                  projectName: "Orbit",
                  kind: "inbound_email",
                  state: "failed",
                  attempts: 8,
                  lastError: "MAIL_INGEST_FAILED",
                  nextAttemptAt: at,
                  createdAt: at,
                  updatedAt: at,
                },
              ]
            : []),
          {
            id: "expired",
            projectId: "two",
            projectName: "Prism",
            kind: "inbound_email",
            state: "failed",
            attempts: 8,
            lastError: "MAIL_EXPIRED",
            nextAttemptAt: at,
            createdAt: at,
            updatedAt: at,
          },
        ],
        total: done ? 1 : 2,
      },
    });
  });
});
afterEach(() => vi.unstubAllGlobals());
function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
    >
      <Deliveries />
    </QueryClientProvider>,
  );
}
it("shows projects and reasons, and allows an operator to retry only a retained mail", async () => {
  mount();
  await screen.findByText("Orbit");
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: "再処理する" })).toHaveLength(2),
  );
  const buttons = screen.getAllByRole("button", { name: "再処理する" });
  expect(buttons[1]).toBeDisabled();
  expect(screen.getByText("原本の保持期限を過ぎました")).toBeVisible();
  await userEvent.setup().click(buttons[0]!);
  expect(await screen.findByRole("status")).toHaveTextContent("再処理を予約しました。");
  expect(posted).toEqual(["/api/deliveries/queue%2Fone/retry"]);
  await waitFor(() => expect(screen.queryByText("Orbit")).not.toBeInTheDocument());
});
it("lets viewers inspect failures without exposing retry controls", async () => {
  role = "viewer";
  mount();
  await screen.findByText("Orbit");
  expect(screen.queryByRole("button", { name: "再処理する" })).not.toBeInTheDocument();
  expect(posted).toEqual([]);
});
