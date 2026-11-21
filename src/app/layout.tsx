import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://integration-kim-bedrooms-stake.trycloudflare.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OmniClip AI: #1 Free AI Video Clipping & Shorts Generator",
    template: "%s | OmniClip AI",
  },
  description:
    "Convert long YouTube videos and podcasts into viral TikTok, Reels, and Shorts in 1 click. 100% Free & Open Source AI video clipper with smart face tracking, animated karaoke captions, and virality scoring.",
  keywords: [
    "AI video clipper",
    "Opus Clip free alternative",
    "YouTube to shorts generator",
    "TikTok clips maker",
    "Instagram Reels maker",
    "Free AI video editor",
    "Podcast to clips",
    "Karaoke captions generator",
    "Smart face crop 9:16",
    "Auto viral clips",
    "Whisper transcription",
    "Open source AI clipper"
  ],
  authors: [{ name: "OmniClip AI Team" }],
  creator: "OmniClip AI",
  publisher: "OmniClip AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "OmniClip AI: #1 Free AI Video Clipping & Shorts Generator",
    description:
      "Turn long YouTube videos and podcasts into viral TikTok, Reels, and Shorts in seconds. 100% Free & Open Source AI video clipper with smart face tracking and animated karaoke captions.",
    url: siteUrl,
    siteName: "OmniClip AI",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OmniClip AI - #1 Free AI Video Clipping SaaS",
    description:
      "Turn long YouTube videos into viral TikToks and Reels in seconds. 100% Free & Open Source.",
    creator: "@omniclip_ai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "googleb70798f168cc42db",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "OmniClip AI",
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "Web, Windows, macOS, Linux",
      "description":
        "Professional open-source AI video clipping platform that turns long YouTube videos and podcasts into viral short-form clips with animated karaoke captions and smart face reframe.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "1284",
        "bestRating": "5",
        "worstRating": "1",
      },
      "featureList": [
        "1-Click YouTube to Viral Shorts",
        "Smart Face-Tracking Reframe (9:16, 4:5, 1:1, 16:9)",
        "Animated Karaoke Captions (Yellow, Neon Green, Cyber Cyan)",
        "6-Factor AI Virality Scoring Rubric",
        "Built-in Studio Editor with Transcript Trimming",
        "100% Free and Open Source (Zero credits or paywalls)"
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      "url": siteUrl,
      "name": "OmniClip AI",
      "description": "Free AI Video Clipping & Viral Shorts Generator",
      "inLanguage": "en-US",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-background-deep text-text-primary antialiased selection:bg-brand-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
