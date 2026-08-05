import LogoutButton from "@/admin/components/LogoutButton.tsx";
import ProteinSelector from "@/admin/components/ProteinSelector.tsx";
import SyncStatusIndicator from "@/admin/components/SyncStatus.tsx";

/**
 * The strip above every admin page. It only arranges three unrelated
 * controls — a what-if selector, the autosave status, and an auth action — so
 * each owns its own file and this stays layout.
 */
export default function SyncStatusBar() {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <ProteinSelector />
            <SyncStatusIndicator />
            <div className="ml-auto">
                <LogoutButton />
            </div>
        </div>
    );
}
