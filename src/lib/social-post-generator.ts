export interface PlatformPost {
  title?: string;
  hook?: string;
  caption: string;
  callToAction?: string;
  hashtags: string[];
  fullText: string;
}

export interface SocialMediaPostBundle {
  tiktok: PlatformPost;
  youtubeShorts: PlatformPost;
  reels: PlatformPost;
  linkedin: PlatformPost;
}

const COMMON_VIRAL_HASHTAGS = [
  "#shorts",
  "#viral",
  "#fyp",
  "#trending",
  "#mindset",
  "#success",
  "#motivation",
  "#growth",
  "#lifeadvice",
  "#podcastclips",
];

export function generateSocialMediaPosts(
  title: string,
  transcriptText: string,
  suggestedHook?: string,
  viralityScore?: number
): SocialMediaPostBundle {
  const cleanTitle = (title || "Mind-Blowing Viral Insight").replace(/^["']|["']$/g, "").trim();
  const hook = suggestedHook || `Wait until you hear this... 🤯`;
  const snippet = transcriptText.trim()
    ? transcriptText.slice(0, 220).replace(/\s+/g, " ").trim() + (transcriptText.length > 220 ? "..." : "")
    : cleanTitle;

  // Extract key topic nouns for dynamic hashtags
  const topicWords = transcriptText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !["about", "there", "their", "would", "could", "should", "really", "because", "people"].includes(w));
  
  const uniqueTopics = Array.from(new Set(topicWords)).slice(0, 4);
  const dynamicHashtags = uniqueTopics.map((t) => `#${t}`);
  const hashtags = Array.from(new Set([...dynamicHashtags, ...COMMON_VIRAL_HASHTAGS])).slice(0, 7);

  // 1. TikTok Post
  const tiktokCaption = `${cleanTitle} 🔥\n\n${hook}\n\n👇 Drop your thoughts in the comments!`;
  const tiktokFull = `${tiktokCaption}\n\n${hashtags.join(" ")}`;

  // 2. YouTube Shorts Post
  const ytTitle = `${cleanTitle} 🤯 #shorts`.slice(0, 95);
  const ytDescription = `${cleanTitle}\n\n"${snippet}"\n\nSubscribe for daily clips and high-impact moments! 🚀\n\n${hashtags.join(" ")}`;

  // 3. Instagram Reels Post
  const reelsCaption = `Did this change how you think? 👀\n\n${cleanTitle}\n\nKey moment: "${snippet}"\n\n💡 Save this reel for later and share it with someone who needs to hear it.`;
  const reelsFull = `${reelsCaption}\n\n.\n.\n.\n${hashtags.join(" ")}`;

  // 4. LinkedIn Post
  const linkedinHeadline = `A powerful insight on ${uniqueTopics[0] || "perspective"} and growth:`;
  const linkedinTakeaways = [
    `• Core takeaway: ${cleanTitle}`,
    `• Context: "${snippet}"`,
    `• Why it matters: High performance comes from questioning default assumptions.`,
  ];
  const linkedinClosing = `What's your take on this? Let's discuss below. 👇`;
  const linkedinFull = `${linkedinHeadline}\n\n${linkedinTakeaways.join("\n")}\n\n${linkedinClosing}\n\n#Leadership #PersonalGrowth #Productivity #Mindset #Insights`;

  return {
    tiktok: {
      caption: tiktokCaption,
      hashtags,
      fullText: tiktokFull,
    },
    youtubeShorts: {
      title: ytTitle,
      caption: ytDescription,
      hashtags,
      fullText: `${ytTitle}\n\n${ytDescription}`,
    },
    reels: {
      hook,
      caption: reelsCaption,
      callToAction: "Save this reel and share with a friend!",
      hashtags,
      fullText: reelsFull,
    },
    linkedin: {
      title: linkedinHeadline,
      caption: linkedinTakeaways.join("\n"),
      callToAction: linkedinClosing,
      hashtags: ["#Leadership", "#PersonalGrowth", "#Productivity", "#Mindset"],
      fullText: linkedinFull,
    },
  };
}
