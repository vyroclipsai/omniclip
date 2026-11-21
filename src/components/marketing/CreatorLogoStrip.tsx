export default function CreatorLogoStrip() {
  const creators = [
    { name: "The Founders Show", subs: "1.2M Subs", tag: "Tech & Startups" },
    { name: "Daily Byte Podcast", subs: "840K Subs", tag: "Coding" },
    { name: "Elevate Media Lab", subs: "2.4M Views/mo", tag: "Agency" },
    { name: "Crypto Horizon", subs: "620K Subs", tag: "Finance" },
    { name: "Creator Playbook", subs: "450K Subs", tag: "Marketing" },
    { name: "NextGen Gaming", subs: "1.8M Subs", tag: "Gaming" },
    { name: "Mindset Architecture", subs: "910K Subs", tag: "Self Improvement" },
  ];

  return (
    <section className="py-14 border-y border-border-subtle/60 bg-background-deep/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Trusted by 500,000+ creators, agencies & top-charting podcasts
        </p>
      </div>

      {/* Marquee Lane */}
      <div className="relative w-full flex overflow-x-hidden">
        <div className="flex gap-4 shrink-0 animate-marquee py-2">
          {creators.concat(creators).map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-background-surface/80 border border-border-default/80 backdrop-blur-md shadow-sm shrink-0"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                {item.name[0]}
              </div>
              <div>
                <span className="text-sm font-semibold text-white mr-2">{item.name}</span>
                <span className="text-xs text-brand-300 font-mono font-medium">({item.subs})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Highlights Metrics Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-border-subtle">
          <div className="text-3xl sm:text-4xl font-extrabold text-white">25M+</div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">
            Viral Clips Created
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-border-subtle">
          <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">98.4%</div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">
            Hook Accuracy
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-border-subtle">
          <div className="text-3xl sm:text-4xl font-extrabold text-brand-400">10x</div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">
            Production Speed
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-border-subtle">
          <div className="text-3xl sm:text-4xl font-extrabold text-white">4.9 / 5</div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">
            Creator Satisfaction
          </div>
        </div>
      </div>
    </section>
  );
}
