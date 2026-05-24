import { rewrite } from "@vercel/edge";

// This middleware should run on every URL of your site.
export const config = {
    matcher: "/(.*)",
};

// The password that people will need to enter.
// You should probably make this an environment variable for better security.
const CORRECT_PASSWORD = "password123";

export default function middleware(request) {
    const url = new URL(request.url);

    // We don't want to block access to every URL, because we still
    // want CSS or JavaScript files to work on the login page.
    // Here, I'm only password-protecting the homepage and
    // pages that begin with "/blog".
    if (
        (url.pathname === "/" || url.pathname.startsWith("/blog")) &&
        // Check cookies for correct password.
        !request.headers
            .get("Cookie")
            .includes(`site_password=${CORRECT_PASSWORD}`)
    ) {
        // A rewrite doesn't change the URL, but replaces the HTML
        // of the original page with the HTML of the login page.
        return rewrite("/login");
    }
}
