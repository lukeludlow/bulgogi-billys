import { useParams } from "react-router";
import PageMeta from "@/components/PageMeta.tsx";
import { Heading, Subheading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import { posts } from "@/pages/blog/posts.ts";

export default function BlogPost() {
    const { slug } = useParams<{ slug: string }>();
    const post = posts.find((p) => p.slug === slug);

    if (!post) {
        return (
            <div className="bg-white dark:bg-zinc-900 min-h-screen">
                <PageMeta
                    title="Post Not Found | Bulgogi Billy's"
                    description="This blog post could not be found."
                />
                <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
                    <Heading level={1}>Post not found</Heading>
                    <Text className="mt-4 mb-8">
                        We couldn't find that post. It may have moved or never
                        existed.
                    </Text>
                    <Button href="/blog" outline>
                        ← Back to Blog
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-900 min-h-screen">
            <PageMeta
                title={`${post.title} | Bulgogi Billy's`}
                description={post.excerpt}
            />
            <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
                <Text className="text-xs uppercase tracking-widest mb-2">
                    {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        timeZone: "UTC",
                    })}
                </Text>
                <Heading level={1} className="text-4xl font-bold mb-8">
                    {post.title}
                </Heading>
                <Divider className="mb-10" />
                <div className="flex flex-col gap-8">
                    {post.content.map((section, i) => (
                        <section key={i}>
                            {section.heading && (
                                <Subheading
                                    level={2}
                                    className="text-xl font-semibold mb-3"
                                >
                                    {section.heading}
                                </Subheading>
                            )}
                            <div className="flex flex-col gap-4">
                                {section.paragraphs.map((p, j) => (
                                    <Text key={j}>{p}</Text>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
                <Divider className="mt-12 mb-8" />
                <Button href="/blog" outline>
                    ← Back to Blog
                </Button>
            </div>
        </div>
    );
}
