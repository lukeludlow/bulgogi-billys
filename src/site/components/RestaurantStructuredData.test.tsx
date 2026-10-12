import { expect, test } from "vitest";
import RestaurantStructuredData from "@/site/components/RestaurantStructuredData.tsx";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

async function renderJsonLd() {
    const { container } = await renderWithProviders(
        <RestaurantStructuredData />,
    );
    const script = container.querySelector(
        'script[type="application/ld+json"]',
    );
    return JSON.parse(script!.textContent!);
}

test("lists only the markets Billy still sells at", async () => {
    const data = await renderJsonLd();

    expect(data.location.map((place: { name: string }) => place.name)).toEqual([
        "Grogan's Mill Farmer's Market",
        "New Caney Community Market",
    ]);
});

test("gives each market day its own hours", async () => {
    const data = await renderJsonLd();

    expect(data.openingHoursSpecification).toEqual([
        expect.objectContaining({
            dayOfWeek: "Saturday",
            opens: "09:00",
            closes: "13:00",
        }),
        expect.objectContaining({
            dayOfWeek: "Sunday",
            opens: "11:00",
            closes: "15:00",
        }),
    ]);
});
