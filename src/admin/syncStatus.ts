/**
 * Where the last edit stands relative to the database. Lives here rather than
 * on a context because more than one sync engine reports one.
 */
export type SyncStatus = "loading" | "saving" | "saved" | "dirty" | "error";
