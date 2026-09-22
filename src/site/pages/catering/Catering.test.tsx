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
        .element(styles.getByText("From $17/person · 20-guest minimum"))
        .toBeInTheDocument();
    await expect
        .element(
            styles.getByText(
                "From $22/person · minimum $1,000 Mon–Thu / $1,500 Fri–Sun",
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

test("the package cards are priced by the estimator", async () => {
    const { getByRole } = await renderWithProviders(<Catering />);
    const packages = getByRole("region", { name: "Packages" });

    for (const pkg of CATERING_PACKAGES) {
        const range = formatEstimate(estimateCateringQuote(packageInput(pkg)));
        await expect
            .element(packages.getByText(range, { exact: true }))
            .toBeInTheDocument();
    }
});

test("the estimator re-prices as the answers change", async () => {
    const { getByRole } = await renderWithProviders(<Catering />);
    const estimator = getByRole("region", { name: "Instant estimate" });
    const range = estimator.getByTestId("estimate-range");

    await expect.element(range).toHaveTextContent("$680 – $820");

    await estimator
        .getByRole("radio", { name: "On-site Tent Service" })
        .click();
    await expect.element(range).toHaveTextContent("$1,000 – $1,200");
    await expect
        .element(estimator.getByText("Mon–Thu minimum of $1,000 applied."))
        .toBeInTheDocument();

    await estimator.getByRole("radio", { name: "Fri–Sun" }).click();
    await expect.element(range).toHaveTextContent("$1,500 – $1,800");
    await expect
        .element(estimator.getByText("A 50% deposit ($750) holds your date."))
        .toBeInTheDocument();

    await estimator.getByRole("checkbox", { name: "Drinks" }).click();
    await expect
        .element(estimator.getByText("+ add-ons & travel quoted separately"))
        .toBeInTheDocument();
    await expect.element(range).toHaveTextContent("$1,500 – $1,800");

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
        .toHaveTextContent("$765 – $920");

    await guests.fill("120");
    await expect
        .element(estimator.getByTestId("estimate-range"))
        .toHaveTextContent("$2,040 – $2,450");
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

    await faq.getByText("Is there a vegetarian option?").click();
    await expect
        .element(faq.getByText(/Tick “Vegetarian option needed”/))
        .toBeVisible();
    // Tent footprint and permits/insurance wait for Billy (plan §6).
    expect(container.textContent).not.toMatch(/insur|permit/i);
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
