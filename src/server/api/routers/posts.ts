import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import type { User } from "next-auth";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { TRPCError } from "@trpc/server";

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.fixedWindow(3, "1m"),
  prefix: "myt3/ratelimit",
});

const filterUserForClient = ({ id, name, email, image }: User) => ({
  id,
  name,
  email,
  image,
});

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
      orderBy: {
        createdAt: "desc",
      },
    });

    const users = (
      await ctx.prisma.user.findMany({
        where: {
          id: {
            in: posts.map((post) => post.authorId),
          },
        },
      })
    ).map(filterUserForClient);

    return posts.map((post) => ({
      post,
      author: users.find(({ id }) => id === post.authorId),
    }));
  }),

  create: protectedProcedure
    .input(
      z.object({
        content: z.string().emoji("Only emoji allowed").min(1).max(280),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const authorId = ctx.session.user.id;

      const { success } = await ratelimit.limit(authorId);

      if (!success) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
      }

      const post = await ctx.prisma.post.create({
        data: {
          authorId,
          content: input.content,
        },
      });
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
