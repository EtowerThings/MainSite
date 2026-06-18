import Image from "next/image";
import Link from "next/link";
import { ETOWER } from "@/lib/demo-data";

export function EtowerFooter() {
  return (
    <footer id="contact" className="border-t border-[#0A111F]/8 bg-[#0A111F] text-white py-16 px-4 sm:px-6 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-10">
          <div>
            <Image
              src="/etower-logo.png"
              alt="eTower"
              width={140}
              height={36}
              className="h-9 w-auto object-contain brightness-0 invert"
            />
            <p className="mt-4 text-sm text-white/60 max-w-xs leading-relaxed">
              Babson&apos;s premier entrepreneurial living community fostering innovation
              and collaboration.
            </p>
          </div>
          <div className="flex flex-wrap gap-12 sm:gap-16">
            <div>
              <p className="text-sm font-semibold mb-4">Quick Links</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/#residents" className="hover:text-[#b6e36e] transition-colors">Current Residents</Link></li>
                <li><Link href="/#alumni" className="hover:text-[#b6e36e] transition-colors">Alumni Network</Link></li>
                <li><Link href="/our-story" className="hover:text-[#b6e36e] transition-colors">Our Story</Link></li>
                <li><Link href="/startups" className="hover:text-[#b6e36e] transition-colors">Startups</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold mb-4">Get Involved</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/#join" className="hover:text-[#b6e36e] transition-colors">Join eTower</Link></li>
                <li><a href={`mailto:${ETOWER.email}`} className="hover:text-[#b6e36e] transition-colors">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold mb-4">Contact</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li>
                  <a href={`mailto:${ETOWER.email}`} className="hover:text-[#b6e36e] transition-colors">
                    {ETOWER.email}
                  </a>
                </li>
                <li>Babson College, Wellesley, MA</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/40">
          <p>© {new Date().getFullYear()} eTower. All rights reserved.</p>
          <div className="flex gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
