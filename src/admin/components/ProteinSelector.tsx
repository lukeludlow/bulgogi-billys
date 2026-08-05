import { Select } from "@/shared/catalyst-ui-kit/select.tsx";
import { useSettings } from "@/admin/SettingsContext.tsx";
import type { Protein } from "@/admin/domain/types.ts";

/**
 * The beef/pork what-if toggle. It lives on the config document rather than in
 * component state, so the choice is remembered and every recipe priced with
 * PROTEIN_INGREDIENT_ID follows it.
 */
export default function ProteinSelector() {
    const { settings, setSettings } = useSettings();

    return (
        <div className="flex items-center gap-2">
            <label
                htmlFor="protein-select"
                className="text-sm text-zinc-500 dark:text-zinc-400"
            >
                Protein
            </label>
            <Select
                id="protein-select"
                aria-label="Protein"
                className="w-32"
                value={settings.selectedProtein}
                onChange={(event) =>
                    setSettings((prev) => ({
                        ...prev,
                        selectedProtein: event.target.value as Protein,
                    }))
                }
            >
                <option value="beef">Beef</option>
                <option value="pork">Pork</option>
            </Select>
        </div>
    );
}
