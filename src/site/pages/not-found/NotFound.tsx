import PageMeta from "@/shared/PageMeta.tsx";

export default function NotFound() {
    return (
        <main className="grid min-h-full place-items-center bg-zinc-100 px-6 py-24 sm:py-32 lg:px-8 dark:bg-zinc-900">
            <PageMeta
                title="Page Not Found | Bulgogi Billy's"
                description="Sorry, we couldn't find the page you're looking for."
                noindex
            />
            <div className="text-center">
                <p className="text-base font-semibold text-orange-600 dark:text-orange-400">
                    404
                </p>
                <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-7xl dark:text-white">
                    Page not found
                </h1>
                <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8 dark:text-gray-400">
                    Sorry, we couldn’t find the page you’re looking for.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <a
                        href="/"
                        className="rounded-md bg-orange-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 dark:bg-orange-500 dark:hover:bg-orange-400 dark:focus-visible:outline-orange-500"
                    >
                        Go back home
                    </a>
                </div>
            </div>
        </main>
    );
}
