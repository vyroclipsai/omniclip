import { Star } from "lucide-react";

export default function TestimonialsMarquee() {
  const reviews = [
    {
      name: "Marcus Vance",
      role: "Host of Founder's Hour",
      text: "OmniClip turned our 90-minute episodes into 14 viral TikToks overnight. One of them hit 3.4M views in 48 hours.",
      avatar: "MV",
      rating: 5,
    },
    {
      name: "Elena Rostova",
      role: "Lead Growth Producer",
      text: "The karaoke captions and face tracking are so accurate that our video editors only spend 2 minutes reviewing before publishing.",
      avatar: "ER",
      rating: 5,
    },
    {
      name: "Derek Chen",
      role: "YouTube Creator (850K Subs)",
      text: "The Virality Score is scary good. Every clip scoring 90+ has outperformed our own manual editor picks consistently.",
      avatar: "DC",
      rating: 5,
    },
    {
      name: "Sarah Jenkins",
      role: "SaaS Content Lead",
      text: "We repurpose every customer webinar into a month of LinkedIn and YouTube shorts with zero friction. Massive ROI.",
      avatar: "SJ",
      rating: 5,
    },
    {
      name: "Liam O'Connor",
      role: "Podcast Producer",
      text: "Running this tool locally on our machine is a game changer for speed, security, and cost. We will never go back.",
      avatar: "LO",
      rating: 5,
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-background-base overflow-hidden border-t border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-4">
          Proven Social Results
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
          Loved by creators with millions of views
        </h2>
        <p className="text-base sm:text-lg text-gray-400">
          See why top creators and media agencies rely on OmniClip to produce their short-form pipeline.
        </p>
      </div>

      {/* Marquee Row 1 */}
      <div className="relative w-full flex overflow-x-hidden mb-6">
        <div className="flex gap-6 shrink-0 animate-marquee py-2">
          {reviews.concat(reviews).map((r, i) => (
            <div
              key={i}
              className="w-[360px] p-6 rounded-2xl bg-background-surface/90 border border-border-default/90 backdrop-blur-md shadow-xl flex flex-col justify-between shrink-0"
            >
              <div>
                <div className="flex items-center gap-1 text-yellow-400 mb-4">
                  {[...Array(r.rating)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed font-normal mb-6">
                  &ldquo;{r.text}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border-subtle/80">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
                  {r.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{r.name}</div>
                  <div className="text-xs text-gray-400">{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
