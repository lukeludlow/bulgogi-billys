export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res
            .status(405)
            .json({ success: false, message: "Method Not Allowed" });
    }

    try {
        const { name, email, message, botcheck } = req.body;

        // Bot & Spam Prevention (Honeypot Technique)
        // If the hidden 'botcheck' input has any value, a bot filled it out automatically.
        if (botcheck) {
            return res
                .status(400)
                .json({ success: false, message: "Spam detected." });
        }

        if (!name || !email || !message) {
            return res
                .status(400)
                .json({ success: false, message: "Missing required fields." });
        }

        const response = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                // @ts-expect-error typescript is mad about `process`.
                access_key: process.env.WEB3FORMS_ACCESS_KEY,
                name,
                email,
                message,
                from_name: "Bulgogi Billy's App Contact Form",
            }),
        });

        const data = await response.json();

        if (data.success) {
            return res
                .status(200)
                .json({ success: true, message: "Message sent successfully!" });
        } else {
            return res.status(500).json({
                success: false,
                message: data.message || "Web3Forms submission failed.",
            });
        }
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ success: false, message: "Internal Server Error" });
    }
}
