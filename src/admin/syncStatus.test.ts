import { expect, test } from "vitest";
import { combineStatus, type SyncStatus } from "./syncStatus.ts";

test("combineStatus reports saved only when every engine is saved", () => {
    expect(combineStatus("saved", "saved")).toBe("saved");
    expect(combineStatus("saved", "dirty")).toBe("dirty");
});

test("combineStatus never hides a failure behind a healthy engine", () => {
    expect(combineStatus("saved", "error")).toBe("error");
    expect(combineStatus("error", "saving")).toBe("error");
    expect(combineStatus("loading", "error")).toBe("error");
});

test("combineStatus prefers an in-flight state over a settled one", () => {
    expect(combineStatus("saved", "saving")).toBe("saving");
    expect(combineStatus("dirty", "saving")).toBe("saving");
    expect(combineStatus("saved", "loading")).toBe("loading");
});

test("combineStatus handles a single engine and none at all", () => {
    expect(combineStatus("dirty")).toBe("dirty");
    expect(combineStatus(...([] as SyncStatus[]))).toBe("saved");
});
