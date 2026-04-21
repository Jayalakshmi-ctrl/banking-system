import { describe, it, expect } from "vitest";
import {
  canStaffReopen,
  nextStaffStatus,
} from "./complaintWorkflow";

describe("nextStaffStatus", () => {
  it("moves pending to in_progress", () => {
    expect(nextStaffStatus("pending")).toBe("in_progress");
  });
  it("moves in_progress to resolved", () => {
    expect(nextStaffStatus("in_progress")).toBe("resolved");
  });
  it("returns null when no transition", () => {
    expect(nextStaffStatus("resolved")).toBeNull();
  });
});

describe("canStaffReopen", () => {
  it("is true only for resolved", () => {
    expect(canStaffReopen("resolved")).toBe(true);
    expect(canStaffReopen("pending")).toBe(false);
    expect(canStaffReopen("in_progress")).toBe(false);
    expect(canStaffReopen("completed")).toBe(false);
  });
});
