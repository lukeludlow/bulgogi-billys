import PageMeta from "@/components/PageMeta.tsx";
import { Heading, Subheading } from "@/components/catalyst-ui-kit/heading.tsx";
import { Text } from "@/components/catalyst-ui-kit/text.tsx";
import { Divider } from "@/components/catalyst-ui-kit/divider.tsx";
import { Button } from "@/components/catalyst-ui-kit/button.tsx";
import { posts } from "@/pages/blog/posts.ts";

export default function Blog() {
    return (
        <div className="bg-white dark:bg-zinc-900 min-h-screen">
            <PageMeta
                title="Blog | Bulgogi Billy's Korean Fusion"
                description="Stories, updates, and food tips from Bulgogi Billy's — your favorite Korean fusion food vendor at farmers markets in The Woodlands, Conroe, and the greater Houston area."
            />
            <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
                <Heading level={1} className="text-4xl font-bold mb-2">
                    Blog
                </Heading>
                <Text className="mb-10">
                    Stories, updates, and behind-the-scenes moments from Bulgogi
                    Billy's.
                </Text>
                <Divider className="mb-10" />
                <div className="flex flex-col gap-10">
                    {posts.map((post) => (
                        <article key={post.slug}>
                            <Text className="text-xs uppercase tracking-widest mb-1">
                                {new Date(post.date).toLocaleDateString(
                                    "en-US",
                                    {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        timeZone: "UTC",
                                    },
                                )}
                            </Text>
                            <Subheading
                                level={2}
                                className="text-xl font-semibold mb-2"
                            >
                                {post.title}
                            </Subheading>
                            <Text className="mb-4">{post.excerpt}</Text>
                            <Button href={`/blog/${post.slug}`} outline>
                                Read more
                            </Button>
                            <Divider className="mt-10" />
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
}
