import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Play, Check, Shield, BookOpen, Activity, Brain, Banknote, User, Building2, TrendingUp, Trophy } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { Candle, DashboardMock } from "@/components/CandleArt";

const fade = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
};

export default function Landing() {
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  useEffect(() => {
    const h = (e) => { setMx((e.clientX / window.innerWidth - 0.5) * 18); setMy((e.clientY / window.innerHeight - 0.5) * 18); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  return (
    <div className="bg-[#050505] text-white overflow-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="lg" />
          <div className="hidden md:flex items-center gap-9 text-sm text-[#B5BBC9]">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#how" className="hover:text-white transition">How it Works</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#reviews" className="hover:text-white transition">Reviews</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm px-4 py-2 text-[#9CA3AF] hover:text-white" data-testid="nav-login">Log in</Link>
            <Link to="/register" className="btn-primary text-sm" data-testid="nav-register">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-36 pb-24 px-6 lg:px-10">
        {/* background atmospherics */}
        <div className="absolute inset-0 grid-floor opacity-60 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-[700px] h-[700px] rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle, #7C4DFF, transparent 70%)", transform: `translate(${mx}px, ${my}px)` }} />
          <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle, #4F8CFF, transparent 70%)", transform: `translate(${-mx}px, ${-my}px)` }} />
          <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] rounded-full blur-3xl opacity-15" style={{ background: "radial-gradient(circle, #FF4FD8, transparent 70%)" }} />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-center relative z-10">
          {/* LEFT */}
          <motion.div initial="hidden" animate="show" variants={fade} className="lg:col-span-5 space-y-7">
            <motion.div custom={0} variants={fade} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[11px] font-mono uppercase tracking-widest text-[#B5BBC9]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] pulse-glow" /> Now in Beta · Join 2,400+ funded traders
            </motion.div>
            <motion.h1 custom={1} variants={fade} className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight">
              <span className="text-gradient">Protect Funded<br/>Accounts.</span><br />
              <span className="text-purple-grad">Maximize Payouts.</span>
            </motion.h1>
            <motion.p custom={2} variants={fade} className="text-lg text-[#9CA3AF] max-w-md leading-relaxed">
              The Operating System For Funded Traders.
            </motion.p>
            <motion.div custom={3} variants={fade} className="flex items-center gap-3">
              <Link to="/register" className="btn-primary inline-flex items-center gap-2 text-base" data-testid="hero-cta-start">Start Free <ArrowRight className="w-4 h-4"/></Link>
              <a href="#how" className="btn-ghost inline-flex items-center gap-2 text-base" data-testid="hero-cta-demo"><Play className="w-4 h-4 fill-white"/> Watch Demo</a>
            </motion.div>
            <motion.div custom={4} variants={fade} className="pt-6">
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#6B7280] mb-3">Trusted by traders at</div>
              <div className="flex items-center gap-7 flex-wrap opacity-70">
                <span className="text-sm font-bold tracking-wider text-[#B5BBC9]">TOPSTEP</span>
                <span className="text-sm font-bold tracking-wider text-[#B5BBC9]">▲ APEX</span>
                <span className="text-sm font-bold tracking-wider text-[#B5BBC9]">◆ FTMO</span>
                <span className="text-sm font-bold tracking-wider text-[#B5BBC9]">◇ FUNDEDNEXT</span>
                <span className="text-sm font-bold tracking-wider text-[#B5BBC9]">THE5ERS</span>
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT — Tilted 3D dashboard mockup with floating candles */}
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.22,1,0.36,1] }} className="lg:col-span-7 relative">
            <div style={{ transform: `translate(${-mx * 0.6}px, ${-my * 0.6}px)` }}>
              <DashboardMock />
            </div>

            {/* Floating 3D candles */}
            <div className="absolute -left-2 top-[15%] floaty" style={{ animationDelay: "0s" }}><Candle color="purple" height={110} rot={-8} /></div>
            <div className="absolute left-[10%] bottom-[10%] floaty" style={{ animationDelay: "1.2s" }}><Candle color="purple" height={80} rot={6} /></div>
            <div className="absolute -right-4 top-[8%] floaty-slow" style={{ animationDelay: "0.5s" }}><Candle color="green" height={130} rot={10} /></div>
            <div className="absolute -right-2 bottom-[18%] floaty" style={{ animationDelay: "1.6s" }}><Candle color="pink" height={120} rot={-6} /></div>
            <div className="absolute right-[18%] -bottom-2 floaty-slow" style={{ animationDelay: "0.9s" }}><Candle color="green" height={70} rot={4} /></div>
          </motion.div>
        </div>
      </section>

      {/* 4 STEPS */}
      <section id="how" className="px-6 lg:px-10 pb-20">
        <div className="max-w-7xl mx-auto card-elev p-10 lg:p-14">
          <div className="grid lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-1">
              <div className="text-3xl font-bold leading-tight text-gradient">Get Started<br/>in 4 Simple Steps</div>
            </div>
            <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
              {[
                { n: 1, t: "Create Account", d: "Sign up in seconds.", I: User },
                { n: 2, t: "Connect Prop Firms", d: "Link your prop firm accounts.", I: Building2 },
                { n: 3, t: "Start Tracking", d: "Import or sync your trades automatically.", I: TrendingUp },
                { n: 4, t: "Get Paid", d: "Optimize, protect and maximize payouts.", I: Trophy },
              ].map((s, i) => (
                <motion.div key={s.n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.6 }} className="relative">
                  <div className="card-flat p-5 h-full text-center">
                    <div className="w-9 h-9 mx-auto rounded-full border border-[#7C4DFF]/50 flex items-center justify-center text-[#B58BFF] font-bold text-sm bg-[#7C4DFF]/10">{s.n}</div>
                    <div className="mt-4 mb-3 mx-auto w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: s.n === 3 ? "linear-gradient(135deg,#00E67622,#00E67611)" : "linear-gradient(135deg,#7C4DFF22,#4F8CFF11)" }}>
                      <s.I className="w-6 h-6" style={{ color: s.n === 3 ? "#00E676" : "#B58BFF" }} />
                    </div>
                    <div className="font-semibold text-sm">{s.t}</div>
                    <div className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">{s.d}</div>
                  </div>
                  {i < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 -translate-y-1/2">
                      <div className="dashed-arrow" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5 FEATURE CARDS */}
      <section id="features" className="px-6 lg:px-10 pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { I: LayersIcon, t: "Multi-Account", d: "Manage all funded accounts in one place.", c: "purple" },
            { I: JournalIcon, t: "Smart Journal", d: "Capture every trade with screenshots and notes.", c: "blue" },
            { I: DisciplineIcon, t: "Discipline Engine", d: "Real-time scoring to master consistency.", c: "green" },
            { I: AICoachIcon, t: "AI Coach", d: "Personalized insights to grow faster.", c: "purple" },
            { I: PayoutIcon, t: "Payout Tracker", d: "Track milestones and maximize every payout.", c: "pink" },
          ].map((f, i) => (
            <motion.div key={f.t} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.6 }} className="card-flat p-6 hover:border-[#7C4DFF]/40 transition-all" data-testid={`feature-${f.t.toLowerCase().replace(/\s/g,'-')}`}>
              <div className="mb-5"><f.I /></div>
              <div className="font-semibold text-base">{f.t}</div>
              <div className="text-xs text-[#9CA3AF] mt-2 leading-relaxed">{f.d}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ASSET CLASSES */}
      <section className="px-6 lg:px-10 pb-20">
        <div className="max-w-7xl mx-auto card-elev p-10 lg:p-14">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-3">
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#B58BFF] mb-3 px-3 py-1 rounded-full inline-block border border-[#7C4DFF]/40">SUPPORTED ASSETS</div>
              <div className="text-4xl font-bold leading-tight">Trade <span className="text-purple-grad">all.</span><br/>Analyze <span className="text-purple-grad">all.</span></div>
            </div>
            <div className="lg:col-span-9 grid grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { l: "Forex", I: ForexIcon },
                { l: "Crypto", I: CryptoIcon },
                { l: "Stocks", I: StocksIcon },
                { l: "Indices", I: IndicesIcon },
                { l: "Commodities", I: CommoditiesIcon },
                { l: "Futures", I: FuturesIcon },
              ].map((a, i) => (
                <motion.div key={a.l} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="card-flat p-4 text-center hover:border-[#7C4DFF]/40 transition-all">
                  <div className="mb-2 flex justify-center"><a.I /></div>
                  <div className="text-xs font-medium mt-2">{a.l}</div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="text-center text-xs text-[#6B7280] mt-8">And more…</div>
        </div>
      </section>

      {/* ALL-IN-ONE */}
      <section className="px-6 lg:px-10 pb-20">
        <div className="max-w-7xl mx-auto card-elev p-10 lg:p-14 grid lg:grid-cols-2 gap-12 items-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#B58BFF] mb-3">ALL IN ONE PLACE</div>
            <div className="text-4xl font-bold leading-tight">Powerful. Complete.<br/>Built for <span className="text-purple-grad">traders.</span></div>
            <div className="mt-8 space-y-3">
              {["Manage multiple accounts", "Smart journal with screenshots", "Real-time discipline score", "AI performance analysis", "Track payouts and milestones"].map(x => (
                <div key={x} className="flex items-center gap-3"><Check className="w-4 h-4 text-[#00E676]"/> <span className="text-sm text-[#B5BBC9]">{x}</span></div>
              ))}
            </div>
            <Link to="/register" className="btn-ghost inline-flex items-center gap-2 mt-8" data-testid="cta-features">Discover all features <ArrowRight className="w-4 h-4"/></Link>
          </div>
          <div className="relative">
            <div style={{ transform: "scale(0.78)", transformOrigin: "top left" }}><DashboardMock /></div>
            <div className="absolute -left-4 top-10 floaty"><Candle color="green" height={90} rot={-4} /></div>
            <div className="absolute right-10 -top-4 floaty-slow"><Candle color="pink" height={110} rot={8} /></div>
            <div className="absolute right-0 bottom-4 floaty"><Candle color="purple" height={70} rot={-6} /></div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 lg:px-10 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#B58BFF] mb-3">PRICING</div>
            <h2 className="text-4xl font-bold text-gradient">Built for funded traders.</h2>
            <p className="text-[#9CA3AF] mt-3">Cancel anytime. No setup fees.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card-elev p-8">
              <div className="text-sm font-mono uppercase text-[#9CA3AF]">Starter</div>
              <div className="text-5xl font-bold mt-4 font-mono">€9.99<span className="text-base text-[#9CA3AF]">/mo</span></div>
              <div className="text-sm text-[#9CA3AF] mt-2">Perfect for 1 funded account</div>
              <div className="mt-8 space-y-3 text-sm">
                {["Up to 2 accounts", "Trade journal", "Discipline score", "Basic analytics"].map(x => <div key={x} className="flex gap-2 text-[#B5BBC9]"><Check className="w-4 h-4 text-[#9CA3AF]"/> {x}</div>)}
              </div>
              <Link to="/register" className="btn-ghost block text-center mt-8">Start Free</Link>
            </div>
            <div className="card-elev p-8 glow-purple border-[#7C4DFF]/40 relative" data-testid="pricing-pro">
              <div className="absolute -top-3 right-6 text-[10px] font-mono uppercase tracking-widest bg-gradient-to-r from-[#7C4DFF] to-[#4F8CFF] rounded-full px-3 py-1">Most Popular</div>
              <div className="text-sm font-mono uppercase text-[#B58BFF]">Pro</div>
              <div className="text-5xl font-bold mt-4 font-mono">€19.99<span className="text-base text-[#9CA3AF]">/mo</span></div>
              <div className="text-sm text-[#9CA3AF] mt-2">For serious multi-account traders</div>
              <div className="mt-8 space-y-3 text-sm">
                {["Unlimited accounts", "AI Coach (Claude Sonnet 4.5)", "Trading DNA", "Survival Score", "Mistake Cost Tracker", "Priority support"].map(x => <div key={x} className="flex gap-2 text-[#B5BBC9]"><Check className="w-4 h-4 text-[#00E676]"/> {x}</div>)}
              </div>
              <Link to="/register" className="btn-primary block text-center mt-8" data-testid="pricing-pro-cta">Go Pro</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 lg:px-10 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#B58BFF] mb-3">FAQ</div>
            <h2 className="text-4xl font-bold text-gradient">Frequently asked.</h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "Does PipsEvo connect to my broker?", a: "Currently you log trades manually or import. Direct Tradovate, Rithmic, MT4/5, cTrader and NinjaTrader connections are on the roadmap." },
              { q: "Will you give me trade signals?", a: "Never. PipsEvo only analyzes your behavior and performance — an operating system, not a signal service." },
              { q: "Which prop firms do you support?", a: "Topstep, Apex, FTMO, FundedNext, The5ers, Take Profit Trader — plus custom rules for any firm." },
              { q: "Can I cancel anytime?", a: "Yes, from your billing portal. No questions asked." },
            ].map(f => (
              <details key={f.q} className="card-flat p-5 cursor-pointer">
                <summary className="font-semibold flex items-center justify-between text-sm">{f.q}<span className="text-[#B58BFF]">+</span></summary>
                <p className="text-[#9CA3AF] text-sm mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-10 pb-24">
        <div className="max-w-7xl mx-auto card-elev p-10 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 w-[300px] h-[300px] rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle, #7C4DFF, transparent)" }} />
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C4DFF] to-[#4F8CFF] flex items-center justify-center"><Trophy className="w-7 h-7"/></div>
            <div>
              <div className="text-2xl lg:text-3xl font-bold text-gradient">Ready to protect your accounts<br/>and maximize your payouts?</div>
            </div>
          </div>
          <Link to="/register" className="btn-primary inline-flex items-center gap-2 relative z-10" data-testid="footer-cta">Start free <ArrowRight className="w-4 h-4"/></Link>
        </div>
        <div className="max-w-7xl mx-auto text-center text-xs text-[#6B7280] mt-6">No card required · Setup in 2 minutes</div>
      </section>

      <footer className="border-t border-white/5 py-10 px-6 lg:px-10 text-sm text-[#9CA3AF]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <Logo />
          <div>© 2026 PipsEvo · The Operating System for Funded Traders.</div>
        </div>
      </footer>
    </div>
  );
}

/* ===== ICONS (premium 3D-style) ===== */
const LayersIcon = () => (
  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#9468FF,#5A2DFF)", boxShadow: "0 8px 24px -6px rgba(124,77,255,0.6), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zm0 7L4.21 5.5l7.79 3.91 7.79-3.91L12 9zm-10 5l10 5 10-5-1.39-.7L12 18.6 3.39 14.3 2 15v-1z"/></svg>
  </div>
);
const JournalIcon = () => (
  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7CA8FF,#3A6BD9)", boxShadow: "0 8px 24px -6px rgba(79,140,255,0.6), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
    <BookOpen className="w-6 h-6 text-white" strokeWidth={2.2} />
  </div>
);
const DisciplineIcon = () => (
  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#33FF95,#00B85F)", boxShadow: "0 8px 24px -6px rgba(0,230,118,0.5), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
    <Activity className="w-6 h-6 text-white" strokeWidth={2.2} />
  </div>
);
const AICoachIcon = () => (
  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#A86BFF,#6B2AE0)", boxShadow: "0 8px 24px -6px rgba(124,77,255,0.6), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
    <Brain className="w-6 h-6 text-white" strokeWidth={2.2} />
  </div>
);
const PayoutIcon = () => (
  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#FF7BD9,#C42AAB)", boxShadow: "0 8px 24px -6px rgba(255,79,216,0.5), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
    <Banknote className="w-6 h-6 text-white" strokeWidth={2.2} />
  </div>
);
const ForexIcon = () => <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-lg" style={{ background: "linear-gradient(135deg,#7C4DFF,#4F8CFF)", boxShadow: "0 6px 18px -4px rgba(124,77,255,0.5)" }}>$€</div>;
const CryptoIcon = () => <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-lg" style={{ background: "linear-gradient(135deg,#F7931A,#FFB855)", boxShadow: "0 6px 18px -4px rgba(247,147,26,0.5)" }}>₿</div>;
const StocksIcon = () => <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0F1117,#1A1F2E)", border: "1px solid #00E676aa", boxShadow: "0 6px 18px -4px rgba(0,230,118,0.3)" }}><TrendingUp className="w-5 h-5 text-[#00E676]" /></div>;
const IndicesIcon = () => <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-[10px] text-center leading-tight" style={{ background: "linear-gradient(135deg,#7C4DFF,#5A2DFF)", boxShadow: "0 6px 18px -4px rgba(124,77,255,0.5)" }}>S&P<br/>500</div>;
const CommoditiesIcon = () => <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#3A4250,#1A1F2E)", boxShadow: "0 6px 18px -4px rgba(0,0,0,0.5)" }}><svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FFB855"><rect x="6" y="6" width="12" height="14" rx="2"/><path d="M9 4h6v2H9z" fill="#7CFF95"/></svg></div>;
const FuturesIcon = () => <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-lg" style={{ background: "linear-gradient(135deg,#7C4DFF,#4F8CFF)", boxShadow: "0 6px 18px -4px rgba(124,77,255,0.5)" }}>X</div>;
