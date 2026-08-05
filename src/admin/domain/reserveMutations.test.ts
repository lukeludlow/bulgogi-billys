import { expect, test } from "vitest";
import { DEFAULT_RECORDS } from "@/test/fixtures/defaultSettings.ts";
import {
    addTransfer,
    recordWeeklyTransfers,
    removeTransfer,
    updateTransfer,
} from "@/admin/domain/reserveMutations.ts";
import type {
    OperatingRecords,
    ReserveTransfer,
} from "@/admin/domain/types.ts";

function withTransfers(transfers: ReserveTransfer[]): OperatingRecords {
    return { ...DEFAULT_RECORDS, reserveTransfers: transfers };
}

const EXISTING: ReserveTransfer = {
    id: "r1",
    date: "2026-07-19",
    fund: "emergency",
    amount: 500,
    note: "Opening balance",
};

test("addTransfer appends a row with a fresh id", () => {
    const state = withTransfers([EXISTING]);

    const next = addTransfer(state, {
        date: "2026-07-26",
        fund: "expansion",
        amount: 12.5,
    });

    expect(next.reserveTransfers).toHaveLength(2);
    const added = next.reserveTransfers[1];
    expect(added).toMatchObject({
        date: "2026-07-26",
        fund: "expansion",
        amount: 12.5,
    });
    expect(added.id).toBeTruthy();
    expect(added.id).not.toBe(EXISTING.id);
    // The original object is untouched — callers rely on immutable updates.
    expect(state.reserveTransfers).toHaveLength(1);
});

test("updateTransfer patches only the row with that id", () => {
    const other: ReserveTransfer = {
        id: "r2",
        date: "2026-07-26",
        fund: "expansion",
        amount: 10,
    };
    const state = withTransfers([EXISTING, other]);

    const next = updateTransfer(state, "r2", { amount: -4 });

    expect(next.reserveTransfers[0]).toEqual(EXISTING);
    expect(next.reserveTransfers[1].amount).toBe(-4);
    expect(next.reserveTransfers[1].fund).toBe("expansion");
});

test("updateTransfer with an unknown id changes nothing", () => {
    const state = withTransfers([EXISTING]);
    expect(
        updateTransfer(state, "ghost", { amount: 1 }).reserveTransfers,
    ).toEqual([EXISTING]);
});

test("removeTransfer deletes by id", () => {
    const state = withTransfers([EXISTING]);
    expect(removeTransfer(state, "r1").reserveTransfers).toEqual([]);
    expect(removeTransfer(state, "ghost").reserveTransfers).toEqual([EXISTING]);
});

test("recordWeeklyTransfers writes both deposits dated on the week's Sunday", () => {
    const next = recordWeeklyTransfers(withTransfers([]), "2026-07-26", {
        emergency: 0.6,
        expansion: 0.4,
    });

    expect(next.reserveTransfers).toHaveLength(2);
    expect(next.reserveTransfers[0]).toMatchObject({
        date: "2026-07-26",
        fund: "emergency",
        amount: 0.6,
        note: "Weekly transfer",
    });
    expect(next.reserveTransfers[1]).toMatchObject({
        date: "2026-07-26",
        fund: "expansion",
        amount: 0.4,
    });
});

test("recordWeeklyTransfers skips a fund with nothing to transfer", () => {
    const next = recordWeeklyTransfers(withTransfers([]), "2026-07-26", {
        emergency: 0,
        expansion: 0,
    });
    expect(next.reserveTransfers).toEqual([]);
});
