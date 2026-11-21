import Link from "next/link";
import { Sparkles, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-background-deep border-t border-border-default pt-16 pb-12 text-gray-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-border-subtle">
          {/* Column 1: Brand Info */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">OmniClip AI</span>
            </Link>
            <p className="text-xs sm:text-sm text-gray-400 max-w-sm mb-6 leading-relaxed">
              The #1 AI video clipping and editing engine designed to turn long-form recordings into viral social shorts with automated speech transcription, reframing, and animated karaoke subtitles.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational (100% Local Engine)</span>
            </div>
          </div>

          {/* Column 2: Product */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><Link href="/app" className="hover:text-white transition-colors">AI Clipping</Link></li>
              <li><Link href="/app" className="hover:text-white transition-colors">Karaoke Captions</Link></li>
              <li><Link href="/app" className="hover:text-white transition-colors">Smart 9:16 Reframe</Link></li>
              <li><Link href="/app" className="hover:text-white transition-colors">Audio Magic</Link></li>
              <li><Link href="/app" className="hover:text-white transition-colors">AutoHighlight Engine</Link></li>
              <li><Link href="/settings" className="hover:text-white transition-colors">Diagnostics & Settings</Link></li>
            </ul>
          </div>

          {/* Column 3: Solutions */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-4">
              Solutions
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><Link href="/app" className="hover:text-white transition-colors">For Podcasters</Link></li>
              <li><Link href="/app" className="hover:text-white transition-colors">For YouTubers</Link></li>
              <li><Link href="/app" className="hover:text-white transition-colors">For Video Agencies</Link></li>
              <li><Link href="/app" className="hover:text-white transition-colors">For Educators</Link></li>
              <li><Link href="/app" className="hover:text-white transition-colors">Clip Studio</Link></li>
            </ul>
          </div>

          {/* Column 4: Resources & Legal */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-4">
              Resources & Legal
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><Link href="#faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/app" className="hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar with Language Switcher */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>
            © {new Date().getFullYear()} OmniClip AI, Inc. Clean-room engineered clone. All rights reserved.
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-border-default text-gray-300">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <span>English (US)</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
