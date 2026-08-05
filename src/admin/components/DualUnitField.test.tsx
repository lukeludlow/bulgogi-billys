import { expect, test, vi } from "vitest";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";
import DualUnitField from "@/admin/components/DualUnitField.tsx";

// The mixed-unit arithmetic these inputs are built on is tested in the fast
// unit tier — see ui/units.test.ts. What's left here needs a real browser: the
// two inputs, and the rule that mounting one never fires onChange.

test("renders both inputs with derived values and suffixes", async () => {
    const screen = await renderWithProviders(
        <DualUnitField
            value={1.5}
            onChange={() => {}}
            majorSuffix="hr"
            minorSuffix="min"
            minorPerMajor={60}
            aria-label="Employee hours"
        />,
    );

    await expect
        .element(screen.getByLabelText("Employee hours hr"))
        .toHaveValue(1);
    await expect
        .element(screen.getByLabelText("Employee hours min"))
        .toHaveValue(30);
});

test("does not fire onChange on mount", async () => {
    const onChange = vi.fn();
    await renderWithProviders(
        <DualUnitField
            value={1.33}
            onChange={onChange}
            majorSuffix="hr"
            minorSuffix="min"
            minorPerMajor={60}
            aria-label="Employee hours"
        />,
    );
    expect(onChange).not.toHaveBeenCalled();
});

test("editing the minor input recomposes the decimal value", async () => {
    const onChange = vi.fn();
    const screen = await renderWithProviders(
        <DualUnitField
            value={1}
            onChange={onChange}
            majorSuffix="hr"
            minorSuffix="min"
            minorPerMajor={60}
            aria-label="Employee hours"
        />,
    );

    await screen.getByLabelText("Employee hours min").fill("45");
    expect(onChange).toHaveBeenLastCalledWith(1.75);
});

test("editing the major input keeps the minor part", async () => {
    const onChange = vi.fn();
    const screen = await renderWithProviders(
        <DualUnitField
            value={0.25}
            onChange={onChange}
            majorSuffix="lb"
            minorSuffix="oz"
            minorPerMajor={16}
            aria-label="Beef amount"
        />,
    );

    await screen.getByLabelText("Beef amount lb").fill("2");
    expect(onChange).toHaveBeenLastCalledWith(2.25);
});

test("clearing an input treats it as zero", async () => {
    const onChange = vi.fn();
    const screen = await renderWithProviders(
        <DualUnitField
            value={1.5}
            onChange={onChange}
            majorSuffix="hr"
            minorSuffix="min"
            minorPerMajor={60}
            aria-label="Employee hours"
        />,
    );

    await screen.getByLabelText("Employee hours min").fill("");
    expect(onChange).toHaveBeenLastCalledWith(1);
});
