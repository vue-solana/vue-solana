const SITE_URL = "https://vue-solana-docs.vercel.app";
const SITE_NAME = "Vue Solana";
const SITE_DESCRIPTION =
  "Documentation for Vue and Nuxt libraries that help developers use Solana.";

type JsonLdNode = Record<string, unknown>;

export interface DocsPageStructuredDataInput {
  path: string;
  title: string;
  description: string;
  section?: string;
}

export function createDocsPageStructuredData(input: DocsPageStructuredDataInput): JsonLdNode {
  const pageUrl = createAbsoluteUrl(input.path);
  const pageId = `${pageUrl}#webpage`;
  const organizationId = `${SITE_URL}/#organization`;
  const websiteId = `${SITE_URL}/#website`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const articleId = `${pageUrl}#article`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.png`,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        publisher: { "@id": organizationId },
      },
      {
        "@type": "WebPage",
        "@id": pageId,
        url: pageUrl,
        name: `${input.title} - ${SITE_NAME}`,
        description: input.description,
        isPartOf: { "@id": websiteId },
        breadcrumb: { "@id": breadcrumbId },
        mainEntity: { "@id": articleId },
      },
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: createBreadcrumbItems(input.path, input.title),
      },
      {
        "@type": "TechArticle",
        "@id": articleId,
        headline: input.title,
        description: input.description,
        articleSection: input.section ?? "Documentation",
        author: { "@id": organizationId },
        publisher: { "@id": organizationId },
        mainEntityOfPage: { "@id": pageId },
      },
    ],
  };
}

export function serializeJsonLd(data: JsonLdNode): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function createAbsoluteUrl(path: string): string {
  if (path === "/") {
    return SITE_URL;
  }

  return `${SITE_URL}/${path.replace(/^\/+|\/+$/g, "")}`;
}

function createBreadcrumbItems(path: string, pageTitle: string): JsonLdNode[] {
  const segments = path.split("/").filter(Boolean);
  const items: JsonLdNode[] = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
  ];

  segments.forEach((segment, index) => {
    const itemPath = `/${segments.slice(0, index + 1).join("/")}`;
    const isLast = index === segments.length - 1;

    items.push({
      "@type": "ListItem",
      position: index + 2,
      name: isLast ? pageTitle : formatBreadcrumbSegment(segment),
      item: createAbsoluteUrl(itemPath),
    });
  });

  return items;
}

function formatBreadcrumbSegment(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
