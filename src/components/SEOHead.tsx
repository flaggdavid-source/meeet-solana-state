import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  type?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown>;
}

const BASE_URL = "https://meeet.world";
const DEFAULT_OG = `${BASE_URL}/og-image.png`;

const setMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;

  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }

  el.setAttribute("content", content);
};

const setCanonical = (href: string) => {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }

  el.href = href;
};

const setJsonLd = (jsonLd?: Record<string, unknown>) => {
  const selector = 'script[data-meeet-seo="jsonld"]';
  const existing = document.querySelector(selector);

  if (!jsonLd) {
    existing?.remove();
    return;
  }

  let script = existing as HTMLScriptElement | null;

  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-meeet-seo", "jsonld");
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(jsonLd);
};

const SEOHead = ({ title, description, ogImage = DEFAULT_OG, type, ogType, jsonLd }: SEOHeadProps) => {
  const location = useLocation();
  const url = `${BASE_URL}${location.pathname}`;
  const resolvedType = ogType || type || "website";

  useEffect(() => {
    document.title = title;

    setMeta("name", "description", description);
    setMeta("property", "og:type", resolvedType);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:site", "@Meeetworld");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);

    setCanonical(url);
    setJsonLd(jsonLd);
  }, [description, jsonLd, ogImage, resolvedType, title, url]);

  return null;
};

export default SEOHead;
