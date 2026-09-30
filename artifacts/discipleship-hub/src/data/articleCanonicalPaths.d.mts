export const ARTICLE_REDIRECTS: Readonly<Record<string, string>>;
export function canonicalArticlePath(path: string): string;
export function isRetiredArticlePath(path: string): boolean;
export function articleRedirectLocation(requestUrl: string, base?: string): string | undefined;
export function canonicalArticleHref(href: string, pagePath?: string, base?: string): string;
export function canonicalizeArticleLinks<T>(value: T): T;