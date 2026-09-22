/** Public contact facts, shared by the footer, the contact page, and the JSON-LD. */
export const BUSINESS = {
    name: "Bulgogi Billy's",
    legalName: "Bulgogi Billy's LLC",
    /** Takes both calls and texts. */
    phone: { display: "(936) 900-2705", e164: "+19369002705" },
    email: "bulgogibillys@gmail.com",
    instagram: {
        handle: "@bulgogibillys",
        url: "https://www.instagram.com/bulgogibillys/",
    },
    facebook: {
        name: "Bulgogi Billy's LLC",
        url: "https://www.facebook.com/p/Bulgogi-Billys-LLC-61560725494736/",
    },
    serviceArea: ["The Woodlands", "Conroe", "New Caney", "Greater Houston"],
} as const;

export const PHONE_CALL_HREF = `tel:${BUSINESS.phone.e164}`;
export const PHONE_TEXT_HREF = `sms:${BUSINESS.phone.e164}`;
export const EMAIL_HREF = `mailto:${BUSINESS.email}`;
