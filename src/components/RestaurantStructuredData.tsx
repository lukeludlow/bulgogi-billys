const structuredData = {
    "@context": "https://schema.org",
    "@type": ["FoodEstablishment", "LocalBusiness"],
    name: "Bulgogi Billy's",
    url: "https://bulgogibillys.com",
    email: "bulgogibillys@gmail.com",
    servesCuisine: ["Korean", "Korean Fusion", "American"],
    priceRange: "$$",
    image: "https://bulgogibillys.com/images/fries_h_screen_small.png",
    hasMenu: "https://bulgogibillys.com/menu",
    sameAs: [
        "https://www.instagram.com/bulgogibillys/",
        "https://www.facebook.com/p/Bulgogi-Billys-LLC-61560725494736/",
    ],
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
            name: "Farmers Market at 1488",
            address: {
                "@type": "PostalAddress",
                streetAddress: "16051 Old Conroe Rd",
                addressLocality: "Conroe",
                addressRegion: "TX",
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
            closes: "12:00",
        },
        {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: "Sunday",
            opens: "10:00",
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
