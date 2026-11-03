import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ApiError } from "../lib/api";
import { DataState } from "./primitives";

it("lets an expired session return through Access using a document navigation", () => {
  render(
    <DataState
      loading={false}
      error={new ApiError("UNAUTHORIZED", "再ログインしてください。", undefined)}
      empty={false}
      emptyMessage=""
    >
      private content
    </DataState>,
  );

  expect(screen.getByRole("link", { name: "再ログイン" })).toHaveAttribute(
    "href",
    window.location.href,
  );
  expect(screen.queryByText("private content")).not.toBeInTheDocument();
});

it("offers a reload for a network failure without mislabeling it as expired authentication", () => {
  render(
    <DataState
      loading={false}
      error={new ApiError("NETWORK_ERROR", "通信できませんでした。", undefined)}
      empty={false}
      emptyMessage=""
    >
      private content
    </DataState>,
  );

  expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "再ログイン" })).not.toBeInTheDocument();
});
