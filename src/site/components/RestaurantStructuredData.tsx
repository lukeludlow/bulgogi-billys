import { BASE_URL } from "@/shared/PageMeta.tsx";
import { BUSINESS } from "@/site/business.ts";
import { ogImageUrl, SITE_IMAGES } from "@/site/images.ts";

const structuredData = {
    "@context": "https://schema.org",
    "@type": ["FoodEstablishment", "LocalBusiness"],
    name: BUSINESS.name,
    url: "https://www.bulgogibillys.com",
    email: BUSINESS.email,
    telephone: BUSINESS.phone.e164,
    servesCuisine: ["Korean", "Korean Fusion", "American"],
    priceRange: "$$",
    image: `${BASE_URL}${ogImageUrl(SITE_IMAGES.bulgogiFries)}`,
    hasMenu: "https://www.bulgogibillys.com/menu",
    sameAs: [BUSINESS.instagram.url, BUSINESS.facebook.url],
    location: [
        {
            "@type": "Place",
            name: "Grogan's Mill Farmer's Market",
            address: {
                "@type": "PostalAddress",
                streetAddress: "7 Switchbud Pl",
                addressLocality: "The Woodlands",
                addressRegion: "TX",
                postalCode: "77380",
                addressCountry: "US",
            },
        },
        {
            "@type": "Place",
            name: "New Caney Community Market",
            address: {
                "@type": "PostalAddress",
                streetAddress: "21586 Market Place #200",
                addressLocality: "New Caney",
                addressRegion: "TX",
                addressCountry: "US",
            },
        },
    ],
    openingHoursSpecification: [
        {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: "Saturday",
            opens: "09:00",
            closes: "13:00",
        },
        {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: "Sunday",
            opens: "11:00",
            closes: "15:00",
        },
    ],
};

export default function RestaurantStructuredData() {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
    );
}
