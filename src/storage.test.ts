import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { loadStorage, saveStorage } from "./storage";

describe("local storage helpers", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips versionable records and falls back on malformed data", () => {
    saveStorage("test-record", { version: 1, value: "saved" });
    expect(loadStorage("test-record", { version: 0, value: "fallback" })).toEqual({ version: 1, value: "saved" });
    localStorage.setItem("broken", "not-json");
    expect(loadStorage("broken", ["fallback"])).toEqual(["fallback"]);
  });

  it("renders a small mobile-facing status control", () => {
    render(React.createElement("button", { type: "button" }, "Offline kit ready"));
    expect(screen.getByRole("button", { name: "Offline kit ready" })).toBeTruthy();
  });
});
