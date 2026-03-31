"use client";

import Link from "next/link";
import {
  Users,
  FolderKanban,
  BookOpen,
  MessageCircle,
  Trophy,
  ArrowRight,
  Sparkles,
  Terminal,
  Zap,
  Shield,
  ChevronRight,
} from "lucide-react";
import { PublicNav } from "@/components/public-nav";
import { BootSequence } from "@/components/boot-sequence";
import { useOptionalAuth } from "@/contexts/auth-context";
import { useProjects, useDashboardStats } from "@/hooks/useFirestore";
import Image from "next/image";

export default function LandingPage() {
  const { user } = useOptionalAuth();
  const { data: projects, loading: projectsLoading } = useProjects();
  const { stats: dashboardStats, loading: statsLoading } = useDashboardStats();
  const featuredProject = projects?.[0];

  const features = [
    { icon: <Users className="w-5 h-5" />, title: "MEMBER_MGMT", subtitle: "Member Management", description: "Track attendance, manage roles, and monitor engagement metrics for all club members." },
    { icon: <FolderKanban className="w-5 h-5" />, title: "PROJECT_SYS", subtitle: "Project Ecosystem", description: "Dual-view dashboards for internal teams and external clients. Full milestone tracking." },
    { icon: <BookOpen className="w-5 h-5" />, title: "RESOURCE_LIB", subtitle: "Resource Library", description: "Curated guides and community resources with search, filters, and approval workflows." },
    { icon: <MessageCircle className="w-5 h-5" />, title: "WA_AUTOMATE", subtitle: "WhatsApp Automation", description: "Automated broadcasts, deadline alerts, and check-ins via WhatsApp Business API." },
    { icon: <Sparkles className="w-5 h-5" />, title: "AI_CASESTUDY", subtitle: "AI Case Studies", description: "Synthesize team reflections into professional case studies using AI." },
    { icon: <Trophy className="w-5 h-5" />, title: "HALL_OF_FAME", subtitle: "Hall of Fame", description: "Public portfolio showcasing completed projects with live demos and case studies." },
  ];

  const stats = [
    { label: "ACTIVE_USERS", value: statsLoading ? "—" : user ? String(dashboardStats.totalMembers) : "—", unit: "members" },
    { label: "PROJECTS_SHIPPED", value: statsLoading ? "—" : String(dashboardStats.totalProjects), unit: "deployed" },
    { label: "RESOURCES_DB", value: statsLoading ? "—" : user ? String(dashboardStats.totalResources) : "—", unit: "indexed" },
    { label: "ACTIVE_PROJECTS", value: statsLoading ? "—" : String(dashboardStats.activeProjects), unit: "in progress" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* OS Boot Sequence Overlay */}
      <BootSequence />

      {/* Grid Background */}
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-60" />

      {/* Neon glow orbs */}
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"
        style={{ background: "radial-gradient(circle, #cbf702, transparent)" }}
      />
      <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-10"
        style={{ background: "radial-gradient(circle, #cbf702, transparent)" }}
      />

      {/* 3D Spline Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen dark:mix-blend-plus-lighter">
        {/* @ts-ignore - Spline custom element */}
        <spline-viewer url="https://prod.spline.design/KEoJupvnSvtyG8FR/scene.splinecode"></spline-viewer>
      </div>

      <PublicNav />

      {/* ═══ CYBERPUNK GLITCH HERO SECTION ═══ */}
      <section className="relative z-10 w-full min-h-[90vh] flex flex-col items-center justify-center pt-20 pb-10 overflow-visible">

        {/* Floating Code Snippets (Background Chaos) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div className="absolute top-[20%] left-[5%] text-[10px] font-mono text-primary/20 whitespace-pre opacity-50 animate-pulse" style={{ animationDuration: '3s' }}>
            {`function initSync() {
  const p = process.memoryUsage();
  return (p.heapUsed / 1024 / 1024);
}`}
          </div>
          <div className="absolute top-[60%] right-[10%] text-[8px] font-mono text-chart-1/30 whitespace-pre opacity-30 transform rotate-90">
            {`01011000 01001101 01001100
ERR_CONNECTION_REFUSED
<SYSERR_0x000F8A>`}
          </div>
          <div className="absolute bottom-[15%] left-[15%] text-[12px] font-mono text-chart-2/40 uppercase tracking-widest border-l-2 border-chart-2/50 pl-2">
            OVERRIDE PROTOCOL ENABLED<br />
            AWAITING INPUT...
          </div>
        </div>

        {/* The Brutalist Core */}
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-10">

          <div className="flex-1 relative z-20">
            {/* Erratic System Status */}
            <div className="inline-flex flex-col gap-1 mb-6 animate-fade-in group">
              <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest w-fit glitch-text hover:bg-foreground hover:text-background transition-colors cursor-crosshair" data-text="SYSTEM: OFFLINE">
                SYSTEM: OFFLINE
              </div>
              <div className="text-[10px] font-mono text-muted-foreground/50 tracking-widest pl-1">CONNECTING TO HOST_BABSON_CODE...</div>
            </div>

            {/* Chaotic Title */}
            <h1 className="text-6xl sm:text-7xl md:text-[9rem] font-black tracking-tighter leading-[0.8] mb-8 relative mix-blend-difference z-20 transform -translate-x-2 translate-y-1 skew-x-2 skew-y-1 hover:-translate-x-4 hover:translate-y-2 hover:skew-x-3 hover:skew-y-2 transition-transform duration-300 cursor-crosshair">
              <span className="block text-transparent bg-clip-text bg-foreground glitch-text" data-text="WELCOME" style={{ WebkitTextStroke: '2px var(--primary)' }}>WELCOME</span>
              <span className="block text-foreground glitch-text mt-[-10px] md:mt-[-20px] ml-[20px] md:ml-[40px]" data-text="TO">TO</span>
              <span className="block text-primary glitch-text mt-[-10px] md:mt-[-20px] ml-[40px] md:ml-[80px] brutalist-text-shadow bg-background px-4 py-2 w-fit" data-text="CODE.">CODE.</span>
            </h1>

            {/* Brutalist Subtitle Box */}
            <div className="relative w-full max-w-xl brutalist-block bg-background/90 p-4 z-30 mb-8 hover:-translate-x-1 hover:translate-y-1 hover:skew-x-1 transition-none">
              <div className="absolute -top-3 -right-3 bg-chart-1 text-chart-1-foreground text-[10px] font-mono font-black px-2 py-1 transform rotate-12">CRITICAL MSG</div>
              <p className="text-sm md:text-base font-mono leading-snug text-foreground cursor-text selection:bg-primary selection:text-primary-foreground">
                <span className="bg-primary text-primary-foreground font-bold px-1">CODE</span> (Community of Developers & Entrepreneurs) is Babson College's premier technology organization. We bridge the gap between business and technology through hands-on development, technical workshops, and real-world client projects.
              </p>
              <div className="mt-3 flex gap-2">
                <span className="w-2 h-2 bg-primary rounded-none animate-pulse"></span>
                <span className="w-2 h-2 bg-chart-1 rounded-none animate-ping"></span>
                <span className="w-2 h-2 bg-chart-2 rounded-none"></span>
              </div>
            </div>

            {/* Live stats from DB */}
            <div className="flex flex-wrap gap-3 mt-6">
              {stats.map((s) => (
                <div key={s.label} className="px-3 py-1.5 border border-primary/30 bg-background/80 font-mono text-[10px] uppercase tracking-widest">
                  <span className="text-primary font-black">{s.value}</span>
                  <span className="text-muted-foreground ml-1">{s.unit}</span>
                  <span className="text-muted-foreground/60 ml-1">// {s.label}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons - Removed View Archives, Dashboard button is now built into the HUD on the right */}
          </div>

          <div className="hidden lg:block w-[400px] h-[500px] relative z-10 select-none pointer-events-none">
            {/* A chaotic decorative element on the right side since spline is background */}
            <div className="absolute inset-0 opacity-60 mix-blend-exclusion pointer-events-none">
              <div className="absolute inset-0 border-4 border-primary grid grid-cols-4 grid-rows-4">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className={`border border-primary/30 flex items-center justify-center text-[10px] font-mono text-primary/40 ${i % 3 === 0 ? 'bg-primary/10 animate-pulse' : ''}`}>
                    {i % 5 === 0 ? 'SYS_ERR' : i.toString(16).padStart(2, '0')}
                  </div>
                ))}
              </div>

              {/* Intricate Neon-Green Circular HUD System */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] border-[1px] border-primary/20 rounded-full animate-spin" style={{ animationDuration: '30s' }}>
                <div className="absolute -top-1 left-1/2 w-4 h-2 bg-primary -translate-x-1/2 shadow-[0_0_10px_var(--primary)]" />
                <div className="absolute -bottom-1 left-1/2 w-4 h-2 bg-primary -translate-x-1/2 shadow-[0_0_10px_var(--primary)]" />
                <div className="absolute top-1/2 -left-1 w-2 h-4 bg-primary -translate-y-1/2 shadow-[0_0_10px_var(--primary)]" />
                <div className="absolute top-1/2 -right-1 w-2 h-4 bg-primary -translate-y-1/2 shadow-[0_0_10px_var(--primary)]" />
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border-[4px] border-transparent border-t-primary/60 border-b-primary/60 rounded-full animate-spin shadow-[inset_0_0_20px_rgba(203,247,2,0.1)]" style={{ animationDirection: 'reverse', animationDuration: '10s' }} />

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-[12px] border-primary/20 rounded-full animate-spin" style={{ animationDuration: '4s', clipPath: 'polygon(0 0, 100% 0, 100% 30%, 0 30%, 0 70%, 100% 70%, 100% 100%, 0 100%)' }} />

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border-[2px] border-primary border-dashed rounded-full animate-spin" style={{ animationDuration: '8s' }} />

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-[6px] border-primary rounded-full animate-pulse shadow-[0_0_30px_rgba(203,247,2,0.4)]" style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)' }} />
            </div>

            {/* Center Circular Dashboard Button (Glowing Eye) */}
            <Link
              href={user ? "/dashboard" : "/login"}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-primary border-[6px] border-background text-primary-foreground flex flex-col items-center justify-center font-black text-[10px] sm:text-[11px] tracking-widest uppercase hover:bg-foreground hover:text-primary transition-all duration-300 z-50 pointer-events-auto shadow-[0_0_50px_rgba(203,247,2,0.8)] hover:shadow-[0_0_80px_rgba(203,247,2,1)] group hover:scale-110"
            >
              <div className="absolute inset-0 bg-primary/50 animate-ping rounded-full opacity-30 pointer-events-none" />
              <Terminal className="w-6 h-6 mb-1 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110" />
              <span className="text-center leading-tight mt-1 group-hover:animate-pulse">
                {user ? "ENTER\nDASHBOARD" : "INIT\nUPLINK"}
              </span>
            </Link>
          </div>
        </div>

        {/* Glitch Tape Marquee */}
        <div className="absolute bottom-0 w-full overflow-hidden bg-primary text-primary-foreground font-mono text-[10px] font-black uppercase tracking-widest py-1 z-30 transform -rotate-1 scale-105 border-y-2 border-foreground mix-blend-difference flex">
          <div className="whitespace-nowrap animate-marquee flex gap-10 shrink-0 pr-10">
            <span>// WARNING: UNAUTHORIZED ACCESS ATTEMPT DETECTED //</span>
            <span>SYSTEM INTEGRITY COMPROMISED</span>
            <span>REROUTING MAINFRAME...</span>
            <span>// WARNING: UNAUTHORIZED ACCESS ATTEMPT DETECTED //</span>
            <span>SYSTEM INTEGRITY COMPROMISED</span>
            <span>REROUTING MAINFRAME...</span>
            <span>// WARNING: UNAUTHORIZED ACCESS ATTEMPT DETECTED //</span>
            <span>SYSTEM INTEGRITY COMPROMISED</span>
            <span>REROUTING MAINFRAME...</span>
          </div>
          <div className="whitespace-nowrap animate-marquee flex gap-10 shrink-0 pr-10">
            <span>// WARNING: UNAUTHORIZED ACCESS ATTEMPT DETECTED //</span>
            <span>SYSTEM INTEGRITY COMPROMISED</span>
            <span>REROUTING MAINFRAME...</span>
            <span>// WARNING: UNAUTHORIZED ACCESS ATTEMPT DETECTED //</span>
            <span>SYSTEM INTEGRITY COMPROMISED</span>
            <span>REROUTING MAINFRAME...</span>
            <span>// WARNING: UNAUTHORIZED ACCESS ATTEMPT DETECTED //</span>
            <span>SYSTEM INTEGRITY COMPROMISED</span>
            <span>REROUTING MAINFRAME...</span>
          </div>
        </div>
      </section>

      {/* ═══ ABOUT US SECTION ═══ */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-primary tracking-widest uppercase mb-4 animate-fade-in">
          <span className="w-8 h-px bg-primary/50" />
          OUR STORY
          <span className="w-8 h-px bg-primary/50" />
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-8 animate-slide-up">
          Babson <span className="gradient-text-cyber">CODE</span>
        </h2>

        <div className="hud-panel bg-card/60 border border-border/40 p-6 sm:p-10 text-left space-y-6 text-sm sm:text-base text-muted-foreground leading-relaxed font-mono scanlines animate-slide-up">
          <p>
            <span className="text-primary font-bold">&gt;</span> CODE (Community of Developers & Entrepreneurs) was founded in Fall 2015 by a group of students passionate about the intersection of technology and business. Since then, we're grateful to have done some pretty cool things:
          </p>
          <ul className="space-y-4 pl-4 border-l-2 border-primary/20 text-sm">
            <li className="flex gap-3 items-start"><span className="text-primary glow-text mt-1 text-xs">✓</span><span>We've grown to hundreds of members</span></li>
            <li className="flex gap-3 items-start"><span className="text-primary glow-text mt-1 text-xs">✓</span><span>We've hosted a bunch of fun and informative events</span></li>
            <li className="flex gap-3 items-start"><span className="text-primary glow-text mt-1 text-xs">✓</span><span>We cooperated with Olin School of Engineering to host speaker and networking events</span></li>
            <li className="flex gap-3 items-start"><span className="text-primary glow-text mt-1 text-xs">✓</span><span>We've done tech consulting with the Blank Center</span></li>
            <li className="flex gap-3 items-start"><span className="text-primary glow-text mt-1 text-xs">✓</span><span>We've hosted bootcamps for fellow Babson Students</span></li>
            <li className="flex gap-3 items-start"><span className="text-primary glow-text mt-1 text-xs">✓</span><span>We've attended hackathons around the country and won</span></li>
            <li className="flex gap-3 items-start"><span className="text-primary glow-text mt-1 text-xs">✓</span><span>And so much more!</span></li>
          </ul>
          <p>
            CODE helps Babson students develop technological acumen to match their entrepreneurial mindsets. We are the go-to campus resource for anything and everything tech, and we're here to help guide you through the intersection of business and technology.
          </p>
          <div className="border-t border-border/40 pt-6 mt-6">
            <p className="text-primary mb-2 text-xs uppercase tracking-widest font-bold">REACH OUT</p>
            <p className="opacity-80">
              If there's anything you need, we're here to help. Just contact us at code@babson.edu, connect with us on social media, or see us at one of our events!
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FEATURED PROJECT SECTION ═══ */}
      {featuredProject && !projectsLoading && (
        <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-primary tracking-widest uppercase mb-8 animate-fade-in">
            <span className="w-8 h-px bg-primary/50" />
            FEATURED PROJECT
            <span className="w-8 h-px bg-primary/50" />
          </div>

          <Link href={`/projects/${featuredProject.id}`} className="group block text-left">
            <div className="hud-panel bg-card/60 border border-border/40 overflow-hidden relative transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(203,247,2,0.1)]">
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-0 h-0 border-t-[32px] border-t-primary/20 border-l-[32px] border-l-transparent group-hover:border-t-primary/50 transition-colors z-20" />

              {/* Cover Image Background */}
              <div className="relative w-full h-64 sm:h-80 md:h-[400px] border-b border-border/40 bg-muted/20">
                {featuredProject.coverImage ? (
                  <Image
                    src={featuredProject.coverImage}
                    alt={featuredProject.name}
                    fill
                    className="object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out mix-blend-luminosity hover:mix-blend-normal"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-muted-foreground/30 text-2xl font-black">
                    NO_COVER_IMAGE
                  </div>
                )}
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                {/* Status Badge */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="inline-block px-3 py-1 bg-background/80 glass font-mono text-[10px] tracking-widest uppercase border border-border/50 text-foreground">
                    STATUS: <span className="text-primary font-bold">{featuredProject.status}</span>
                  </span>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-6 sm:p-8 relative z-10 -mt-16 bg-gradient-to-t from-card/90 via-card/90 to-transparent">
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-4 group-hover:text-primary transition-colors">
                  {featuredProject.name}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-6 font-mono max-w-2xl line-clamp-2">
                  {featuredProject.description}
                </p>

                <div className="flex items-center gap-4 text-xs font-mono tracking-widest uppercase text-muted-foreground">
                  <span className="flex items-center gap-2 group-hover:text-primary transition-colors">
                    ACCESS LOG <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-border/40">|</span>
                  <span>MEMBERS: {featuredProject.teamMembers?.length || 0}</span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ═══ CTA SECTION ═══ */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="relative hud-panel bg-card/70 border border-primary/20 p-8 sm:p-12 md:p-16 text-center overflow-hidden scanlines noise animate-border-pulse">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-primary tracking-widest uppercase mb-5">
              <Zap className="w-3.5 h-3.5" />
              AUTHORIZATION REQUIRED
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter">
              Ready to <span className="gradient-text-cyber">join</span>?
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base max-w-xl mx-auto font-mono">
              Sign in with your credentials to access the CODE dashboard.
            </p>

            <Link
              href={user ? "/dashboard" : "/login"}
              className="mt-8 inline-flex items-center gap-3 hud-panel bg-primary text-primary-foreground px-8 py-3.5 text-sm font-bold uppercase tracking-wider hover:brightness-110 transition-all glow-border-strong"
            >
              <Shield className="w-4 h-4" />
              {user ? "ENTER DASHBOARD" : "GET STARTED"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 border-t border-border/40 mt-6 sm:mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-mono font-bold text-sm tracking-widest uppercase">
            CODE<span className="text-primary">.</span>
          </span>
          <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono text-muted-foreground uppercase tracking-wider">
            <Link href="/hall-of-fame" className="hover:text-primary transition-colors">Hall of Fame</Link>
            <Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link>
            <Link href={user ? "/dashboard" : "/login"} className="hover:text-primary transition-colors">{user ? "Dashboard" : "Sign In"}</Link>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground tracking-wider">© {new Date().getFullYear()} BABSON CODE</p>
        </div>
      </footer>
    </div>
  );
}
