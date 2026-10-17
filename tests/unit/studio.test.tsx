import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Studio } from "../../src/app/components/Studio.tsx";

describe("Studio", () => {
  it("exposes test ids for interactive controls", () => {
    render(<Studio />);
    expect(screen.getByTestId("studio__play")).toBeTruthy();
    expect(screen.getByTestId("studio__persona")).toBeTruthy();
    expect(screen.getByTestId("studio__palette")).toBeTruthy();
    expect(screen.getByTestId("studio__cadence")).toBeTruthy();
  });
});
