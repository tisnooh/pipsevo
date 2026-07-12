import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Play, Check, Shield, BookOpen, Activity, Brain, Banknote, User, Building2, TrendingUp, Trophy, FlaskConical, Target } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { Candle, DashboardMock } from "@/components/CandleArt";

const fade = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
};

const propFirmLogos = [
  { name: "Topstep", src: "https://cdn.prod.website-files.com/69e902b0a74d3d99a517f56d/6a299fdfbdc3a918fdf4b3ff_topstep_logo-white.webp", alt: "Topstep" },
  { name: "Apex Trader Funding", src: "https://apextraderfunding.com/app/plugins/apex-features/assets/src/images/apex-logo-light.svg", alt: "Apex Trader Funding" },
  { name: "FTMO", src: "https://ftmo-frontend-prod.storage.googleapis.com/wp-content/uploads/2025/10/03131016/logo-light.png", alt: "FTMO" },
  { name: "FundedNext", src: "https://fundednext.com/images/fundednext-logo-white.png", alt: "FundedNext" },
  { name: "The5ers", src: "https://wp.the5ers.com/wp-content/uploads/2026/03/press-kit-logo-1.png", alt: "The5ers" },
];

export default function Landing() {
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  const [activeStory, setActiveStory] = useState(0);
  const stories = [
    { icon: BookOpen, label: "Journal", eyebrow: "CHAQUE TRADE COMPTE", title: "Arrête de répéter les mêmes erreurs.", text: "Transforme chaque décision en donnée exploitable. Repère les setups qui te paient, les sessions qui te coûtent et les habitudes qui fragilisent ton compte.", bullets: ["Historique structuré par compte", "Tags, notes et émotions", "Résultats comparables dans le temps"], color: "#B58BFF" },
    { icon: Shield, label: "Discipline", eyebrow: "PROTÈGE TON CAPITAL", title: "Une mauvaise journée ne doit plus effacer une bonne semaine.", text: "Suis tes limites, ton drawdown restant et le respect de ton plan avant que la pression ne prenne le contrôle.", bullets: ["Score de discipline", "Suivi des règles prop firm", "Alertes sur les comportements à risque"], color: "#00E676" },
    { icon: FlaskConical, label: "Backtest", eyebrow: "PROUVE TON EDGE", title: "Teste avant de risquer ton compte financé.", text: "Simule ta stratégie, mesure son espérance et son drawdown, puis décide avec des chiffres plutôt qu'avec une impression.", bullets: ["Capital et risque composés", "Espérance en R", "Drawdown maximal simulé"], color: "#4F8CFF" },
    { icon: Brain, label: "Coach IA", eyebrow: "COMPRENDS TES PATTERNS", title: "Tes données racontent une histoire. L'IA t'aide à la lire.", text: "Le coach analyse ton processus et transforme tes trades en actions concrètes, sans donner de signaux ni prédire le marché.", bullets: ["Analyse comportementale", "Questions sur tes performances", "Plan d'action personnalisé"], color: "#FF4FD8" },
    { icon: Banknote, label: "Payouts", eyebrow: "PENSE LONG TERME", title: "Ne cherche plus seulement à gagner. Apprends à durer.", text: "Visualise tes étapes vers le prochain payout tout en conservant un coussin de sécurité adapté aux règles de tes comptes.", bullets: ["Suivi des retraits", "Projection du prochain payout", "Vue consolidée multi-comptes"], color: "#FFB855" },
  ];
  useEffect(() => {
    const h = (e) => { setMx((e.clientX / window.innerWidth - 0.5) * 18); setMy((e.clientY / window.innerHeight - 0.5) * 18); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  return (
    <div className="bg-[#050505] text-white overflow-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 sm:px-6 lg:px-10 py-3.5 sm:py-4 bg-[#050505]/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="lg" />
          <div className="hidden md:flex items-center gap-9 text-sm text-[#B5BBC9]">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#how" className="hover:text-white transition">How it Works</a>
            <Link to="/pricing" className="hover:text-white transition">Tarifs</Link>
            <a href="#reviews" className="hover:text-white transition">Reviews</a>
            <Link to="/faq" className="hover:text-white transition">FAQ</Link>
            <Link to="/contact" className="hover:text-white transition">Contact</Link>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link to="/login" className="text-xs sm:text-sm px-2.5 sm:px-4 py-2 text-[#9CA3AF] hover:text-white" data-testid="nav-login">Log in</Link>
            <Link to="/register" className="btn-primary text-xs sm:text-sm px-3.5 sm:px-5" data-testid="nav-register">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-28 sm:pt-32 lg:pt-36 pb-16 sm:pb-20 lg:pb-24 px-5 sm:px-6 lg:px-10">
        {/* background atmospherics */}
        <div className="absolute inset-0 grid-floor opacity-60 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-[700px] h-[700px] rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle, #7C4DFF, transparent 70%)", transform: `translate(${mx}px, ${my}px)` }} />
          <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle, #4F8CFF, transparent 70%)", transform: `translate(${-mx}px, ${-my}px)` }} />
          <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] rounded-full blur-3xl opacity-15" style={{ background: "radial-gradient(circle, #FF4FD8, transparent 70%)" }} />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 sm:gap-14 lg:gap-10 items-center relative z-10">
          {/* LEFT */}
          <motion.div initial="hidden" animate="show" variants={fade} className="lg:col-span-5 space-y-6 sm:space-y-7 text-center lg:text-left">
            <motion.div custom={0} variants={fade} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-[#B5BBC9]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] pulse-glow shrink-0" /> Now in Beta · Join 2,400+ funded traders
            </motion.div>
            <motion.h1 custom={1} variants={fade} className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] sm:leading-[1.02] tracking-tight">
              <span className="text-gradient">Protège tes comptes financés.</span><br className="hidden sm:block" />{" "}
              <span className="text-purple-grad">Transforme tes trades en progrès.</span>
            </motion.h1>
            <motion.p custom={2} variants={fade} className="text-base sm:text-lg text-[#9CA3AF] max-w-md mx-auto lg:mx-0 leading-relaxed">
              PipsEvo révèle ce qui renforce ta performance, ce qui fragilise ta discipline et ce qui te rapproche réellement d'un payout.
            </motion.p>
            <motion.div custom={3} variants={fade} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Link to="/register" className="btn-primary inline-flex items-center justify-center gap-2 text-base w-full sm:w-auto" data-testid="hero-cta-start">Commencer gratuitement <ArrowRight className="w-4 h-4"/></Link>
              <a href="#story" className="btn-ghost inline-flex items-center justify-center gap-2 text-base w-full sm:w-auto" data-testid="hero-cta-demo"><Play className="w-4 h-4 fill-white"/> Découvrir PipsEvo</a>
            </motion.div>
            <motion.div custom={4} variants={fade} className="pt-4 sm:pt-6">
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#6B7280] mb-3">Trusted by traders at</div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-7 gap-y-5 min-h-7">
                {propFirmLogos.map((firm) => (
                  <img
                    key={firm.name}
                    src={firm.src}
                    alt={firm.alt}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    className="h-[22px] sm:h-6 w-auto max-w-[118px] object-contain grayscale brightness-125 opacity-55 transition-opacity duration-200 hover:opacity-100"
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT — Tilted 3D dashboard mockup with floating candles (desktop/tablet only — too dense to stay legible on phones) */}
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.22,1,0.36,1] }} className="hidden lg:block lg:col-span-7 relative">
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

          {/* Mobile-only: lightweight candle accent instead of the full dashboard mockup */}
          <div className="lg:hidden flex justify-center gap-4 pt-2">
            <div className="floaty"><Candle color="purple" height={70} rot={-6} /></div>
            <div className="floaty-slow" style={{ animationDelay: "0.6s" }}><Candle color="green" height={90} rot={5} /></div>
            <div className="floaty" style={{ animationDelay: "1.1s" }}><Candle color="pink" height={60} rot={-3} /></div>
          </div>
        </div>
      </section>

      {/* 4 STEPS */}
      <section id="how" className="px-5 sm:px-6 lg:px-10 pb-14 sm:pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto card-elev p-6 sm:p-10 lg:p-14">
          <div className="grid lg:grid-cols-5 gap-6 sm:gap-8 items-center">
            <div className="lg:col-span-1 text-center lg:text-left">
              <div className="text-2xl sm:text-3xl font-bold leading-tight text-gradient">Get Started<br/>in 4 Simple Steps</div>
            </div>
            <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 relative">
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
      <section id="features" className="px-5 sm:px-6 lg:px-10 pb-14 sm:pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
      <section className="px-5 sm:px-6 lg:px-10 pb-14 sm:pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto card-elev p-6 sm:p-10 lg:p-14">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-3 text-center lg:text-left">
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#B58BFF] mb-3 px-3 py-1 rounded-full inline-block border border-[#7C4DFF]/40">SUPPORTED ASSETS</div>
              <div className="text-3xl sm:text-4xl font-bold leading-tight">Trade <span className="text-purple-grad">all.</span><br/>Analyze <span className="text-purple-grad">all.</span></div>
            </div>
            <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
      <section className="px-5 sm:px-6 lg:px-10 pb-14 sm:pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto card-elev p-6 sm:p-10 lg:p-14 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative overflow-hidden">
          <div className="relative z-10 text-center lg:text-left">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#B58BFF] mb-3">ALL IN ONE PLACE</div>
            <div className="text-3xl sm:text-4xl font-bold leading-tight">Powerful. Complete.<br/>Built for <span className="text-purple-grad">traders.</span></div>
            <div className="mt-7 sm:mt-8 space-y-3 text-left max-w-sm mx-auto lg:mx-0">
              {["Manage multiple accounts", "Smart journal with screenshots", "Real-time discipline score", "AI performance analysis", "Track payouts and milestones"].map(x => (
                <div key={x} className="flex items-center gap-3"><Check className="w-4 h-4 text-[#00E676] shrink-0"/> <span className="text-sm text-[#B5BBC9]">{x}</span></div>
              ))}
            </div>
            <Link to="/register" className="btn-ghost inline-flex items-center gap-2 mt-8" data-testid="cta-features">Discover all features <ArrowRight className="w-4 h-4"/></Link>
          </div>
          {/* Dashboard preview — desktop/tablet only, same reasoning as hero */}
          <div className="hidden lg:block relative">
            <div style={{ transform: "scale(0.78)", transformOrigin: "top left" }}><DashboardMock /></div>
            <div className="absolute -left-4 top-10 floaty"><Candle color="green" height={90} rot={-4} /></div>
            <div className="absolute right-10 -top-4 floaty-slow"><Candle color="pink" height={110} rot={8} /></div>
            <div className="absolute right-0 bottom-4 floaty"><Candle color="purple" height={70} rot={-6} /></div>
          </div>
        </div>
      </section>

      {/* STORYTELLING PRODUIT */}
      <section id="story" className="px-5 sm:px-6 lg:px-10 pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-14">
            <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#B58BFF] mb-4">DE LA PRESSION À LA MAÎTRISE</div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight text-gradient">Comprends ce qui te fait dévier.<br/><span className="text-purple-grad">Renforce ce qui te fait durer.</span></h2>
            <p className="text-[#9CA3AF] mt-5 max-w-2xl mx-auto">Un compte financé ne se protège pas avec plus de trades, mais avec de meilleures décisions répétées.</p>
          </div>

          <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 justify-start lg:justify-center scrollbar-thin">
            {stories.map((story, i) => <button key={story.label} onClick={()=>setActiveStory(i)} className={`min-w-[110px] sm:min-w-[140px] rounded-2xl px-4 py-4 flex flex-col items-center gap-2 border transition-all ${activeStory===i?"bg-white/[0.06] border-[#7C4DFF]/50":"border-transparent text-[#6B7280] hover:text-white"}`}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{background:activeStory===i?`${story.color}25`:"rgba(255,255,255,.03)"}}><story.icon className="w-5 h-5" style={{color:activeStory===i?story.color:"#6B7280"}}/></div>
              <span className="text-xs font-medium whitespace-nowrap">{story.label}</span>
            </button>)}
          </div>

          <motion.div key={activeStory} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.45}} className="mt-6 card-elev overflow-hidden grid lg:grid-cols-2 min-h-[460px]">
            <div className="p-7 sm:p-12 lg:p-16 flex flex-col justify-center">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{color:stories[activeStory].color}}>{stories[activeStory].eyebrow}</div>
              <h3 className="text-3xl sm:text-4xl font-bold leading-tight mt-4">{stories[activeStory].title}</h3>
              <p className="text-[#9CA3AF] mt-5 leading-relaxed">{stories[activeStory].text}</p>
              <div className="space-y-3 mt-7">{stories[activeStory].bullets.map(x=><div key={x} className="flex items-center gap-3 text-sm text-[#B5BBC9]"><Check className="w-4 h-4 shrink-0" style={{color:stories[activeStory].color}}/>{x}</div>)}</div>
              <Link to="/register" className="btn-primary inline-flex self-start items-center gap-2 mt-8">Commencer mon suivi <ArrowRight className="w-4 h-4"/></Link>
            </div>
            <div className="relative p-6 sm:p-10 flex items-center justify-center overflow-hidden bg-[#080912]">
              <div className="absolute inset-0 opacity-30" style={{background:`radial-gradient(circle at 50% 50%, ${stories[activeStory].color}55, transparent 65%)`}}/>
              <div className="relative w-full max-w-lg card-flat p-5 sm:p-7 shadow-2xl">
                <div className="flex items-center justify-between"><div className="text-sm font-semibold">PipsEvo · {stories[activeStory].label}</div><span className="w-2 h-2 rounded-full" style={{background:stories[activeStory].color,boxShadow:`0 0 14px ${stories[activeStory].color}`}}/></div>
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {["Discipline","Survie","Payout"].map((x,i)=><div key={x} className="bg-[#0A0C14] border border-white/5 rounded-xl p-3"><div className="text-[9px] text-[#6B7280]">{x}</div><div className="text-lg font-bold font-mono mt-1" style={{color:i===activeStory%3?stories[activeStory].color:"white"}}>{[94,87,62][i]}<span className="text-[9px] text-[#6B7280]">%</span></div></div>)}
                </div>
                <div className="mt-4 bg-[#0A0C14] border border-white/5 rounded-xl p-4"><div className="text-[10px] text-[#6B7280]">Progression sur 30 jours</div><svg viewBox="0 0 320 100" className="w-full h-32 mt-2"><path d="M0 86 C35 80 48 62 78 69 S120 46 155 52 S205 28 242 34 S286 13 320 8" fill="none" stroke={stories[activeStory].color} strokeWidth="3"/><path d="M0 86 C35 80 48 62 78 69 S120 46 155 52 S205 28 242 34 S286 13 320 8 L320 100 L0 100Z" fill={`${stories[activeStory].color}18`}/></svg></div>
                <div className="mt-4 flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]"><Target className="w-5 h-5" style={{color:stories[activeStory].color}}/><div><div className="text-xs font-semibold">Action recommandée</div><div className="text-[10px] text-[#9CA3AF] mt-1">Respecte ton plan sur les 5 prochains trades.</div></div></div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* LE VRAI PROBLÈME */}
      <section className="px-5 sm:px-6 lg:px-10 pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#FF7A7A]">LE RISQUE INVISIBLE</div>
              <h2 className="text-3xl sm:text-5xl font-bold leading-tight mt-4">Ton compte ne se fragilise pas en un trade.<br/><span className="text-purple-grad">Il se fragilise en répétant les mêmes décisions.</span></h2>
              <p className="text-[#9CA3AF] mt-5 leading-relaxed max-w-xl">Une entrée impulsive. Un stop déplacé. Un trade repris trop vite après une perte. Pris séparément, chaque écart paraît minime. Répétés, ils consomment ton drawdown et éloignent ton payout.</p>
              <Link to="/register" className="btn-ghost inline-flex items-center gap-2 mt-7">Identifier mes habitudes <ArrowRight className="w-4 h-4"/></Link>
            </div>
            <div className="space-y-3">
              {[
                {n:"01",t:"Avant le trade",d:"Tu connais ton plan, mais tu ne mesures pas toujours si les conditions sont réellement réunies.",c:"#4F8CFF"},
                {n:"02",t:"Pendant la pression",d:"La perte latente transforme parfois une décision préparée en réaction émotionnelle.",c:"#FFB855"},
                {n:"03",t:"Après le résultat",d:"Sans journal structuré, tu retiens le gain ou la perte — pas la qualité de la décision.",c:"#FF5252"},
              ].map((x,i)=><motion.div key={x.n} initial={{opacity:0,x:30}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:i*.12}} className="card-flat p-5 sm:p-6 flex gap-4"><div className="text-xs font-mono w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{color:x.c,background:`${x.c}18`}}>{x.n}</div><div><h3 className="font-semibold">{x.t}</h3><p className="text-sm text-[#9CA3AF] mt-1.5 leading-relaxed">{x.d}</p></div></motion.div>)}
            </div>
          </div>
        </div>
      </section>

      {/* PARCOURS DE TRANSFORMATION */}
      <section className="px-5 sm:px-6 lg:px-10 pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto card-elev p-6 sm:p-10 lg:p-14 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{background:"radial-gradient(circle at 50% 0%, #7C4DFF, transparent 55%)"}}/>
          <div className="relative text-center max-w-3xl mx-auto">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#B58BFF]">UNE BOUCLE QUI TE FAIT PROGRESSER</div>
            <h2 className="text-3xl sm:text-5xl font-bold mt-4">Observe. Comprends. Ajuste. Répète.</h2>
            <p className="text-[#9CA3AF] mt-4">PipsEvo transforme ton historique en un processus d’amélioration continu.</p>
          </div>
          <div className="relative grid md:grid-cols-4 gap-4 mt-10">
            {[
              {n:"1",t:"Capture",d:"Enregistre le trade, le contexte, le setup et ton état émotionnel.",I:BookOpen,c:"#4F8CFF"},
              {n:"2",t:"Mesure",d:"Compare le PnL, le R multiple, la discipline et le drawdown.",I:Activity,c:"#00E676"},
              {n:"3",t:"Comprends",d:"Repère les sessions, instruments et comportements récurrents.",I:Brain,c:"#B58BFF"},
              {n:"4",t:"Protège",d:"Transforme l'analyse en règles simples pour les prochains trades.",I:Shield,c:"#FFB855"},
            ].map((x,i)=><div key={x.n} className="relative card-flat p-6 text-center"><div className="absolute top-3 right-3 text-[10px] font-mono text-[#6B7280]">ÉTAPE {x.n}</div><div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center" style={{background:`${x.c}18`}}><x.I className="w-6 h-6" style={{color:x.c}}/></div><h3 className="font-semibold mt-5">{x.t}</h3><p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed">{x.d}</p>{i<3&&<div className="hidden md:block absolute top-1/2 -right-3 z-10 text-[#7C4DFF]">→</div>}</div>)}
          </div>
        </div>
      </section>

      {/* TRADINGVIEW CONNECTÉ */}
      <TradingViewSection />

      {/* HISTOIRES PRODUIT ALTERNÉES */}
      <section className="px-5 sm:px-6 lg:px-10 pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto space-y-20 sm:space-y-28">
          <StoryChapter side="left" eyebrow="TABLEAU DE BORD" title="Vois le risque avant qu'il ne devienne une violation." text="Tous tes comptes, leur capital, leur drawdown restant et leur progression réunis dans une seule vue. Tu sais où ralentir et où ton processus reste solide." bullets={["Vue consolidée multi-comptes","Santé et survie de chaque compte","Progression vers les objectifs"]} color="#00E676" />
          <StoryChapter side="right" eyebrow="JOURNAL DE TRADING" title="Le résultat dit combien. Le journal explique pourquoi." text="Un trade gagnant peut être une mauvaise décision. Un trade perdant peut respecter parfaitement ton plan. PipsEvo t'aide à séparer le processus du résultat." bullets={["Notes et contexte par trade","Comparaison par setup et session","Respect du plan mesuré"]} color="#B58BFF" />
          <StoryChapter side="left" eyebrow="COACH COMPORTEMENTAL" title="Ne demande plus seulement “combien j'ai gagné ?” Demande “qu'est-ce qui se répète ?”" text="Interroge tes propres données pour identifier les écarts les plus coûteux et définir une action concrète pour ta prochaine session." bullets={["Questions basées sur ton historique","Analyse sans signaux de marché","Actions orientées discipline"]} color="#FF4FD8" />
        </div>
      </section>

      {/* COMPARAISON */}
      <section className="px-5 sm:px-6 lg:px-10 pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10"><div className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#B58BFF]">CHANGE DE SYSTÈME</div><h2 className="text-3xl sm:text-5xl font-bold mt-4">L'intuition se souvient du dernier trade.<br/><span className="text-purple-grad">Les données révèlent les cent derniers.</span></h2></div>
          <div className="card-elev overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-white/10"><th className="text-left p-5 text-[#9CA3AF] font-normal">Besoin du trader financé</th><th className="p-5 text-[#9CA3AF] font-normal">Mémoire / intuition</th><th className="p-5 text-[#9CA3AF] font-normal">Tableur</th><th className="p-5 text-[#B58BFF]">PipsEvo</th></tr></thead><tbody>{[
            ["Comprendre une série de pertes","Impression","Calcul manuel","Analyse structurée"],
            ["Suivre plusieurs comptes","Difficile","Onglets séparés","Vue consolidée"],
            ["Mesurer la discipline","Subjectif","Colonnes à maintenir","Score automatique"],
            ["Protéger le drawdown","Réaction tardive","Formules","Suivi permanent"],
            ["Préparer un payout","Estimation","Calcul manuel","Projection dédiée"],
          ].map((r,i)=><tr key={r[0]} className="border-b border-white/5 last:border-0"><td className="p-5 font-medium">{r[0]}</td><td className="p-5 text-center text-[#6B7280]">{r[1]}</td><td className="p-5 text-center text-[#9CA3AF]">{r[2]}</td><td className="p-5 text-center text-[#B58BFF] font-medium">✓ {r[3]}</td></tr>)}</tbody></table></div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-5 sm:px-6 lg:px-10 pb-14 sm:pb-16 lg:pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#B58BFF] mb-3">PRICING</div>
            <h2 className="text-4xl font-bold text-gradient">Built for funded traders.</h2>
            <p className="text-[#9CA3AF] mt-3">Cancel anytime. No setup fees.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card-elev p-6 sm:p-8">
              <div className="text-sm font-mono uppercase text-[#9CA3AF]">Starter</div>
              <div className="text-4xl sm:text-5xl font-bold mt-4 font-mono">€9.99<span className="text-base text-[#9CA3AF]">/mo</span></div>
              <div className="text-sm text-[#9CA3AF] mt-2">Perfect for 1 funded account</div>
              <div className="mt-8 space-y-3 text-sm">
                {["Up to 2 accounts", "Trade journal", "Discipline score", "Basic analytics"].map(x => <div key={x} className="flex gap-2 text-[#B5BBC9]"><Check className="w-4 h-4 text-[#9CA3AF] shrink-0"/> {x}</div>)}
              </div>
              <Link to="/register" className="btn-ghost block text-center mt-8">Start Free</Link>
            </div>
            <div className="card-elev p-6 sm:p-8 glow-purple border-[#7C4DFF]/40 relative" data-testid="pricing-pro">
              <div className="absolute -top-3 right-6 text-[10px] font-mono uppercase tracking-widest bg-gradient-to-r from-[#7C4DFF] to-[#4F8CFF] rounded-full px-3 py-1">Most Popular</div>
              <div className="text-sm font-mono uppercase text-[#B58BFF]">Pro</div>
              <div className="text-4xl sm:text-5xl font-bold mt-4 font-mono">€19.99<span className="text-base text-[#9CA3AF]">/mo</span></div>
              <div className="text-sm text-[#9CA3AF] mt-2">For serious multi-account traders</div>
              <div className="mt-8 space-y-3 text-sm">
                {["Unlimited accounts", "AI Coach (Claude Sonnet 4.5)", "Trading DNA", "Survival Score", "Mistake Cost Tracker", "Priority support"].map(x => <div key={x} className="flex gap-2 text-[#B5BBC9]"><Check className="w-4 h-4 text-[#00E676] shrink-0"/> {x}</div>)}
              </div>
              <Link to="/register" className="btn-primary block text-center mt-8" data-testid="pricing-pro-cta">Go Pro</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-5 sm:px-6 lg:px-10 pb-14 sm:pb-16 lg:pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#B58BFF] mb-3">FAQ</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gradient">Frequently asked.</h2>
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
      <section className="px-5 sm:px-6 lg:px-10 pb-16 sm:pb-20 lg:pb-24">
        <div className="max-w-7xl mx-auto card-elev p-6 sm:p-10 lg:p-14 flex flex-col lg:flex-row items-center text-center lg:text-left justify-between gap-6 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 w-[300px] h-[300px] rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle, #7C4DFF, transparent)" }} />
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C4DFF] to-[#4F8CFF] flex items-center justify-center shrink-0"><Trophy className="w-7 h-7"/></div>
            <div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gradient">Ready to protect your accounts<br className="hidden sm:block"/> and maximize your payouts?</div>
            </div>
          </div>
          <Link to="/register" className="btn-primary inline-flex items-center gap-2 relative z-10 w-full sm:w-auto justify-center" data-testid="footer-cta">Start free <ArrowRight className="w-4 h-4"/></Link>
        </div>
        <div className="max-w-7xl mx-auto text-center text-xs text-[#6B7280] mt-6">No card required · Setup in 2 minutes</div>
      </section>

      <footer className="border-t border-white/5 py-8 sm:py-10 px-5 sm:px-6 lg:px-10 text-sm text-[#9CA3AF]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 text-center sm:text-left">
          <Logo />
          <div className="flex flex-wrap justify-center gap-4"><Link to="/help">Aide</Link><Link to="/contact">Contact</Link><Link to="/platforms">Plateformes</Link><Link to="/blog">Blog</Link><Link to="/faq">FAQ</Link><Link to="/affiliate">Partenaires</Link><Link to="/privacy">Confidentialité</Link><Link to="/terms">Conditions</Link></div>
          <div>© 2026 PipsEvo · The Operating System for Funded Traders.</div>
        </div>
      </footer>
    </div>
  );
}

const tvMarkets = [
  { label: "EUR/USD", symbol: "OANDA:EURUSD" },
  { label: "Or", symbol: "OANDA:XAUUSD" },
  { label: "Nasdaq", symbol: "NASDAQ:NDX" },
  { label: "S&P 500", symbol: "SP:SPX" },
  { label: "Bitcoin", symbol: "BINANCE:BTCUSDT" },
];

const TradingViewSection = () => {
  const [market, setMarket] = useState(tvMarkets[0]);
  const [interval, setInterval] = useState("60");
  return <section className="px-5 sm:px-6 lg:px-10 pb-16 sm:pb-24">
    <div className="max-w-7xl mx-auto">
      <div className="text-center max-w-4xl mx-auto mb-9 sm:mb-12">
        <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#B58BFF]">GRAPHIQUE DE MARCHÉ CONNECTÉ</div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mt-4">Analyse le contexte.<br/><span className="text-purple-grad">Documente ensuite ta décision.</span></h2>
        <p className="text-[#9CA3AF] mt-5 max-w-2xl mx-auto">Consulte un graphique TradingView directement dans PipsEvo, puis transforme ton observation en donnée de journal exploitable.</p>
      </div>
      <div className="card-elev p-3 sm:p-5 lg:p-6 glow-purple">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1">{tvMarkets.map(x=><button key={x.symbol} onClick={()=>setMarket(x)} className={`px-3.5 py-2 rounded-xl text-xs whitespace-nowrap border transition ${market.symbol===x.symbol?"bg-[#7C4DFF]/20 border-[#7C4DFF]/50 text-white":"border-white/5 text-[#9CA3AF] hover:text-white"}`}>{x.label}</button>)}</div>
          <div className="flex items-center gap-2"><span className="text-[10px] text-[#6B7280] font-mono uppercase">Unité</span>{[["15","15m"],["60","1h"],["240","4h"],["D","1j"]].map(([v,l])=><button key={v} onClick={()=>setInterval(v)} className={`px-3 py-1.5 rounded-lg text-xs ${interval===v?"bg-white/10 text-white":"text-[#6B7280] hover:text-white"}`}>{l}</button>)}</div>
        </div>
        <div className="h-[420px] sm:h-[520px] lg:h-[620px] rounded-xl overflow-hidden border border-white/10 bg-[#131722]">
          <TradingViewChart symbol={market.symbol} interval={interval}/>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 px-1"><p className="text-[10px] text-[#6B7280]">Données et graphique fournis par TradingView. PipsEvo ne fournit aucun signal ni conseil d'investissement.</p><Link to="/register" className="text-xs text-[#B58BFF] whitespace-nowrap">Créer mon journal →</Link></div>
      </div>
    </div>
  </section>;
};

const TradingViewChart = ({ symbol, interval }) => {
  const container = useRef(null);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    node.innerHTML = '<div class="tradingview-widget-container__widget" style="height:calc(100% - 28px);width:100%"></div><div class="tradingview-widget-copyright" style="height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#6B7280"><a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" style="color:#8B9DC3">Graphique</a>&nbsp;par TradingView</div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Europe/Paris",
      theme: "dark",
      style: "1",
      locale: "fr",
      backgroundColor: "#131722",
      gridColor: "rgba(255,255,255,0.04)",
      allow_symbol_change: true,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      save_image: true,
      calendar: false,
      withdateranges: true,
      support_host: "https://www.tradingview.com",
    });
    node.appendChild(script);
    return () => { node.innerHTML = ""; };
  }, [symbol, interval]);
  return <div ref={container} className="tradingview-widget-container h-full w-full" />;
};

const StoryChapter = ({ side, eyebrow, title, text, bullets, color }) => (
  <motion.div initial={{opacity:0,y:35}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.2}} transition={{duration:.7}} className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
    <div className={side === "right" ? "lg:order-2" : ""}>
      <div className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{color}}>{eyebrow}</div>
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mt-4">{title}</h2>
      <p className="text-[#9CA3AF] leading-relaxed mt-5">{text}</p>
      <div className="space-y-3 mt-7">{bullets.map(x=><div key={x} className="flex items-center gap-3 text-sm text-[#B5BBC9]"><Check className="w-4 h-4" style={{color}}/>{x}</div>)}</div>
    </div>
    <div className={`relative ${side === "right" ? "lg:order-1" : ""}`}>
      <div className="absolute -inset-10 blur-3xl opacity-20 rounded-full" style={{background:color}}/>
      <div className="relative card-elev p-5 sm:p-7">
        <div className="flex items-center justify-between border-b border-white/5 pb-4"><div className="text-xs font-semibold">{eyebrow}</div><div className="flex gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FF5252]"/><span className="w-2 h-2 rounded-full bg-[#FFB855]"/><span className="w-2 h-2 rounded-full bg-[#00E676]"/></div></div>
        <div className="grid grid-cols-3 gap-3 mt-5">{[["Capital","$105,420"],["Discipline","94/100"],["Drawdown","$6,240"]].map(([k,v],i)=><div key={k} className="card-flat p-3"><div className="text-[9px] text-[#6B7280]">{k}</div><div className="text-sm sm:text-lg font-bold font-mono mt-1" style={{color:i===1?color:"white"}}>{v}</div></div>)}</div>
        <div className="mt-4 card-flat p-4"><div className="flex justify-between text-[10px] text-[#6B7280]"><span>Évolution du processus</span><span style={{color}}>+12%</span></div><svg viewBox="0 0 420 130" className="w-full h-40"><path d="M0 110 C38 105 55 84 91 90 S142 63 185 70 S234 45 275 53 S340 25 420 18" fill="none" stroke={color} strokeWidth="3"/><path d="M0 110 C38 105 55 84 91 90 S142 63 185 70 S234 45 275 53 S340 25 420 18 L420 130 L0 130Z" fill={`${color}15`}/></svg></div>
        <div className="mt-4 space-y-2">{["Plan respecté · London session","Trade documenté · +1.8R","Limite quotidienne préservée"].map((x,i)=><div key={x} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.025] border border-white/5"><span className="text-xs text-[#B5BBC9]">{x}</span><span className="text-[10px]" style={{color:i===1?"#00E676":color}}>{i===1?"GAIN":"VALIDÉ"}</span></div>)}</div>
      </div>
    </div>
  </motion.div>
);

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
