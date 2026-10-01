import type { NavigationMenuItem } from "@nuxt/ui";

export type DocsNavLink = {
  labelKey: string;
  to: string;
  icon?: string;
};

export type DocsNavSection = {
  titleKey: string;
  links: DocsNavLink[];
};

export type DocsLocalePathResolver = (path: string) => string;
export type DocsTranslationResolver = (key: string) => string;

export const primaryNavLinks: DocsNavLink[] = [
  { labelKey: "navigation.primary.getStarted", to: "/getting-started" },
  { labelKey: "navigation.primary.concepts", to: "/concepts/solana-for-vue-developers" },
  { labelKey: "navigation.primary.guides", to: "/guides/rpc-and-clusters" },
  { labelKey: "navigation.primary.demo", to: "/demo" },
  { labelKey: "navigation.primary.roadmap", to: "/roadmap" },
];

export const externalNavLinks: DocsNavLink[] = [
  {
    labelKey: "navigation.external.github",
    to: "https://github.com/vue-solana/vue-solana",
    icon: "i-simple-icons-github",
  },
  {
    labelKey: "navigation.external.npm",
    to: "https://www.npmjs.com/org/vue-solana",
    icon: "i-simple-icons-npm",
  },
];

export const docsNavSections: DocsNavSection[] = [
  {
    titleKey: "navigation.sidebar.start",
    links: [
      { labelKey: "navigation.sidebar.overview", to: "/" },
      { labelKey: "navigation.sidebar.gettingStarted", to: "/getting-started" },
      { labelKey: "navigation.sidebar.agentSkill", to: "/agent-skill" },
      { labelKey: "navigation.sidebar.troubleshooting", to: "/troubleshooting" },
      { labelKey: "navigation.sidebar.developers", to: "/developers" },
    ],
  },
  {
    titleKey: "navigation.sidebar.concepts",
    links: [
      {
        labelKey: "navigation.sidebar.solanaForVueDevelopers",
        to: "/concepts/solana-for-vue-developers",
      },
      { labelKey: "navigation.sidebar.clusters", to: "/concepts/clusters" },
    ],
  },
  {
    titleKey: "navigation.sidebar.guides",
    links: [
      { labelKey: "navigation.sidebar.kitMigration", to: "/guides/kit-migration" },
      { labelKey: "navigation.sidebar.rpcAndClusters", to: "/guides/rpc-and-clusters" },
      { labelKey: "navigation.sidebar.wallets", to: "/guides/wallets" },
      { labelKey: "navigation.sidebar.accountReads", to: "/guides/account-reads" },
      { labelKey: "navigation.sidebar.transactions", to: "/guides/transactions" },
      { labelKey: "navigation.sidebar.messageSigning", to: "/guides/message-signing" },
      { labelKey: "navigation.sidebar.errors", to: "/guides/errors" },
    ],
  },
  {
    titleKey: "navigation.sidebar.packages",
    links: [
      { labelKey: "navigation.sidebar.corePackage", to: "/packages/core" },
      { labelKey: "navigation.sidebar.vuePackage", to: "/packages/vue" },
      { labelKey: "navigation.sidebar.nuxtPackage", to: "/packages/nuxt" },
    ],
  },
  {
    titleKey: "navigation.sidebar.examples",
    links: [
      { labelKey: "navigation.sidebar.liveDemo", to: "/demo" },
      { labelKey: "navigation.sidebar.vueVite", to: "/examples/vue-vite" },
      { labelKey: "navigation.sidebar.nuxt", to: "/examples/nuxt" },
    ],
  },
  {
    titleKey: "navigation.sidebar.roadmap",
    links: [{ labelKey: "navigation.sidebar.roadmapPage", to: "/roadmap" }],
  },
  {
    titleKey: "navigation.sidebar.project",
    links: [
      { labelKey: "navigation.sidebar.about", to: "/about" },
      { labelKey: "navigation.sidebar.contact", to: "/contact" },
      { labelKey: "navigation.sidebar.privacy", to: "/privacy" },
    ],
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
  resolveLocalePath: DocsLocalePathResolver,
  resolveTranslation: DocsTranslationResolver,
): NavigationMenuItem[] {
  return primaryNavLinks.map((link) => {
    const localizedTo = resolveLocalePath(link.to);

    return {
      ...link,
      label: resolveTranslation(link.labelKey),
      to: localizedTo,
      active: isPrimaryNavLinkActive(stripLocalePrefix(currentPath, localizedTo, link.to), link.to),
    };
  });
}

export function createSidebarNavigationItems(
  currentPath: string,
  resolveLocalePath: DocsLocalePathResolver,
  resolveTranslation: DocsTranslationResolver,
): NavigationMenuItem[][] {
  return docsNavSections.map((section) => [
    {
      label: resolveTranslation(section.titleKey),
      type: "label",
    },
    ...section.links.map((link) => ({
      ...link,
      label: resolveTranslation(link.labelKey),
      to: resolveLocalePath(link.to),
      active: currentPath === resolveLocalePath(link.to),
    })),
  ]);
}
