import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: posts, error } = await supabase
      .from("posts")
      .select("title, slug, excerpt, published_at, tags")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching posts for RSS:", error);
      return new NextResponse("Internal Server Error", { status: 500 });
    }

    const siteUrl = "https://tanmay-singh.com";

    const rssItems = (posts || [])
      .map((post) => {
        const pubDate = post.published_at
          ? new Date(post.published_at).toUTCString()
          : new Date().toUTCString();
        const categories = (post.tags || [])
          .map((tag: string) => `      <category>${escapeXml(tag)}</category>`)
          .join("\n");

        return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/blog/${escapeXml(post.slug)}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${escapeXml(post.slug)}</guid>
      <description>${escapeXml(post.excerpt || "")}</description>
      <pubDate>${pubDate}</pubDate>
${categories}
    </item>`;
      })
      .join("\n");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tanmay Singh - Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Thoughts, tutorials, and tales from a full-stack developer.</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/api/blog/rss" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
