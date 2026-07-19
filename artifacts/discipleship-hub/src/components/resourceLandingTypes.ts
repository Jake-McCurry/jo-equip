/* Types for ResourceLanding.astro — kept in a plain .ts file because
   exporting a multi-line union type from Astro frontmatter breaks the
   esbuild pass during `astro build`. */

export interface LinkItem {
  lead: string;
  rest?: string;
  href: string;
}

export type Section =
  | { kind: "links"; heading: string; items: LinkItem[] }
  | { kind: "playlists"; heading: string; ids: string[]; seeAll?: boolean }
  | { kind: "books"; heading: string; ids: string[]; seeAll?: boolean }
  | { kind: "cta"; heading: string; label: string; href: string };
