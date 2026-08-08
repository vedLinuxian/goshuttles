import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { ShieldCheck, Route, Mail, Phone, ExternalLink } from "lucide-react";

export function PublicFooter() {
  return (
    <footer id="support" className="border-t border-slate-800/80 bg-slate-950 text-slate-400 font-sans">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 pb-12 border-b border-slate-800/80">
          {/* Col 1: Brand & Bio */}
          <div className="space-y-4">
            <BrandMark />
            <p className="text-xs leading-relaxed text-slate-400">
              Next-generation daily intercity shuttle mobility platform. Guaranteed seating, atomic seat locking, verified drivers, and live location tracking.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>System Uptime 99.98%</span>
            </div>
          </div>

          {/* Col 2: Corridors */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-200">Express Corridors</p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#search" className="hover:text-amber-400 transition-colors">Lucknow ↔ Ayodhya (120 min)</Link>
              </li>
              <li>
                <Link href="/#search" className="hover:text-amber-400 transition-colors">Lucknow ↔ Varanasi Express</Link>
              </li>
              <li>
                <Link href="/#search" className="hover:text-amber-400 transition-colors">Ayodhya ↔ Gorakhpur Hub</Link>
              </li>
              <li>
                <Link href="/#search" className="hover:text-amber-400 transition-colors">Kanpur ↔ Lucknow Shuttle</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-200">Platform Portal</p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/login" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                  <span>Passenger Sign In</span>
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                  <span>Driver Partner Portal</span>
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                  <span>Admin Control Deck</span>
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-amber-400 transition-colors">Register New Account</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Support */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-200">24/7 Operations Command</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Have questions about your booking, seat lock, or driver verification? Our dispatch team is online.
            </p>
            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="h-3.5 w-3.5 text-amber-400" />
                <span>support@goshuttles.com</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="h-3.5 w-3.5 text-amber-400" />
                <span>+91 1800-SHUTTLE (Toll-Free)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} GoShuttles Mobility Technologies. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Secure SSL Encrypted
            </span>
            <span className="flex items-center gap-1">
              <Route className="h-4 w-4 text-amber-400" /> Intercity Daily Network
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
