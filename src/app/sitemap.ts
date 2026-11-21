import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://integration-kim-bedrooms-stake.trycloudflare.com";
  const now = new Date();

  return [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: now,
      changeFrequency: "always",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/status`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/settings`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];
}
