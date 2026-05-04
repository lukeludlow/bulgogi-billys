import { Switch } from "@/components/catalyst-ui-kit/switch.tsx";
import { MoonIcon, SunIcon } from "@heroicons/react/16/solid";
import { useEffect, useState } from "react";

export default function DarkModeToggle() {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(getIsDarkMode());
    const iconSize = 5;

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [isDarkMode]);

    return (
        <div className={"flex flex-row items-center min-w-20"}>
            <SunIcon className={`size-${iconSize}`} />
            <Switch checked={isDarkMode} onChange={setIsDarkMode} />
            <MoonIcon className={`size-${iconSize}`} />
        </div>
    );

    function getIsDarkMode() {
        return (
            localStorage.theme === "dark" ||
            (!("theme" in localStorage) &&
                window.matchMedia("(prefers-color-scheme: dark)").matches)
        );
    }
}
