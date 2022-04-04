import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";

const notionClient = new Client({ auth: process.env.NOTION_API_KEY });
const n2mClient = new NotionToMarkdown({ notionClient });

export type BlogEntry = {
  id: string;
  title: string;
  slug: string;
  date: string;
};

export async function queryBlogDatabase(): Promise<BlogEntry[]> {
  const response = await notionClient.databases.query({
    database_id: process.env.NOTION_BLOG_DATABASE_ID as string,
    filter: {
      property: "Published",
      checkbox: {
        equals: true,
      },
    },
    sorts: [{ timestamp: "created_time", direction: "descending" }],
  });

  const entries: BlogEntry[] = [];
  for (const _page of response.results) {
    // Workaround, so we have correct typing on object page
    const page = _page as Extract<typeof _page, { parent: unknown }>;

    try {
      // Again workaround, so we have correct typing
      type PagePropertiesType = typeof page.properties[string];
      const nameProperty = page.properties["Name"] as Extract<
        PagePropertiesType,
        { type: "title" }
      >;
      const slugProperty = page.properties["Slug"] as Extract<
        PagePropertiesType,
        { type: "rich_text" }
      >;

      const id = page.id;
      const title = nameProperty.title[0].plain_text.trim();
      const slug = slugProperty.rich_text[0].plain_text.trim();
      const date = page.created_time.substring(0, 10);

      entries.push({ id, title, slug, date });
    } catch (err) {
      // Invalid page object, skipping it
      console.log(err);
      continue;
    }
  }

  return entries;
}

// Some duplication code from queryBlogDatabase, can be extracted if needed
export async function getBlogEntryBySlug(slug: string): Promise<BlogEntry> {
  const response = await notionClient.databases.query({
    database_id: process.env.NOTION_BLOG_DATABASE_ID as string,
    filter: {
      and: [
        { property: "Published", checkbox: { equals: true } },
        { property: "Slug", rich_text: { equals: slug } },
      ],
    },
  });

  if (response.results.length !== 1) {
    throw new Error("Received either none or more than one blog entry.");
  }

  const _page = response.results[0];
  const page = _page as Extract<typeof _page, { parent: unknown }>;

  type PagePropertiesType = typeof page.properties[string];
  const nameProperty = page.properties["Name"] as Extract<
    PagePropertiesType,
    { type: "title" }
  >;

  const id = page.id;
  const title = nameProperty.title[0].plain_text.trim();
  const date = page.created_time.substring(0, 10);

  return { id, title, slug, date };
}

export async function getBlogEntryAsMarkdown(id: string): Promise<string> {
  const markdown = n2mClient.toMarkdownString(
    await n2mClient.pageToMarkdown(id)
  );

  return markdown;
}
