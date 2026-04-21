"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/auth-context";
import { Code2, Mail, Lock, Eye, EyeOff, ArrowLeft, Moon, Sun, Loader2, ShieldAlert, Terminal } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const { signInWithGoogle, signInWithEmail } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true); setError("");
            await signInWithGoogle();
            router.push("/dashboard");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to sign in with Google");
        } finally { setLoading(false); }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true); setError("");
            await signInWithEmail(email, password);
            router.push("/dashboard");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Authentication failed");
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-background flex relative overflow-hidden">
            {/* Grid Background */}
            <div className="pointer-events-none fixed inset-0 grid-bg opacity-40" />

            {/* Ambient glow orbs — follow --primary */}
            <div className="pointer-events-none fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 landing-glow-orb" />
            <div className="pointer-events-none fixed bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 landing-glow-orb" />

            {/* Left branding panel */}
            <div className="hidden lg:flex lg:w-1/2 relative border-r border-border/40 items-center justify-center p-12">
                <div className="relative z-10 max-w-lg text-center animate-slide-up">
                    <div className="w-24 h-24 hud-panel-alt bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-8 relative animate-float">
                        <div className="absolute inset-0 glow-border opacity-50" />
                        <Code2 className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter mb-4">
                        <span className="gradient-text-cyber animate-flicker">CODE_OS</span> TERMINAL
                    </h1>
                    <div className="relative hud-panel-sm bg-card/60 border border-border/50 p-6 scanlines mt-6">
                        <p className="relative z-10 text-muted-foreground text-sm font-mono leading-relaxed">
                            <span className="text-primary font-bold">&gt;</span> The operating system for Babson&apos;s Community of Developers and Entrepreneurs. Login required for access.
                        </p>
                    </div>

                    <div className="mt-8 grid grid-cols-3 gap-4">
                        {[
                            { id: "SYS_01", label: "PROJECTS" },
                            { id: "SYS_02", label: "RESOURCES" },
                            { id: "SYS_03", label: "COMMS" },
                        ].map((item) => (
                            <div key={item.label} className="p-3 hud-corners bg-background/40 border border-border/40 hover:border-primary/40 transition-colors">
                                <div className="text-[10px] text-primary/70 font-mono mb-1">{item.id}</div>
                                <div className="text-xs font-bold tracking-wider">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right auth form */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
                <div className="w-full max-w-md animate-fade-in relative">

                    <div className="flex items-center justify-between mb-8 sm:mb-10">
                        <Link href="/" className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider">
                            <ArrowLeft className="w-3 h-3" /> BACK
                        </Link>
                        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 hud-panel-sm bg-card border border-border/50 hover:border-primary/50 transition-colors text-muted-foreground hover:text-foreground">
                            <Sun className="w-4 h-4 hidden dark:block" />
                            <Moon className="w-4 h-4 dark:hidden" />
                        </button>
                    </div>

                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 hud-panel-sm bg-primary/10 border border-primary/30 flex items-center justify-center">
                            <Code2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <span className="font-black tracking-tight">CODE_OS</span>
                            <span className="text-primary text-xs ml-2 font-mono tracking-widest">SYS</span>
                        </div>
                    </div>

                    <div className="hud-panel bg-card/80 border border-border/50 p-8 scanlines noise relative">
                        {/* Decorative top bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 text-[10px] font-mono text-primary/80 tracking-widest uppercase mb-4">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                AUTHORIZATION REQUIRED
                            </div>

                            <h2 className="text-2xl font-black tracking-tight mb-2">LOGIN</h2>
                            <p className="text-muted-foreground text-xs font-mono mb-6">Enter credentials to establish connection.</p>

                            {error && (
                                <div className="mb-6 p-4 hud-panel-sm bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono flex items-start gap-2">
                                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button onClick={handleGoogleSignIn} disabled={loading} className="w-full h-11 flex items-center justify-center gap-3 hud-panel-alt border border-border hover:border-primary/50 bg-background/50 text-sm font-bold tracking-wider hover:bg-card transition-all disabled:opacity-50 relative group overflow-hidden">
                                <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform" />
                                {loading ? <Loader2 className="w-4 h-4 animate-spin relative z-10" /> : (
                                    <svg className="w-4 h-4 relative z-10" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                )}
                                <span className="relative z-10 uppercase">Google Auth</span>
                            </button>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
                                <div className="relative flex justify-center text-[10px] font-mono tracking-widest"><span className="px-3 bg-card text-muted-foreground uppercase">MANUAL OVERRIDE</span></div>
                            </div>

                            <form onSubmit={handleEmailAuth} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono text-muted-foreground mb-1.5 uppercase" htmlFor="email">Email Sequence</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@babson.edu"
                                            className="w-full pl-10 pr-4 py-3 hud-panel-sm bg-background/50 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-mono text-muted-foreground mb-1.5 uppercase" htmlFor="password">Security Key</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input id="password" type={showPassword ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                                            className="w-full pl-10 pr-10 py-3 hud-panel-sm bg-background/50 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors" tabIndex={-1}>
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="w-full mt-2 h-11 bg-primary text-primary-foreground text-sm font-bold tracking-widest uppercase hud-panel hover:brightness-110 transition-all glow-border flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                                    AUTHENTICATE
                                </button>
                            </form>
                        </div>
                    </div>

                    <p className="mt-8 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-relaxed">
                        Access restricted to authorized personnel.<br />
                        Contact E-Board for initialization vector.
                    </p>
                </div>
            </div>
        </div>
    );
}
