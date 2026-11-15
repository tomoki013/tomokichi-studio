// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import { InquiryShare } from "./InquiryShare";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("submits the reviewed browser-masked excerpt and excludes the rest of the ticket", async () => {
  const post = vi.spyOn(api, "post").mockResolvedValue({
    token: "opaque",
    expiresAt: "2026-11-15T01:00:00.000Z",
  });
  render(
    <InquiryShare
      endpoint="/api/inquiry-sharing/example/ticket"
      source={[
        {
          id: "one",
          speaker: "customer",
          text: "山田です。name@example.com ０９０-１２３４-５６７８ 画面が固まります。",
        },
        { id: "two", speaker: "support", text: "非共有の文章" },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "AIへの共有を準備" }));
  fireEvent.click(
    screen.getAllByRole("button", { name: "この発言の共有欄を追加" })[0] as HTMLElement,
  );
  const field = screen.getByRole<HTMLTextAreaElement>("textbox");
  expect(field.value).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "原文から連絡先をマスクして取り込む" }));
  const reviewed = screen.getByRole<HTMLInputElement>("checkbox");
  fireEvent.click(reviewed);
  field.setSelectionRange(0, 2);
  fireEvent.click(screen.getByRole("button", { name: "選択範囲をマスク" }));
  expect(reviewed.checked).toBe(false);
  expect(post).not.toHaveBeenCalled();
  fireEvent.click(reviewed);
  fireEvent.click(screen.getByRole("button", { name: "確認した文章の共有コードを発行" }));
  await waitFor(() =>
    expect(post).toHaveBeenCalledExactlyOnceWith("/api/inquiry-sharing/example/ticket", {
      reviewed: true,
      messages: [
        {
          speaker: "customer",
          text: "[非公開]です。[メールアドレス] [電話番号・識別番号] 画面が固まります。",
        },
      ],
    }),
  );
});
