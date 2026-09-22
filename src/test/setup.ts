import { afterEach } from "vitest";
import "@/index.css";

afterEach(() => {
    localStorage.removeItem("theme");
    document.documentElement.classList.remove("dark");
});
