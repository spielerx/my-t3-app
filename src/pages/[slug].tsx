import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import styles from "./index.module.css";
import { api } from "~/utils/api";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { prisma } from "~/server/db";
import { appRouter } from "~/server/api/root";
import superjson from "superjson";

const ProfileFeed = (props: { userId: string }) => {
  const { data, isLoading } = api.posts.getPostsByUserId.useQuery({
    author: props.userId,
  });

  if (isLoading) return <div>loading</div>;

  if (!data || data.length === 0) return <div>User has not posted</div>;

  return (
    <div>
      {data.map((post) => (
        <div key={post.id}>{post.content}</div>
      ))}
    </div>
  );
};

const ProfilePage: NextPage<{ username: string }> = ({ username }) => {
  const { data } = api.profile.getUserByUsername.useQuery({
    username,
  });

  if (!data) return <div>404</div>;

  return (
    <>
      <Head>
        <title>{data.name}</title>
      </Head>
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>{data?.name}</h1>
        </div>
      </main>
    </>
  );
};

export const getStaticProps: GetStaticProps = async (context) => {
  const ssg = createServerSideHelpers({
    router: appRouter,
    ctx: {
      prisma,
      session: null,
    },
    transformer: superjson, // optional - adds superjson serialization
  });

  const slug = context.params?.slug;
  console.log(slug);

  if (typeof slug !== "string") throw new Error("no slug");

  const username = slug.replace("@", "");

  await ssg.profile.getUserByUsername.prefetch({ username });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      username,
    },
  };
};

export const getStaticPaths = () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export default ProfilePage;
