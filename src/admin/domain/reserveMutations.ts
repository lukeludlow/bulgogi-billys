// Pure edits to the reserve ledger. Every function takes the current
// OperatingRecords and returns a new one, the same contract as
// eventMutations.ts — components apply these through setRecords; nothing here
// knows about React or persistence.

import { newId } from "@/admin/domain/settingsMutations.ts";
import {
    RESERVE_FUNDS,
    type OperatingRecords,
    type ReserveFund,
    type ReserveTransfer,
} from "@/admin/domain/types.ts";

/** Append one transfer — a deposit, or a withdrawal when amount is negative. */
export function addTransfer(
    records: OperatingRecords,
    transfer: Omit<ReserveTransfer, "id">,
): OperatingRecords {
    return {
        ...records,
        reserveTransfers: [
            ...records.reserveTransfers,
            { id: newId(), ...transfer },
        ],
    };
}

/** Patch the transfer with this id; a no-op if there isn't one. */
export function updateTransfer(
    records: OperatingRecords,
    id: string,
    patch: Partial<Omit<ReserveTransfer, "id">>,
): OperatingRecords {
    return {
        ...records,
        reserveTransfers: records.reserveTransfers.map((transfer) =>
            transfer.id === id ? { ...transfer, ...patch } : transfer,
        ),
    };
}

export function removeTransfer(
    records: OperatingRecords,
    id: string,
): OperatingRecords {
    return {
        ...records,
        reserveTransfers: records.reserveTransfers.filter(
            (transfer) => transfer.id !== id,
        ),
    };
}

/**
 * Record the week's prescribed transfers in one edit, dated on the week's
 * Sunday — inside the week, so `transfersRecorded` sees them. A fund whose
 * amount rounds to nothing (an empty week) gets no row.
 */
export function recordWeeklyTransfers(
    records: OperatingRecords,
    weekEnd: string,
    amounts: Record<ReserveFund, number>,
): OperatingRecords {
    let next = records;
    for (const fund of RESERVE_FUNDS) {
        if (amounts[fund] <= 0) continue;
        next = addTransfer(next, {
            date: weekEnd,
            fund,
            amount: amounts[fund],
            note: "Weekly transfer",
        });
    }
    return next;
}
