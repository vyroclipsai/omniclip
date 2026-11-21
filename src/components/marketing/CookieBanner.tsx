"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, X } from "lucide-react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("omniclip_cookie_consent");
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("omniclip_cookie_consent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-sm p-4 rounded-2xl bg-background-surface/95 border border-border-default shadow-2xl backdrop-blur-xl flex items-start gap-3.5 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
        <ShieldCheck className="w-4 h-4" />
      </div>

      <div className="flex-1 text-xs text-gray-300 leading-relaxed">
        <p className="font-semibold text-white mb-0.5">Privacy First Processing</p>
        OmniClip runs locally on your machine. We use essential local storage to remember your workspace settings and clip projects.
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={accept}
            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Got it
          </button>
          <button
            onClick={() => setVisible(false)}
            className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>

      <button
        onClick={() => setVisible(false)}
        className="text-gray-500 hover:text-white transition-colors -mr-1 -mt-1 p-1"
        aria-label="Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
