import { Cpu, Eye, Zap, ShieldCheck } from "lucide-react";

export default function AIModelsSection() {
  return (
    <section className="py-20 md:py-28 bg-background-deep relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-4">
            Custom-Trained Media Models
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Engineered with proprietary video intelligence
          </h2>
          <p className="text-base sm:text-lg text-gray-400">
            Unlike generic LLM wrappers, OmniClip combines multi-modal computer vision with fine-tuned audio transcription engines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Model 1: AutoHighlight */}
          <div className="rounded-3xl bg-background-surface/80 border border-border-default/80 p-8 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-brand-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/40 flex items-center justify-center text-brand-400 mb-6 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-2xl font-bold text-white">AutoHighlight™ Engine</h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                v2.5
              </span>
            </div>

            <p className="text-gray-400 text-sm sm:text-base mb-6 leading-relaxed">
              Trained on over 100,000 top-performing viral TikToks and YouTube Shorts to identify storytelling cadences, punchlines, and narrative tension points.
            </p>

            <ul className="space-y-3 text-sm text-gray-300 border-t border-border-subtle pt-6">
              <li className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-brand-400" />
                Multi-factor virality scoring (0–100)
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Automatic filler-word extraction without audible clipping
              </li>
              <li className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-cyan-400" />
                Identifies optimal hook duration (1.8s - 3.2s)
              </li>
            </ul>
          </div>

          {/* Model 2: SmartReframe */}
          <div className="rounded-3xl bg-background-surface/80 border border-border-default/80 p-8 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-cyan-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <Eye className="w-6 h-6" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-2xl font-bold text-white">SmartReframe™ Vision</h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Active
              </span>
            </div>

            <p className="text-gray-400 text-sm sm:text-base mb-6 leading-relaxed">
              Real-time deep learning facial geometry and speaker gesture tracker that seamlessly transitions focus between active speakers without dizzying camera swings.
            </p>

            <ul className="space-y-3 text-sm text-gray-300 border-t border-border-subtle pt-6">
              <li className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                Sub-pixel facial landmark anchoring
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Dynamic split-screen mode for dialogue exchanges
              </li>
              <li className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-brand-400" />
                Maintains vertical composition balance (Golden Ratio)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
