import type { NavigationMenuItem } from "@nuxt/ui";

export type DocsNavLink = {
  label: string;
  to: string;
  icon?: string;
};

export type DocsNavSection = {
  title: string;
  links: DocsNavLink[];
};

export const primaryNavLinks: DocsNavLink[] = [
  { label: "Get Started", to: "/getting-started" },
  { label: "Concepts", to: "/concepts/solana-for-vue-developers" },
  { label: "Guides", to: "/guides/rpc-and-clusters" },
  { label: "Packages", to: "/packages/vue" },
  { label: "Examples", to: "/examples/vue-vite" },
  { label: "Demo", to: "/demo" },
  { label: "Roadmap", to: "/roadmap" },
];

export const externalNavLinks: DocsNavLink[] = [
  {
    label: "GitHub",
    to: "https://github.com/vue-solana/vue-solana",
    icon: "i-simple-icons-github",
  },
  {
    label: "npm",
    to: "https://www.npmjs.com/org/vue-solana",
    icon: "i-simple-icons-npm",
  },
];

export const docsNavSections: DocsNavSection[] = [
  {
    title: "Start",
    links: [
      { label: "Overview", to: "/" },
      { label: "Getting Started", to: "/getting-started" },
      { label: "Agent Skill", to: "/agent-skill" },
      { label: "Troubleshooting", to: "/troubleshooting" },
    ],
  },
  {
    title: "Concepts",
    links: [
      { label: "Solana For Vue Developers", to: "/concepts/solana-for-vue-developers" },
      { label: "Clusters", to: "/concepts/clusters" },
      { label: "Wallets", to: "/concepts/wallets" },
    ],
  },
  {
    title: "Guides",
    links: [
      { label: "RPC and Clusters", to: "/guides/rpc-and-clusters" },
      { label: "Wallets", to: "/guides/wallets" },
      { label: "Account Reads", to: "/guides/account-reads" },
      { label: "Transactions", to: "/guides/transactions" },
      { label: "Message Signing", to: "/guides/message-signing" },
      { label: "Errors", to: "/guides/errors" },
    ],
  },
  {
    title: "Packages",
    links: [
      { label: "@vue-solana/core", to: "/packages/core" },
      { label: "@vue-solana/vue", to: "/packages/vue" },
      { label: "@vue-solana/nuxt", to: "/packages/nuxt" },
    ],
  },
  {
    title: "Examples",
    links: [
      { label: "Live Demo", to: "/demo" },
      { label: "Vue Vite", to: "/examples/vue-vite" },
      { label: "Nuxt", to: "/examples/nuxt" },
    ],
  },
  {
    title: "Roadmap",
    links: [{ label: "v1 Roadmap", to: "/roadmap" }],
  },
];

export function isPrimaryNavLinkActive(currentPath: string, linkPath: string) {
  const basePath = linkPath.split("/").slice(0, 2).join("/") || "/";

  return currentPath === linkPath || (basePath !== "/" && currentPath.startsWith(basePath));
}

export function createPrimaryNavigationItems(currentPath: string): NavigationMenuItem[] {
  return primaryNavLinks.map((link) => ({
    ...link,
    active: isPrimaryNavLinkActive(currentPath, link.to),
  }));
}

export function createSidebarNavigationItems(currentPath: string): NavigationMenuItem[][] {
  return docsNavSections.map((section) => [
    {
      label: section.title,
      type: "label",
    },
    ...section.links.map((link) => ({
      ...link,
      active: currentPath === link.to,
    })),
  ]);
}
