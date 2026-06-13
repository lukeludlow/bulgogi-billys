export interface Section {
    heading?: string;
    paragraphs: string[];
}

export interface Post {
    slug: string;
    title: string;
    date: string;
    excerpt: string;
    keywords: string[];
    content: Section[];
}

export const posts: Post[] = [
    {
        slug: "the-tiktok-that-put-bulgogi-billys-on-the-map",
        title: "The TikTok That Put Bulgogi Billy's on the Map",
        date: "2025-06-01",
        excerpt:
            "A stranger with smart glasses, a bustling farmers market, and one candid video changed everything for Billy — and now 24 million people know his name.",
        keywords: [
            "Bulgogi Billy's",
            "Korean food Conroe Texas",
            "Korean food near Conroe TX",
            "Asian fusion catering Houston",
            "Asian fusion catering Houston area",
            "Korean BBQ food truck The Woodlands",
            "internet famous farmers market vendor",
            "viral food truck Texas",
            "TikTok famous food vendor Houston",
            "farmers market food The Woodlands Conroe",
        ],
        content: [
            {
                paragraphs: [
                    "One Saturday morning at a farmers market in The Woodlands, Billy was doing what he always does — head down, tongs in hand, tending to a sizzling flat-top loaded with bulgogi. He wasn't thinking about going viral. He was thinking about the next order.",
                ],
            },
            {
                heading: "How It All Started",
                paragraphs: [
                    "Bulgogi Billy's was born from a simple but powerful idea: bring the bold, savory flavors of Korean BBQ to the heart of the Houston suburbs — and make them approachable for everyone. Billy grew up eating his family's recipes and spent years perfecting the marinade that now goes into every plate of bulgogi fries, tacos, and rice bowls.",
                    "He started small, setting up at weekend farmers markets around The Woodlands, Conroe, and New Caney, TX. Word spread the old-fashioned way at first — neighbor to neighbor, one mouth-watering plate at a time. For anyone searching for Korean food near Conroe, Texas or looking for something beyond the usual farmers market fare, Bulgogi Billy's quickly became the answer.",
                    "What sets Bulgogi Billy's apart isn't just the food — it's the experience. It's watching Billy work the flat-top with the confidence of someone who has made this dish ten thousand times. It's the smell of marinated beef hitting a hot griddle that stops you mid-stride. It's a style of Asian fusion that feels right at home in Texas.",
                ],
            },
            {
                heading: "The Video Nobody Knew Was Being Filmed",
                paragraphs: [
                    "On an otherwise ordinary Saturday, a content creator walked up to the Bulgogi Billy's booth. He didn't introduce himself. He placed an order, stepped back, and watched — or so it seemed.",
                    "What Billy didn't know was that the man was wearing Meta Ray-Ban smart glasses with a small strip of tape carefully placed over the indicator light that shows when the camera is recording. He was capturing everything: Billy's fluid movements behind the flat-top, the concentration on his face, the easy smile he gives every customer. Completely candid. Completely unposed.",
                    "The video went up on TikTok a few days later under the account @davidspov_. The caption was simple. The footage let Billy speak for itself.",
                ],
            },
            {
                heading: "24 Million Views and Counting",
                paragraphs: [
                    'The response was immediate and overwhelming. Within days, the TikTok had cracked a million views. Within weeks, it had passed 24 million — and that\'s just TikTok. The video spread to Instagram Reels, Facebook, and Reddit threads dedicated to "underrated food finds."',
                    'The comment section became a phenomenon of its own. Thousands of people dropped in to say they were driving from across the Houston area just to find the booth. Others who had already eaten at Bulgogi Billy\'s left comments like "I knew about him before it was cool." And scattered throughout, in truly charming internet fashion, were comments calling Billy a "Cutie patootie" — a nickname that caught on and has stuck ever since.',
                    "For a farmers market food vendor in The Woodlands and Conroe, the overnight attention was surreal. Lines stretched longer. New customers showed up clutching their phones, ready to film their own reaction videos. Internet-famous food vendors are a growing phenomenon across the Houston area, but few have had a moment quite like this one.",
                ],
            },
            {
                heading: "Find Us at a Market Near You",
                paragraphs: [
                    "The TikTok may have introduced Bulgogi Billy's to the world, but the food is what keeps people coming back. Whether you're craving Korean food near Conroe, TX, looking for the best Asian fusion in the Houston area, or just heard about us online and want to see what all the fuss is about — we'd love to feed you.",
                    "Bulgogi Billy's is available for Asian fusion catering in the greater Houston area. From backyard cookouts to corporate events, we bring the same flavors that made 24 million people stop scrolling. Check our schedule page for current market locations and upcoming dates.",
                    "Come hungry. Tell your friends. And yes — feel free to take a video.",
                ],
            },
        ],
    },
];
