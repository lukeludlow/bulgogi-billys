import { expect, test } from "vitest";
import {
    BUSINESS,
    EMAIL_HREF,
    PHONE_CALL_HREF,
    PHONE_TEXT_HREF,
} from "@/site/business.ts";

test("the dialable number matches the displayed one", () => {
    const digits = BUSINESS.phone.display.replace(/\D/g, "");
    expect(BUSINESS.phone.e164).toBe(`+1${digits}`);
});

test("tap-to-call and tap-to-text use the E.164 number", () => {
    expect(PHONE_CALL_HREF).toBe("tel:+19369002705");
    expect(PHONE_TEXT_HREF).toBe("sms:+19369002705");
});

test("the email link addresses the business inbox", () => {
    expect(EMAIL_HREF).toBe("mailto:bulgogibillys@gmail.com");
});
