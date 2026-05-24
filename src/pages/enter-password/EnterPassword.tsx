import { useState } from "react";

export default function EnterPassword() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                fontFamily: "sans-serif",
            }}
        >
            <form
                onSubmit={handleSubmit}
                style={{
                    padding: "2rem",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    textAlign: "center",
                }}
            >
                <h2>🔒 Protected Website</h2>
                <p>Please enter the secret password to gain access.</p>
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setError(false);
                    }}
                    style={{
                        padding: "10px",
                        width: "80%",
                        marginBottom: "10px",
                        borderRadius: "4px",
                        border: "1px solid #aaa",
                    }}
                    required
                />
                {error && (
                    <p style={{ color: "red", fontSize: "14px" }}>
                        Incorrect password. Try again.
                    </p>
                )}
                <button
                    type="submit"
                    style={{
                        padding: "10px 20px",
                        cursor: "pointer",
                        background: "#000",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                    }}
                >
                    Unlock Site
                </button>
            </form>
        </div>
    );

    function handleSubmit(e) {
        e.preventDefault();

        if (password === import.meta.env.SITE_PASSWORD) {
            // Save the token cookie valid for 30 days
            const maxAge = 60 * 60 * 24 * 30;
            document.cookie = `site_auth_token=${password}; path=/; max-age=${maxAge}; SameSite=Strict; Secure`;

            // Reload the page. The middleware will now see the cookie and let the user through!
            window.location.href = "/";
        } else {
            setError(true);
        }
    }
}
