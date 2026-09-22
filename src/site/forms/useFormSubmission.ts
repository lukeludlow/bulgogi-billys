import { useState } from "react";
import {
    submitToWeb3Forms,
    type SubmissionPayload,
} from "@/site/forms/web3forms.ts";

export interface SubmissionStatus {
    loading: boolean;
    /** null until a submission settles. */
    success: boolean | null;
    message: string;
}

const IDLE: SubmissionStatus = { loading: false, success: null, message: "" };

/** The submit/status path shared by the public site's forms. */
export function useFormSubmission() {
    const [status, setStatus] = useState<SubmissionStatus>(IDLE);

    async function submit(
        payload: SubmissionPayload,
        { successMessage }: { successMessage: string },
    ): Promise<boolean> {
        setStatus({ loading: true, success: null, message: "" });
        const result = await submitToWeb3Forms(payload);
        setStatus(
            result.ok
                ? { loading: false, success: true, message: successMessage }
                : { loading: false, success: false, message: result.message },
        );
        return result.ok;
    }

    return { status, submit };
}
