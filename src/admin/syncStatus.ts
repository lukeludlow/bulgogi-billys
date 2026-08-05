/**
 * Where the last edit stands relative to the database. Lives here rather than
 * on a context because more than one sync engine reports one.
 */
export type SyncStatus = "loading" | "saving" | "saved" | "dirty" | "error";

// Worst state wins, so a failing save is never hidden by a healthy one and
// "saved" only shows once every engine is actually saved.
const PRECEDENCE: SyncStatus[] = [
    "error",
    "loading",
    "saving",
    "dirty",
    "saved",
];

/** One status for the status bar out of the engines that each report one. */
export function combineStatus(...statuses: SyncStatus[]): SyncStatus {
    return PRECEDENCE.find((status) => statuses.includes(status)) ?? "saved";
}
