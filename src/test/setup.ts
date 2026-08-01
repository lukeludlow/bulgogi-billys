import { afterEach } from "vitest";

afterEach(() => {
    localStorage.removeItem("theme");
    document.documentElement.classList.remove("dark");
});
