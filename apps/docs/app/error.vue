<script setup lang="ts">
import type { NuxtError } from "#app";

defineProps<{
  error: NuxtError;
}>();

const localePath = useLocalePath();

const docsLinks = [
  { label: "Overview", to: "/" },
  { label: "Getting Started", to: "/getting-started" },
  { label: "Agent Skill", to: "/agent-skill" },
  { label: "Troubleshooting", to: "/troubleshooting" },
];

useSeoMeta({
  title: "Page Not Found - Vue Solana",
  description: "The page you requested could not be found.",
});

const formattedLinks = computed(() =>
  docsLinks.map((link) => ({ ...link, to: localePath(link.to) })),
);
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <DocsAppShell>
      <UPage class="mx-auto w-full max-w-[1180px] flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div class="grid justify-items-start gap-6">
          <p class="text-sm font-medium uppercase tracking-wide text-muted">
            Error {{ error.statusCode }}
          </p>
          <h1 class="text-4xl font-bold tracking-tight text-highlighted sm:text-5xl">
            {{ error.statusCode === 404 ? "Page Not Found" : "Something Went Wrong" }}
          </h1>
          <p class="max-w-xl text-lg text-muted">
            {{
              error.statusCode === 404
                ? "The page you requested does not exist or has moved."
                : "An unexpected error occurred while loading this page."
            }}
          </p>

          <ul class="grid gap-2 text-base">
            <li v-for="link in formattedLinks" :key="link.to">
              <NuxtLink :to="link.to" class="text-primary hover:underline">
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>

          <p class="max-w-xl text-sm text-muted">
            Agents can request
            <NuxtLink
              to="https://vue-solana-docs.vercel.app/llms.txt"
              class="text-primary hover:underline"
            >
              llms.txt
            </NuxtLink>
            for the documentation index or
            <NuxtLink
              to="https://vue-solana-docs.vercel.app/openapi.json"
              class="text-primary hover:underline"
            >
              openapi.json
            </NuxtLink>
            for the API surface. Sending an <code>Accept: text/markdown</code> header to any
            documentation page returns markdown.
          </p>

          <UButton to="/" color="neutral" variant="outline" class="mt-2">
            Back to documentation home
          </UButton>
        </div>
      </UPage>
    </DocsAppShell>
  </UApp>
</template>
