import { expect, test } from "vitest";
import Card from "@/admin/components/ui/Card.tsx";
import StatCard from "@/admin/components/ui/StatCard.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

test("renders its children on the shared surface", async () => {
    const screen = await renderWithProviders(
        <Card>
            <p>panel body</p>
        </Card>,
    );

    const body = screen.getByText("panel body");
    await expect.element(body).toBeInTheDocument();
    expect(body.element().parentElement?.className).toContain("rounded-lg");
});

test("padding defaults to the roomier size and tightens on request", async () => {
    const screen = await renderWithProviders(
        <>
            <Card>
                <span>default</span>
            </Card>
            <Card padding="tight">
                <span>tight</span>
            </Card>
        </>,
    );

    const roomy = screen.getByText("default").element().parentElement!;
    const tight = screen.getByText("tight").element().parentElement!;
    expect(roomy.className).toContain("sm:p-5");
    expect(tight.className).not.toContain("sm:p-5");
    expect(tight.className).toContain("p-4");
});

test("merges caller classes rather than replacing the surface", async () => {
    const screen = await renderWithProviders(
        <Card className="overflow-hidden">
            <span>clipped</span>
        </Card>,
    );

    const surface = screen.getByText("clipped").element().parentElement!;
    expect(surface.className).toContain("overflow-hidden");
    expect(surface.className).toContain("rounded-lg");
});

test("StatCard shows its label, value, and optional sub-line", async () => {
    const screen = await renderWithProviders(
        <StatCard label="Average margin" value="66.7%" sub="Avg food cost" />,
    );

    await expect
        .element(screen.getByText("Average margin"))
        .toBeInTheDocument();
    await expect.element(screen.getByText("66.7%")).toBeInTheDocument();
    await expect.element(screen.getByText("Avg food cost")).toBeInTheDocument();
});

test("StatCard tints the value for profit and loss", async () => {
    const screen = await renderWithProviders(
        <>
            <StatCard label="Net" value="up" tone="profit" />
            <StatCard label="Net" value="down" tone="loss" />
        </>,
    );

    expect(screen.getByText("up").element().className).toContain("text-green");
    expect(screen.getByText("down").element().className).toContain("text-red");
});
