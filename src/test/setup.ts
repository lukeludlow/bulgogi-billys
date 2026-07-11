import { afterEach } from "vitest";

afterEach(() => {
    document.cookie =
        "site_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem("theme");
    document.documentElement.classList.remove("dark");
});
