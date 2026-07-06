import type { NavigationMenuItem } from "@nuxt/ui";

export type DocsNavLink = {
  label: string;
  labelKey: string;
  to: string;
  icon?: string;
};

export type DocsNavSection = {
  title: string;
  titleKey: string;
  links: DocsNavLink[];
};

export type DocsLocalePathResolver = (path: string) => string;
export type DocsTranslationResolver = (key: string) => string;

const resolveDefaultLocalePath: DocsLocalePathResolver = (path) => path;
const resolveDefaultTranslation: DocsTranslationResolver = (key) => key;

export const primaryNavLinks: DocsNavLink[] = [
  { label: "Get Started", labelKey: "navigation.primary.getStarted", to: "/getting-started" },
  {
    label: "Concepts",
    labelKey: "navigation.primary.concepts",
    to: "/concepts/solana-for-vue-developers",
  },
  { label: "Guides", labelKey: "navigation.primary.guides", to: "/guides/rpc-and-clusters" },
  { label: "Demo", labelKey: "navigation.primary.demo", to: "/demo" },
  { label: "Roadmap", labelKey: "navigation.primary.roadmap", to: "/roadmap" },
];

export const externalNavLinks: DocsNavLink[] = [
  {
    label: "GitHub",
    labelKey: "navigation.external.github",
    to: "https://github.com/vue-solana/vue-solana",
    icon: "i-simple-icons-github",
  },
  {
    label: "npm",
    labelKey: "navigation.external.npm",
    to: "https://www.npmjs.com/org/vue-solana",
    icon: "i-simple-icons-npm",
  },
];

export const docsNavSections: DocsNavSection[] = [
  {
    title: "Start",
    titleKey: "navigation.sidebar.start",
    links: [
      { label: "Overview", labelKey: "navigation.sidebar.overview", to: "/" },
      {
        label: "Getting Started",
        labelKey: "navigation.sidebar.gettingStarted",
        to: "/getting-started",
      },
      { label: "Agent Skill", labelKey: "navigation.sidebar.agentSkill", to: "/agent-skill" },
      {
        label: "Troubleshooting",
        labelKey: "navigation.sidebar.troubleshooting",
        to: "/troubleshooting",
      },
    ],
  },
  {
    title: "Concepts",
    titleKey: "navigation.sidebar.concepts",
    links: [
      {
        label: "Solana For Vue Developers",
        labelKey: "navigation.sidebar.solanaForVueDevelopers",
        to: "/concepts/solana-for-vue-developers",
      },
      { label: "Clusters", labelKey: "navigation.sidebar.clusters", to: "/concepts/clusters" },
    ],
  },
  {
    title: "Guides",
    titleKey: "navigation.sidebar.guides",
    links: [
      {
        label: "RPC and Clusters",
        labelKey: "navigation.sidebar.rpcAndClusters",
        to: "/guides/rpc-and-clusters",
      },
      { label: "Wallets", labelKey: "navigation.sidebar.wallets", to: "/guides/wallets" },
      {
        label: "Account Reads",
        labelKey: "navigation.sidebar.accountReads",
        to: "/guides/account-reads",
      },
      {
        label: "Transactions",
        labelKey: "navigation.sidebar.transactions",
        to: "/guides/transactions",
      },
      {
        label: "Message Signing",
        labelKey: "navigation.sidebar.messageSigning",
        to: "/guides/message-signing",
      },
      { label: "Errors", labelKey: "navigation.sidebar.errors", to: "/guides/errors" },
    ],
  },
  {
    title: "Packages",
    titleKey: "navigation.sidebar.packages",
    links: [
      {
        label: "@vue-solana/core",
        labelKey: "navigation.sidebar.corePackage",
        to: "/packages/core",
      },
      { label: "@vue-solana/vue", labelKey: "navigation.sidebar.vuePackage", to: "/packages/vue" },
      {
        label: "@vue-solana/nuxt",
        labelKey: "navigation.sidebar.nuxtPackage",
        to: "/packages/nuxt",
      },
    ],
  },
  {
    title: "Examples",
    titleKey: "navigation.sidebar.examples",
    links: [
      { label: "Live Demo", labelKey: "navigation.sidebar.liveDemo", to: "/demo" },
      { label: "Vue Vite", labelKey: "navigation.sidebar.vueVite", to: "/examples/vue-vite" },
      { label: "Nuxt", labelKey: "navigation.sidebar.nuxt", to: "/examples/nuxt" },
    ],
  },
  {
    title: "Roadmap",
    titleKey: "navigation.sidebar.roadmap",
    links: [{ label: "v1 Roadmap", labelKey: "navigation.sidebar.v1Roadmap", to: "/roadmap" }],
  },
];

export function isPrimaryNavLinkActive(currentPath: string, linkPath: string) {
  const basePath = linkPath.split("/").slice(0, 2).join("/") || "/";

  return currentPath === linkPath || (basePath !== "/" && currentPath.startsWith(basePath));
}

function stripLocalePrefix(currentPath: string, localizedLinkPath: string, linkPath: string) {
  if (localizedLinkPath === linkPath || !localizedLinkPath.endsWith(linkPath)) {
    return currentPath;
  }

  const localePrefix = localizedLinkPath.slice(0, -linkPath.length);

  if (currentPath === localePrefix) {
    return "/";
  }

  return currentPath.startsWith(`${localePrefix}/`)
    ? currentPath.slice(localePrefix.length)
    : currentPath;
}

export function createPrimaryNavigationItems(
  currentPath: string,
  resolveLocalePath: DocsLocalePathResolver = resolveDefaultLocalePath,
  resolveTranslation: DocsTranslationResolver = resolveDefaultTranslation,
): NavigationMenuItem[] {
  return primaryNavLinks.map((link) => {
    const localizedTo = resolveLocalePath(link.to);

    return {
      ...link,
      label: resolveTranslation(link.labelKey) || link.label,
      to: localizedTo,
      active: isPrimaryNavLinkActive(stripLocalePrefix(currentPath, localizedTo, link.to), link.to),
    };
  });
}

export function createSidebarNavigationItems(
  currentPath: string,
  resolveLocalePath: DocsLocalePathResolver = resolveDefaultLocalePath,
  resolveTranslation: DocsTranslationResolver = resolveDefaultTranslation,
): NavigationMenuItem[][] {
  return docsNavSections.map((section) => [
    {
      label: resolveTranslation(section.titleKey) || section.title,
      type: "label",
    },
    ...section.links.map((link) => ({
      ...link,
      label: resolveTranslation(link.labelKey) || link.label,
      to: resolveLocalePath(link.to),
      active: currentPath === resolveLocalePath(link.to),
    })),
  ]);
}
