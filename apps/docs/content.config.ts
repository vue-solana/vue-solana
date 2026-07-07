import { defineContentConfig, defineCollection, z } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: "page",
      source: [
        {
          include: "**",
          exclude: ["locales/**"],
        },
        {
          include: "locales/es/**",
          prefix: "/es",
        },
        {
          include: "locales/ko/**",
          prefix: "/ko",
        },
        {
          include: "locales/zh/**",
          prefix: "/zh",
        },
      ],
      schema: z.object({
        description: z.string().optional(),
        ogDescription: z.string().optional(),
        ogSection: z.string().optional(),
        ogTitle: z.string().optional(),
        surroundOrder: z.number().optional(),
      }),
    }),
  },
});
