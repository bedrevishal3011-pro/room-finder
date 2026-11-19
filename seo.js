
(() => {
  "use strict";

  const SEO = {
    site: "https://room-finder-nkuy.vercel.app/",
    name: "Room Finder",
    title: "Room Finder | विद्यार्थ्यांसाठी रूम, फ्लॅट आणि PG शोधा",
    description:
      "विद्यार्थ्यांसाठी कॉलेजजवळ भाड्याने रूम, फ्लॅट आणि PG शोधा. शहर, एरिया, कॉलेज आणि बजेटनुसार पर्याय पाहा. घरमालकांशी थेट संपर्क साधा.",
    language: "mr-IN",
    image: "https://room-finder-nkuy.vercel.app/og-image.png"
  };

  document.title = SEO.title;

  function setMeta(key, value, property = false) {
    const attr = property ? "property" : "name";
    let el = document.head.querySelector(
      `meta[${attr}="${key}"]`
    );

    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }

    el.setAttribute("content", value);
  }

  // Basic SEO
  setMeta("description", SEO.description);
  setMeta("robots", "index, follow, max-image-preview:large");
  setMeta("googlebot", "index, follow, max-image-preview:large");
  setMeta("theme-color", "#142B52");
  setMeta("author", "Room Finder");
  setMeta("language", SEO.language);

  // Open Graph
  setMeta("og:type", "website", true);
  setMeta("og:site_name", SEO.name, true);
  setMeta("og:title", SEO.title, true);
  setMeta("og:description", SEO.description, true);
  setMeta("og:url", SEO.site, true);
  setMeta("og:locale", "mr_IN", true);
  setMeta("og:image", SEO.image, true);
  setMeta("og:image:alt", "Room Finder - Find rooms for students", true);

  // Twitter
  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:title", SEO.title);
  setMeta("twitter:description", SEO.description);
  setMeta("twitter:image", SEO.image);

  // Canonical URL
  let canonical = document.head.querySelector(
    'link[rel="canonical"]'
  );

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }

  canonical.href = SEO.site;

  // Structured data: Website
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SEO.name,
    "url": SEO.site,
    "description": SEO.description,
    "inLanguage": ["mr-IN", "en-IN"]
  };

  let jsonLd = document.getElementById("roomfinder-seo-schema");

  if (!jsonLd) {
    jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.id = "roomfinder-seo-schema";
    document.head.appendChild(jsonLd);
  }

  jsonLd.textContent = JSON.stringify(schema);
})();
