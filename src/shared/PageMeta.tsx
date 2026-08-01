export const BASE_URL = "https://www.bulgogibillys.com";

interface PageMetaProps {
    title: string;
    description: string;
    /** Route path (e.g. "/menu") used to build the canonical URL. Omit for pages that shouldn't declare a canonical. */
    path?: string;
    /** Ask search engines not to index this page (admin, auth, not-found). */
    noindex?: boolean;
}

export default function PageMeta({
    title,
    description,
    path,
    noindex,
}: PageMetaProps) {
    return (
        <>
            <title>{title}</title>
            <meta name="description" content={description} />
            {path !== undefined && (
                <link rel="canonical" href={`${BASE_URL}${path}`} />
            )}
            {noindex && <meta name="robots" content="noindex" />}
        </>
    );
}
