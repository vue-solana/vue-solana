import { defineContentConfig, defineCollection, z } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: "page",
      source: "**",
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
