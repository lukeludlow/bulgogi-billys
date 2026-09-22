export const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

// Public by design: a Web3Forms access key can only deliver submissions to the
// business inbox, so it ships in the client bundle.
const ACCESS_KEY = "e07279ae-8bec-40b4-894b-19aa0add3f0e";

export type SubmissionResult = { ok: true } | { ok: false; message: string };

export type SubmissionPayload = Record<string, string | number | boolean>;

/**
 * Sends a form to Web3Forms, which emails it to the business inbox. Every key
 * in the payload shows up as a labeled line in that email.
 */
export async function submitToWeb3Forms(
    payload: SubmissionPayload,
): Promise<SubmissionResult> {
    try {
        const response = await fetch(WEB3FORMS_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ ...payload, access_key: ACCESS_KEY }),
        });
        const result = await response.json();

        if (response.ok && result.success) return { ok: true };
        return {
            ok: false,
            message:
                result.message || "Something went wrong with the submission.",
        };
    } catch (error) {
        console.error(error);
        return {
            ok: false,
            message: "Failed to send message. Please try again later.",
        };
    }
}
