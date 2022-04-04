import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import Head from "next/head";
import {
  BlogEntry,
  getBlogEntryAsMarkdown,
  getBlogEntryBySlug,
  queryBlogDatabase,
} from "../../utils/notion-client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PageProps {
  blogEntry: BlogEntry & { markdown: string };
}

export const getStaticPaths: GetStaticPaths = async () => {
  const blogEntries = await queryBlogDatabase();

  return {
    paths: blogEntries.map(({ slug }) => ({ params: { slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  const slug = context.params?.slug as string;

  const blogEntry = await getBlogEntryBySlug(slug);

  const markdown = await getBlogEntryAsMarkdown(blogEntry.id);

  return {
    props: {
      blogEntry: {
        ...blogEntry,
        markdown,
      },
    },
  };
};

const BlogEntryPage: NextPage<PageProps> = ({
  blogEntry: { title, date, markdown },
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <article>
        <h1>{title}</h1>
        <span>
          Published on <time dateTime={date}>{date}</time>
        </span>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </article>
    </>
  );
};

export default BlogEntryPage;
