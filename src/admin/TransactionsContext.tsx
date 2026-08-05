import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import DataGate from "@/admin/components/DataGate.tsx";
import {
    fetchAllTransactions,
    importTransactions as persistTransactions,
} from "@/admin/data/transactions.ts";
import {
    mergeTransactions,
    type MergeResult,
} from "@/admin/import/mergeTransactions.ts";
import type { Transaction } from "@/admin/domain/types.ts";

interface TransactionsContextValue {
    /** Newest first; loaded once per session, appended to by imports. */
    transactions: Transaction[];
    /**
     * Persist a parsed batch: writes the genuinely new rows (existing ids
     * always win, like re-importing an export), then merges them into
     * memory. Resolves with the dedupe counts; rejects with state untouched.
     */
    importTransactions: (incoming: Transaction[]) => Promise<MergeResult>;
}

interface InternalValue {
    transactions: Transaction[] | null;
    loadError: boolean;
    retry: () => void;
    importTransactions: (incoming: Transaction[]) => Promise<MergeResult>;
}

const TransactionsContext = createContext<InternalValue | null>(null);

/**
 * Holds the transaction history shared by every admin page. Deliberately
 * does NOT gate its children: rendering them immediately lets the settings
 * fetch start in parallel with this one (the two biggest loads), matching
 * the latency of the old single fetchSettings. TransactionsGate below does
 * the gating, inside SettingsProvider.
 */
export function TransactionsProvider({ children }: { children: ReactNode }) {
    const [transactions, setTransactions] = useState<Transaction[] | null>(
        null,
    );
    const [loadError, setLoadError] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);

    // Import merges against what's actually loaded, not a stale closure.
    const latest = useRef<Transaction[] | null>(null);
    useEffect(() => {
        latest.current = transactions;
    }, [transactions]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const loaded = await fetchAllTransactions();
                if (!cancelled) setTransactions(loaded);
            } catch {
                if (!cancelled) setLoadError(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [loadAttempt]);

    const importTransactions = useCallback(
        async (incoming: Transaction[]): Promise<MergeResult> => {
            const current = latest.current ?? [];
            const merge = mergeTransactions(current, incoming);
            const existingIds = new Set(current.map((txn) => txn.id));
            const newRows = merge.transactions.filter(
                (txn) => !existingIds.has(txn.id),
            );
            if (newRows.length > 0) {
                await persistTransactions(newRows);
                // Functional re-merge so rows landed by a concurrent import
                // survive. A post-unmount call is a React no-op.
                setTransactions(
                    (prev) =>
                        mergeTransactions(prev ?? [], incoming).transactions,
                );
            }
            return merge;
        },
        [],
    );

    return (
        <TransactionsContext.Provider
            value={{
                transactions,
                loadError,
                retry: () => {
                    setLoadError(false);
                    setLoadAttempt((n) => n + 1);
                },
                importTransactions,
            }}
        >
            {children}
        </TransactionsContext.Provider>
    );
}

/**
 * Blocks rendering until the transaction history has loaded, with the same
 * loading/error UI as SettingsProvider so the two gates are visually one.
 * Pages under this gate can rely on useTransactions being non-null.
 */
export function TransactionsGate({ children }: { children: ReactNode }) {
    const value = useContext(TransactionsContext);
    if (!value) {
        throw new Error(
            "TransactionsGate must be used inside a TransactionsProvider",
        );
    }

    return (
        <DataGate
            loadError={value.loadError}
            ready={value.transactions !== null}
            onRetry={value.retry}
        >
            {children}
        </DataGate>
    );
}

export function useTransactions(): TransactionsContextValue {
    const value = useContext(TransactionsContext);
    if (!value || !value.transactions) {
        throw new Error(
            "useTransactions must be used inside a TransactionsGate",
        );
    }
    return {
        transactions: value.transactions,
        importTransactions: value.importTransactions,
    };
}
