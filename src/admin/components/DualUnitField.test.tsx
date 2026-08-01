import { expect, test, vi } from "vitest";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";
import DualUnitField, {
    joinUnits,
    splitUnits,
} from "@/admin/components/DualUnitField.tsx";

test("splitUnits decomposes decimal pounds into lb + oz exactly", () => {
    expect(splitUnits(0.25, 16)).toEqual({ major: 0, minor: 4 });
    expect(splitUnits(0.15, 16)).toEqual({ major: 0, minor: 2.4 });
    expect(splitUnits(1.5, 16)).toEqual({ major: 1, minor: 8 });
    expect(splitUnits(3, 16)).toEqual({ major: 3, minor: 0 });
});

test("splitUnits decomposes decimal hours into hr + min exactly", () => {
    expect(splitUnits(0.25, 60)).toEqual({ major: 0, minor: 15 });
    expect(splitUnits(1.5, 60)).toEqual({ major: 1, minor: 30 });
    // Legacy value not on a clean minute boundary still displays sensibly.
    expect(splitUnits(1.33, 60)).toEqual({ major: 1, minor: 19.8 });
});

test("splitUnits survives float noise near whole numbers", () => {
    expect(splitUnits(0.1 + 0.2, 60).major).toBe(0);
    expect(splitUnits(2.9999999999, 16)).toEqual({ major: 3, minor: 0 });
});

test("splitUnits treats non-finite and negative values as zero", () => {
    expect(splitUnits(Number.NaN, 16)).toEqual({ major: 0, minor: 0 });
    expect(splitUnits(-1, 16)).toEqual({ major: 0, minor: 0 });
});

test("joinUnits recomposes and round-trips splitUnits", () => {
    expect(joinUnits(0, 4, 16)).toBe(0.25);
    expect(joinUnits(1, 30, 60)).toBe(1.5);
    for (const value of [0.15, 0.25, 1.5, 2.75]) {
        const { major, minor } = splitUnits(value, 16);
        expect(joinUnits(major, minor, 16)).toBeCloseTo(value, 10);
    }
});

test("joinUnits allows minor overflow past one major unit", () => {
    // 2 lb 20 oz = 3.25 lb
    expect(joinUnits(2, 20, 16)).toBe(3.25);
});

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
