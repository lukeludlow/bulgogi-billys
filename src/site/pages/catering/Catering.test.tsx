import { afterEach, expect, test, vi } from "vitest";
import { track } from "@vercel/analytics";
import {
    CATERING_PACKAGES,
    estimateCateringQuote,
    formatEstimate,
    packageInput,
} from "@/site/catering/pricing.ts";
import Catering from "@/site/pages/catering/Catering.tsx";
import { blockPhoneLinkNavigation } from "@/test/blockPhoneLinks.ts";
import { renderWithProviders } from "@/test/renderWithProviders.tsx";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

blockPhoneLinkNavigation();

afterEach(() => {
    vi.clearAllMocks();
});

test("renders with its title", async () => {
    await renderWithProviders(<Catering />);
    await expect
        .poll(() => document.title)
        .toBe(
            "Catering | Bulgogi Billy's Korean Fusion – The Woodlands & Houston",
        );
});

test("the service styles show their prices from the pricing config", async () => {
    const { getByRole } = await renderWithProviders(<Catering />);
    const styles = getByRole("region", { name: "Three ways to book" });

    await expect
        .element(styles.getByText("From $15/person · 20-guest minimum"))
        .toBeInTheDocument();
    await expect
        .element(
            styles.getByText(
                "From $22/person · minimum $800 Mon–Thu / $1,200 Fri–Sun",
            ),
        )
        .toBeInTheDocument();
    await expect
        .element(
            styles.getByText(
                "$0 to host · needs ~40+ buyers or a sales guarantee",
            ),
        )
        .toBeInTheDocument();
});

test("the package cards are priced by the estimator and say what's included", async () => {
    const { getByRole } = await renderWithProviders(<Catering />);
    const packages = getByRole("region", { name: "Packages" });

    for (const pkg of CATERING_PACKAGES) {
        const card = packages.getByRole("listitem", {
            name: pkg.name,
            exact: true,
        });
        const range = formatEstimate(estimateCateringQuote(packageInput(pkg)));
        await expect
            .element(card.getByText(range, { exact: true }))
            .toBeInTheDocument();
        const includes = card.getByRole("list", { name: "Includes" });
        for (const item of pkg.includes) {
            await expect
                .element(includes.getByText(item, { exact: true }))
                .toBeInTheDocument();
        }
    }
});

test("the packages follow the estimator once it's been used", async () => {
    const { getByRole } = await renderWithProviders(<Catering />);
    const packages = getByRole("region", { name: "Packages" });
    const estimator = getByRole("region", { name: "Instant estimate" });
    const card = (name: string) =>
        packages.getByRole("listitem", { name, exact: true });
    const allCards = CATERING_PACKAGES.map((pkg) => card(pkg.name));

    // Untouched, no card is singled out.
    for (const each of allCards) {
        await expect.element(each).not.toHaveAttribute("data-selected");
        await expect.element(each).not.toHaveAttribute("data-dimmed");
    }

    await estimator
        .getByRole("radio", { name: "On-site Tent Service" })
        .click();
    await expect.element(card("Party")).toHaveAttribute("data-selected");
    await expect
        .element(card("Party").getByText("Matches your estimate"))
        .toBeInTheDocument();
    await expect
        .element(card("Office Lunch & Backyard"))
        .toHaveAttribute("data-dimmed");
    await expect.element(card("Big Event")).toHaveAttribute("data-dimmed");

    await estimator.getByRole("spinbutton", { name: "Guests" }).fill("100");
    await expect.element(card("Big Event")).toHaveAttribute("data-selected");
    await expect.element(card("Party")).toHaveAttribute("data-dimmed");

    await estimator
        .getByRole("radio", { name: "Employee-Paid Pop-Up" })
        .click();
    for (const each of allCards) {
        await expect.element(each).toHaveAttribute("data-dimmed");
    }
    await expect
        .element(packages.getByText("Matches your estimate"))
        .not.toBeInTheDocument();

    // A dimmed card can still be chosen.
    await getByRole("button", {
        name: "Start with this: Office Lunch & Backyard package",
    }).click();
    await expect
        .element(card("Office Lunch & Backyard"))
        .toHaveAttribute("data-selected");
    await expect
        .element(estimator.getByTestId("estimate-range"))
        .toHaveTextContent("$600 – $850");
});

test("the estimator re-prices as the answers change", async () => {
    const { getByRole } = await renderWithProviders(<Catering />);
    const estimator = getByRole("region", { name: "Instant estimate" });
    const range = estimator.getByTestId("estimate-range");

    await expect.element(range).toHaveTextContent("$600 – $850");

    await estimator
        .getByRole("radio", { name: "On-site Tent Service" })
        .click();
    await expect.element(range).toHaveTextContent("$880 – $1,060");

    await estimator.getByRole("radio", { name: "Fri–Sun" }).click();
    await expect.element(range).toHaveTextContent("$1,200 – $1,440");
    await expect
        .element(estimator.getByText("Fri–Sun minimum of $1,200 applied."))
        .toBeInTheDocument();
    await expect
        .element(estimator.getByText("A 50% deposit ($600) holds your date."))
        .toBeInTheDocument();

    await estimator.getByRole("checkbox", { name: "Drinks" }).click();
    await expect
        .element(estimator.getByText("+ add-ons & travel quoted separately"))
        .toBeInTheDocument();
    await expect.element(range).toHaveTextContent("$1,200 – $1,440");

    // Counted once per page view, not on every change.
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("catering_estimate_used", {
        style: "onsite",
    });
});

test("the guest stepper moves in steps and re-prices", async () => {
    const { getByRole } = await renderWithProviders(<Catering />);
    const estimator = getByRole("region", { name: "Instant estimate" });
    const guests = estimator.getByRole("spinbutton", { name: "Guests" });

    await estimator.getByRole("button", { name: "More guests" }).click();
    await expect.element(guests).toHaveValue(45);
    await expect
        .element(estimator.getByTestId("estimate-range"))
        .toHaveTextContent("$675 – $960");

    await guests.fill("120");
    await expect
        .element(estimator.getByTestId("estimate-range"))
        .toHaveTextContent("$1,800 – $2,550");
});

test("distance runs to 40 miles, with travel quoted past 15", async () => {
    const { getByRole } = await renderWithProviders(<Catering />);
    const estimator = getByRole("region", { name: "Instant estimate" });
    const distance = estimator.getByRole("combobox", { name: "Distance" });

    await expect
        .element(distance)
        .toHaveAccessibleDescription(
            "More than 40 miles away? Call or text us.",
        );
    const options = (distance.element() as HTMLSelectElement).options;
    expect(Array.from(options, (option) => option.text)).toEqual([
        "Within 15 mi of The Woodlands / Conroe",
        "16–30 mi away",
        "31–40 mi away",
    ]);
    await expect
        .element(estimator.getByText("+ add-ons & travel quoted separately"))
        .not.toBeInTheDocument();

    await distance.selectOptions("mid");
    await expect
        .element(estimator.getByText("+ add-ons & travel quoted separately"))
        .toBeInTheDocument();
});

test("a pop-up shows the host cost instead of a range", async () => {
    const { getByRole } = await renderWithProviders(<Catering />);
    const estimator = getByRole("region", { name: "Instant estimate" });

    await estimator
        .getByRole("radio", { name: "Employee-Paid Pop-Up" })
        .click();
    await expect
        .element(estimator.getByTestId("estimate-range"))
        .toHaveTextContent("$0 to host");
});

test("choosing a package loads it into the estimator", async () => {
    const { getByRole } = await renderWithProviders(<Catering />);

    await getByRole("button", {
        name: "Start with this: Party package",
    }).click();

    await expect
        .element(
            getByRole("region", { name: "Instant estimate" }).getByTestId(
                "estimate-range",
            ),
        )
        .toHaveTextContent("$1,320 – $1,585");
});

test("'Get my exact quote' hands off to the form, prefilled", async () => {
    const { getByRole } = await renderWithProviders(<Catering />);
    const estimator = getByRole("region", { name: "Instant estimate" });
    const form = getByRole("region", { name: "Get your exact quote" });

    await estimator
        .getByRole("radio", { name: "On-site Tent Service" })
        .click();
    await estimator.getByRole("button", { name: "More guests" }).click();
    await estimator.getByRole("button", { name: "Get my exact quote" }).click();

    await expect
        .element(form.getByRole("textbox", { name: "Name" }))
        .toHaveFocus();
    await expect
        .element(form.getByRole("spinbutton", { name: "Guests" }))
        .toHaveValue(45);
    await expect
        .element(form.getByRole("combobox", { name: "Service style" }))
        .toHaveValue("onsite");
});

test("the hero offers tracked call and text links", async () => {
    const { getByRole } = await renderWithProviders(<Catering />);

    const call = getByRole("link", { name: "Call Billy" });
    await expect.element(call).toHaveAttribute("href", "tel:+19369002705");
    await expect
        .element(getByRole("link", { name: "Text Billy" }))
        .toHaveAttribute("href", "sms:+19369002705");

    await call.click();
    expect(track).toHaveBeenCalledWith("click_to_call", {
        placement: "catering_hero",
    });
});

test("the FAQ answers only what the business has confirmed", async () => {
    const { getByRole, container } = await renderWithProviders(<Catering />);
    const faq = getByRole("region", { name: "Questions we hear a lot" });

    await faq.getByText("Where do you travel?").click();
    await expect
        .element(faq.getByText(/Travel is free within 15 miles/))
        .toBeVisible();
    // Tent footprint and permits/insurance wait for Billy (plan §6).
    expect(container.textContent).not.toMatch(/insur|permit/i);
    // The vegetarian option came off the page in October 2026.
    expect(container.textContent).not.toMatch(/vegetarian/i);
});

test("the viral video credits its creator", async () => {
    const { getByRole, getByText } = await renderWithProviders(<Catering />);

    await expect
        .element(getByRole("link", { name: "Watch the video on TikTok" }))
        .toHaveAttribute("href", expect.stringContaining("@davidspov_"));
    await expect.element(getByText("Video by @davidspov_")).toBeInTheDocument();
});

test("the sticky bar steps aside while the hero's own buttons are on screen", async () => {
    const { getByTestId } = await renderWithProviders(<Catering />);
    const bar = getByTestId("sticky-cta-bar");

    await expect
        .element(bar.getByRole("link", { name: "Call" }))
        .toHaveAttribute("href", "tel:+19369002705");
    await expect
        .element(bar.getByRole("link", { name: "Text" }))
        .toHaveAttribute("href", "sms:+19369002705");
    await expect.poll(() => bar.element().hasAttribute("inert")).toBe(true);
});
