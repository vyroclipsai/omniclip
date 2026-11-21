import { Upload, Sparkles, Sliders, Download } from "lucide-react";

export default function WorkflowSection() {
  const steps = [
    {
      num: "01",
      title: "Drop Link or Upload",
      desc: "Paste any YouTube, Zoom, or podcast URL or drag-and-drop your local MP4 file directly.",
      icon: Upload,
      color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
    },
    {
      num: "02",
      title: "AI Finds the Gold",
      desc: "OmniClip listens with Whisper, calculates virality scores, and reframes subjects to 9:16.",
      icon: Sparkles,
      color: "from-brand-500/20 to-purple-500/20 text-brand-400 border-brand-500/30",
    },
    {
      num: "03",
      title: "Fine-Tune in Studio",
      desc: "Review your clips, tweak caption text, adjust timings, and pick your favorite subtitle style.",
      icon: Sliders,
      color: "from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/30",
    },
    {
      num: "04",
      title: "1-Click HD Export",
      desc: "Download crisp 1080x1920 MP4 files formatted and ready to upload to TikTok, Shorts, and Reels.",
      icon: Download,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-background-surface/50 border-t border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-4">
            How It Works
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            From raw footage to published clips in 3 minutes
          </h2>
          <p className="text-base sm:text-lg text-gray-400">
            A frictionless automated workflow designed to save 20+ hours of tedious video editing every week.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-background-surface/90 border border-border-default/90 p-6 flex flex-col justify-between shadow-xl backdrop-blur-md relative group hover:border-brand-500/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-black font-mono text-gray-600 group-hover:text-brand-400 transition-colors">
                      {step.num}
                    </span>
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${step.color} border flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-border-subtle/80 flex items-center text-xs font-medium text-brand-300">
                  Step {idx + 1} of 4
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
