import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Brain, TrendingUp, Target, Layers, Zap, CheckCircle2, Sparkles, BarChart3, Trophy, Calendar } from "lucide-react";

const Hero = () => {
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  useEffect(() => {
    const h = (e) => {
      setMx((e.clientX / window.innerWidth - 0.5) * 16);
      setMy((e.clientY / window.innerHeight - 0.5) * 16);
    };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  return (
    <section className="relative min-h-[100vh] grid-bg overflow-hidden flex items-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle, #4F8CFF, transparent 70%)", transform: `translate(${mx}px, ${my}px)` }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl opacity-15" style={{ background: "radial-gradient(circle, #7C4DFF, transparent 70%)", transform: `translate(${-mx}px, ${-my}px)` }} />
      </div>

      {/* Floating candle elements */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(14)].map((_, i) => {
          const left = (i * 7.3) % 100;
          const top = ((i * 13.7) % 80) + 5;
          const h = 30 + (i * 17) % 80;
          const up = i % 3 !== 0;
          return (
            <div key={i} className="absolute floaty" style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${i * 0.4}s` }}>
              <div className={`w-1 ${up ? "bg-[#00E676]" : "bg-[#FF5252]"}`} style={{ height: `${h}px`, opacity: 0.35, boxShadow: `0 0 14px ${up ? "#00E676" : "#FF5252"}` }} />
            </div>
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 w-full grid lg:grid-cols-12 gap-10 relative z-10">
        <div className="lg:col-span-7 space-y-8 pt-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-mono uppercase tracking-widest text-[#9CA3AF]" data-testid="hero-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] pulse-glow" /> Operating System for Funded Traders
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
            <span className="text-gradient">PipsEvo.</span><br />
            <span className="text-gradient-blue">Protect</span> your funded<br />
            account like an engineer.
          </h1>
          <p className="text-lg text-[#9CA3AF] max-w-xl leading-relaxed">
            Track every account. Protect your drawdown. Improve your discipline. Maximize your payouts — across Topstep, FTMO, Apex, FundedNext and more.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary inline-flex items-center gap-2" data-testid="hero-cta-start">
              Start Free <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="btn-ghost text-white" data-testid="hero-cta-demo">Watch Demo</a>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#9CA3AF] font-mono uppercase tracking-widest pt-4">
            <span>Topstep</span><span>·</span><span>Apex</span><span>·</span><span>FTMO</span><span>·</span><span>FundedNext</span><span>·</span><span>The5ers</span>
          </div>
        </div>

        <div className="lg:col-span-5 relative pt-24">
          <div className="floaty space-y-3" style={{ animationDelay: "0.2s" }}>
            <div className="glass rounded-2xl p-5 glow-green" data-testid="hero-metric-profit">
              <div className="text-xs text-[#9CA3AF] font-mono uppercase">Profit</div>
              <div className="text-3xl font-bold text-[#00E676] font-mono">+$12,450</div>
            </div>
            <div className="glass rounded-2xl p-5 ml-8 glow-blue" data-testid="hero-metric-discipline">
              <div className="text-xs text-[#9CA3AF] font-mono uppercase">Discipline Score</div>
              <div className="text-3xl font-bold font-mono">94<span className="text-base text-[#9CA3AF]">/100</span></div>
            </div>
            <div className="glass rounded-2xl p-5" data-testid="hero-metric-accounts">
              <div className="text-xs text-[#9CA3AF] font-mono uppercase">Active Accounts</div>
              <div className="text-3xl font-bold font-mono">5</div>
            </div>
            <div className="glass rounded-2xl p-5 ml-12 glow-purple" data-testid="hero-metric-dd">
              <div className="text-xs text-[#9CA3AF] font-mono uppercase">Remaining Drawdown</div>
              <div className="text-3xl font-bold font-mono">$8,240</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SectionTitle = ({ kicker, title, sub }) => (
  <div className="max-w-3xl">
    {kicker && <div className="text-xs font-mono uppercase tracking-widest text-[#4F8CFF] mb-3">{kicker}</div>}
    <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gradient mb-4">{title}</h2>
    {sub && <p className="text-[#9CA3AF] text-lg">{sub}</p>}
  </div>
);

const FailCard = ({ icon: Icon, title, body }) => (
  <div className="card-elev p-6 hover:border-[#4F8CFF]/40 transition-all">
    <Icon className="w-8 h-8 text-[#FF5252] mb-4" />
    <div className="font-semibold text-lg mb-2">{title}</div>
    <div className="text-sm text-[#9CA3AF]">{body}</div>
  </div>
);

const FeatureCard = ({ icon: Icon, title, body, glow }) => (
  <div className={`card-elev p-6 hover:border-[#7C4DFF]/40 transition-all ${glow || ""}`}>
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F8CFF]/20 to-[#7C4DFF]/20 flex items-center justify-center mb-4 border border-white/5">
      <Icon className="w-5 h-5 text-[#4F8CFF]" />
    </div>
    <div className="font-semibold text-lg mb-2">{title}</div>
    <div className="text-sm text-[#9CA3AF]">{body}</div>
  </div>
);

export default function Landing() {
  return (
    <div className="bg-[#050505] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between glass rounded-full px-5 py-2.5">
          <Link to="/" className="font-bold text-lg tracking-tight" data-testid="nav-logo">PipsEvo<span className="text-[#4F8CFF]">.</span></Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#9CA3AF]">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how" className="hover:text-white">How it Works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm px-4 py-2 text-[#9CA3AF] hover:text-white" data-testid="nav-login">Login</Link>
            <Link to="/register" className="btn-primary text-sm" data-testid="nav-register">Get Started</Link>
          </div>
        </div>
      </nav>

      <Hero />

      {/* Why Most Fail */}
      <section className="py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <SectionTitle kicker="The Hard Truth" title="Why 93% of funded traders fail" sub="Funded accounts aren't lost to bad strategies. They're lost to bad behavior." />
          <div className="grid md:grid-cols-4 gap-5 mt-12">
            <FailCard icon={Zap} title="Overtrading" body="Taking the third, fourth, fifth setup outside the plan." />
            <FailCard icon={Shield} title="Poor Risk" body="No hard limit on size, no rule on stop placement." />
            <FailCard icon={Target} title="No Discipline" body="Breaking the same rules week after week without feedback." />
            <FailCard icon={BarChart3} title="No Analysis" body="Trading blind. Same mistakes. No data, no review." />
          </div>
        </div>
      </section>

      {/* All Tools in One */}
      <section id="features" className="py-28 px-6 lg:px-10 grid-bg">
        <div className="max-w-7xl mx-auto">
          <SectionTitle kicker="One Platform" title="Every tool a funded trader needs" sub="Replace your spreadsheets, screenshots, notes, and dashboards with one operating system." />
          <div className="grid md:grid-cols-3 gap-5 mt-12">
            <FeatureCard icon={Layers} title="Multi-Account Command Center" body="See every funded account in one screen — balance, drawdown, target, status." glow="glow-blue" />
            <FeatureCard icon={Shield} title="Account Protection Mode" body="Automatic warnings when drawdown enters the danger zone." />
            <FeatureCard icon={Brain} title="AI Performance Coach" body="Claude-powered analysis of your behavior, never signals." glow="glow-purple" />
            <FeatureCard icon={Target} title="Discipline Center" body="Live score 0-100, rule violations, daily and monthly consistency." />
            <FeatureCard icon={TrendingUp} title="Trading DNA" body="Auto-detect your best session, best setup, best conditions." glow="glow-green" />
            <FeatureCard icon={Trophy} title="Payout Center & Simulator" body="Track withdrawals, estimate next payout, simulate scenarios." />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <SectionTitle kicker="How it Works" title="Four steps to a protected funded career" />
          <div className="grid md:grid-cols-4 gap-6 mt-12">
            {[
              { n: "01", t: "Connect Accounts", d: "Add your Topstep, Apex, FTMO accounts." },
              { n: "02", t: "Track Performance", d: "Log trades with screenshots, emotions, setups." },
              { n: "03", t: "Improve Discipline", d: "Get scored on every rule, every session." },
              { n: "04", t: "Maximize Payouts", d: "Survive longer. Withdraw more. Compound." },
            ].map((s) => (
              <div key={s.n} className="card-elev p-6">
                <div className="font-mono text-3xl text-[#4F8CFF] mb-3">{s.n}</div>
                <div className="font-semibold text-lg mb-2">{s.t}</div>
                <div className="text-sm text-[#9CA3AF]">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Command Center Preview */}
      <section className="py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <SectionTitle kicker="Command Center" title="Your funded empire — at a glance" />
            <div className="space-y-3 mt-8">
              {["Funded Capital across all firms", "Aggregated profit & global drawdown", "Estimated combined payout", "Discipline score 0-100", "Account-by-account health"].map((x) => (
                <div key={x} className="flex items-center gap-3 text-[#9CA3AF]"><CheckCircle2 className="w-4 h-4 text-[#00E676]" /> {x}</div>
              ))}
            </div>
          </div>
          <div className="card-elev p-6 glow-blue">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl bg-black/40 border border-white/5 p-4">
                <div className="text-xs text-[#9CA3AF] font-mono uppercase">Funded Capital</div>
                <div className="text-2xl font-bold font-mono">$650,000</div>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/5 p-4">
                <div className="text-xs text-[#9CA3AF] font-mono uppercase">Total Profit</div>
                <div className="text-2xl font-bold font-mono text-[#00E676]">+$48,210</div>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/5 p-4">
                <div className="text-xs text-[#9CA3AF] font-mono uppercase">Drawdown</div>
                <div className="text-2xl font-bold font-mono">$12,800</div>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/5 p-4">
                <div className="text-xs text-[#9CA3AF] font-mono uppercase">Payouts</div>
                <div className="text-2xl font-bold font-mono">$31,400</div>
              </div>
            </div>
            <div className="h-32 rounded-xl bg-gradient-to-br from-[#4F8CFF]/10 to-[#7C4DFF]/10 border border-white/5 flex items-end p-4 gap-1">
              {[20,35,28,55,40,72,68,90,75,88,95,82,98].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#4F8CFF] to-[#7C4DFF]" style={{ height: `${h}%`, opacity: 0.4 + i / 30 }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Discipline Score */}
      <section className="py-28 px-6 lg:px-10 grid-bg">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 card-elev p-10 text-center glow-green">
            <div className="text-xs font-mono uppercase tracking-widest text-[#9CA3AF] mb-4">Today's Discipline</div>
            <div className="text-7xl font-bold font-mono text-[#00E676]">94<span className="text-3xl text-[#9CA3AF]">/100</span></div>
            <div className="mt-8 space-y-3 text-left max-w-sm mx-auto">
              {["Risk Respected", "Session Respected", "Plan Respected", "Max Trades Respected"].map((x) => (
                <div key={x} className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#00E676]" /> <span className="text-sm">{x}</span></div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <SectionTitle kicker="Discipline Engine" title="Get scored on what actually matters" sub="Every trade is graded against your rules. Stop guessing whether you're improving — see it." />
          </div>
        </div>
      </section>

      {/* AI Coach */}
      <section className="py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <SectionTitle kicker="AI Performance Coach" title="Claude Sonnet 4.5 reads your trades" sub="Not signals. Not predictions. Pure behavioral analysis. Find your biggest mistake. Identify your best setup. Improve, faster." />
          </div>
          <div className="card-elev p-6 glow-purple space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#9CA3AF]"><Sparkles className="w-4 h-4 text-[#7C4DFF]" /> Coach Analysis</div>
            <div className="text-sm leading-relaxed">
              <p className="text-[#9CA3AF] mb-2"><span className="text-white font-semibold">Summary:</span> Your London session winrate is 71% but you traded NY 64% of the time. You're trading the wrong window.</p>
              <p className="text-[#9CA3AF] mb-2"><span className="text-white font-semibold">Biggest cost:</span> Revenge trades cost you $2,840 last month.</p>
              <p className="text-[#9CA3AF]"><span className="text-white font-semibold">Action:</span> Cap trades at 3 per session. Hard stop after 2 losses.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-28 px-6 lg:px-10 grid-bg">
        <div className="max-w-7xl mx-auto">
          <SectionTitle kicker="Pricing" title="Built for funded traders" sub="Cancel anytime. No setup fees." />
          <div className="grid md:grid-cols-2 gap-6 mt-12 max-w-4xl">
            <div className="card-elev p-8">
              <div className="text-sm font-mono uppercase text-[#9CA3AF]">Starter</div>
              <div className="text-5xl font-bold mt-4 font-mono">€9.99<span className="text-base text-[#9CA3AF]">/mo</span></div>
              <div className="text-sm text-[#9CA3AF] mt-2">Perfect for 1 funded account</div>
              <div className="mt-8 space-y-3 text-sm">
                {["Up to 2 accounts", "Trade journal", "Discipline score", "Basic analytics"].map((x) => (
                  <div key={x} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#9CA3AF]" /> {x}</div>
                ))}
              </div>
              <Link to="/register" className="btn-ghost block text-center mt-8 text-white">Start Free</Link>
            </div>
            <div className="card-elev p-8 glow-purple border-[#7C4DFF]/40 relative" data-testid="pricing-pro">
              <div className="absolute -top-3 right-6 text-xs font-mono uppercase tracking-widest bg-gradient-to-r from-[#4F8CFF] to-[#7C4DFF] rounded-full px-3 py-1">Most Popular</div>
              <div className="text-sm font-mono uppercase text-[#7C4DFF]">Pro</div>
              <div className="text-5xl font-bold mt-4 font-mono">€19.99<span className="text-base text-[#9CA3AF]">/mo</span></div>
              <div className="text-sm text-[#9CA3AF] mt-2">For serious multi-account traders</div>
              <div className="mt-8 space-y-3 text-sm">
                {["Unlimited accounts", "AI Coach (Claude Sonnet 4.5)", "Trading DNA", "Survival Score", "Mistake Cost Tracker", "Priority support"].map((x) => (
                  <div key={x} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#00E676]" /> {x}</div>
                ))}
              </div>
              <Link to="/register" className="btn-primary block text-center mt-8" data-testid="pricing-pro-cta">Go Pro</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-28 px-6 lg:px-10">
        <div className="max-w-3xl mx-auto">
          <SectionTitle kicker="FAQ" title="Frequently asked" />
          <div className="space-y-3 mt-10">
            {[
              { q: "Does PipsEvo connect to my broker?", a: "Currently you log trades manually or via paste import. Direct Tradovate/Rithmic/MT5 connections are on the roadmap." },
              { q: "Will you give me trade signals?", a: "Never. PipsEvo only analyzes your behavior and performance — we're an operating system, not a signal service." },
              { q: "Which prop firms do you support?", a: "Topstep, Apex, FTMO, FundedNext, The5ers, Take Profit Trader — and you can add custom rules for any firm." },
              { q: "Can I cancel anytime?", a: "Yes, cancel anytime from your billing portal. No questions asked." },
            ].map((f) => (
              <details key={f.q} className="card-elev p-5 cursor-pointer">
                <summary className="font-semibold flex items-center justify-between">{f.q}<span className="text-[#4F8CFF]">+</span></summary>
                <p className="text-[#9CA3AF] text-sm mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 lg:px-10">
        <div className="max-w-4xl mx-auto card-elev p-16 text-center glow-blue">
          <Calendar className="w-10 h-10 mx-auto text-[#4F8CFF] mb-6" />
          <h2 className="text-4xl sm:text-5xl font-bold text-gradient">Stop losing accounts.<br />Start engineering payouts.</h2>
          <p className="text-[#9CA3AF] mt-6 max-w-xl mx-auto">Join PipsEvo and treat your funded career like the business it is.</p>
          <Link to="/register" className="btn-primary inline-flex items-center gap-2 mt-8" data-testid="footer-cta">Start Free <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </section>

      <footer className="py-12 px-6 lg:px-10 border-t border-white/5 text-sm text-[#9CA3AF]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="font-semibold text-white">PipsEvo<span className="text-[#4F8CFF]">.</span></div>
          <div>© 2026 PipsEvo. The Operating System for Funded Traders.</div>
        </div>
      </footer>
    </div>
  );
}
