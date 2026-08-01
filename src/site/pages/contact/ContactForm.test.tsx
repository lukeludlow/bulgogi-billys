import { afterEach, expect, test, vi } from "vitest";
import type { Locator } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import ContactForm from "./ContactForm.tsx";

afterEach(() => {
    vi.unstubAllGlobals();
});

async function fillOutForm(getByLabelText: (text: string) => Locator) {
    await getByLabelText("Name").fill("Jane Doe");
    await getByLabelText("Email address").fill("jane@example.com");
    await getByLabelText("Message").fill("Do you cater events?");
}

test("does not call the API when required fields are left empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { getByRole } = await render(<ContactForm />);
    await getByRole("button", { name: "Send Message" }).click();

    expect(fetchMock).not.toHaveBeenCalled();
});

test("shows a success message and resets the form after a successful submission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getByLabelText, getByRole, getByText } = await render(
        <ContactForm />,
    );

    await fillOutForm(getByLabelText);
    await getByRole("button", { name: "Send Message" }).click();

    await expect
        .element(getByText("Thank you! Your message has been sent."))
        .toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
        "https://api.web3forms.com/submit",
        expect.objectContaining({ method: "POST" }),
    );
    await expect.element(getByLabelText("Name")).toHaveValue("");
});

test("shows the server's error message when the submission is rejected", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, message: "Spam detected." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getByLabelText, getByRole, getByText } = await render(
        <ContactForm />,
    );

    await fillOutForm(getByLabelText);
    await getByRole("button", { name: "Send Message" }).click();

    await expect.element(getByText("Spam detected.")).toBeInTheDocument();
});

test("shows a generic error message when the request fails outright", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const { getByLabelText, getByRole, getByText } = await render(
        <ContactForm />,
    );

    await fillOutForm(getByLabelText);
    await getByRole("button", { name: "Send Message" }).click();

    await expect
        .element(getByText("Failed to send message. Please try again later."))
        .toBeInTheDocument();
});
