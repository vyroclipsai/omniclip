import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://integration-kim-bedrooms-stake.trycloudflare.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/projects", "/status", "/settings"],
        disallow: ["/api/", "/data/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "Bingbot",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
