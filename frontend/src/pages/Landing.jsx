import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Play, Check, Shield, BookOpen, Activity, Brain, Banknote, User, Building2, TrendingUp, Trophy, FlaskConical, Target, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Candle, DashboardMock } from "@/components/CandleArt";
import ProductDashboardPreview from "@/components/ProductDashboardPreview";
import TradingViewChart from "@/components/TradingViewChart";
import { openCookieSettings } from "@/components/CookieConsent";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { PLANS, formatBillingPrice } from "@/config/billing";
import { useI18n } from "@/context/I18nContext";

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
  const { language } = useI18n();
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  const [activeStory, setActiveStory] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef(null);
  const mobileMenuPanelRef = useRef(null);
  const mobileMenuFirstLinkRef = useRef(null);
  const stories = [
    { icon: BookOpen, section: "journal", label: "Journal", eyebrow: "CHAQUE TRADE COMPTE", title: "Arrête de répéter les mêmes erreurs.", text: "Transforme chaque décision en donnée exploitable. Repère les setups qui te paient, les sessions qui te coûtent et les habitudes qui fragilisent ton compte.", bullets: ["Historique structuré par compte", "Tags, notes et émotions", "Résultats comparables dans le temps"], color: "#B58BFF" },
    { icon: Shield, section: "discipline", label: "Discipline", eyebrow: "PROTÈGE TON CAPITAL", title: "Une mauvaise journée ne doit plus effacer une bonne semaine.", text: "Suis tes limites, ton drawdown restant et le respect de ton plan avant que la pression ne prenne le contrôle.", bullets: ["Score de discipline", "Suivi des règles prop firm", "Alertes sur les comportements à risque"], color: "#00E676" },
    { icon: FlaskConical, section: "backtest", label: "Backtest", eyebrow: "PROUVE TON EDGE", title: "Teste avant de risquer ton compte financé.", text: "Simule ta stratégie, mesure son espérance et son drawdown, puis décide avec des chiffres plutôt qu'avec une impression.", bullets: ["Capital et risque composés", "Espérance en R", "Drawdown maximal simulé"], color: "#4F8CFF" },
    { icon: Brain, section: "coach", label: "Coach IA", eyebrow: "COMPRENDS TES PATTERNS", title: "Tes données racontent une histoire. L'IA t'aide à la lire.", text: "Le coach analyse ton processus et transforme tes trades en actions concrètes, sans donner de signaux ni prédire le marché.", bullets: ["Analyse comportementale", "Questions sur tes performances", "Plan d'action personnalisé"], color: "#FF4FD8" },
    { icon: Banknote, section: "payouts", label: "Payouts", eyebrow: "PENSE LONG TERME", title: "Ne cherche plus seulement à gagner. Apprends à durer.", text: "Visualise tes étapes vers le prochain payout tout en conservant un coussin de sécurité adapté aux règles de tes comptes.", bullets: ["Suivi des retraits", "Projection du prochain payout", "Vue consolidée multi-comptes"], color: "#FFB855" },
  ];
  useEffect(() => {
    const h = (e) => { setMx((e.clientX / window.innerWidth - 0.5) * 18); setMy((e.clientY / window.innerHeight - 0.5) * 18); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const menuButton = mobileMenuButtonRef.current;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => mobileMenuFirstLinkRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = mobileMenuPanelRef.current?.querySelectorAll("a[href], button:not([disabled])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="bg-[#050505] text-white overflow-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-5 lg:px-10 py-2 lg:py-4 bg-[#050505]/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex min-w-0 items-center justify-between gap-1.5 sm:gap-3">
          <Logo size="lg" className="!h-8 !w-[124px] min-[360px]:!w-[136px] lg:!h-11 lg:!w-[196px]" />
          <div className="hidden lg:flex items-center gap-9 text-sm text-[#B5BBC9]">
            <a href="#features" className="hover:text-white transition">Fonctionnalités</a>
            <a href="#how" className="hover:text-white transition">Fonctionnement</a>
            <Link to="/pricing" className="hover:text-white transition">Tarifs</Link>
            <a href="#reviews" className="hover:text-white transition">Bêta</a>
            <Link to="/faq" className="hover:text-white transition">FAQ</Link>
            <Link to="/contact" className="hover:text-white transition">Contact</Link>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-3">
            <div className="hidden lg:block"><LanguageSwitcher compact /></div>
            <Link to="/login" className="hidden lg:inline-flex text-sm px-4 py-2 text-[#9CA3AF] hover:text-white" data-testid="nav-login">Connexion</Link>
            <Link to="/register" className="btn-primary hidden h-11 min-[360px]:inline-flex lg:hidden items-center whitespace-nowrap !rounded-xl !px-3 text-[11px] sm:!px-4 sm:text-xs" data-testid="nav-register-mobile">Accès gratuit</Link>
            <Link to="/register" className="btn-primary hidden lg:inline-flex text-sm px-5" data-testid="nav-register">Accès gratuit</Link>
            <button
              ref={mobileMenuButtonRef}
              type="button"
              data-testid="mobile-menu-button"
              aria-label={mobileMenuOpen ? (language === "fr" ? "Fermer le menu" : "Close menu") : (language === "fr" ? "Ouvrir le menu" : "Open menu")}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white transition hover:border-[#7C4DFF]/50 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/70 lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && <div className="fixed inset-0 top-[61px] z-40 lg:hidden">
        <button type="button" aria-label={language === "fr" ? "Fermer le menu" : "Close menu"} onClick={closeMobileMenu} className="absolute inset-0 h-full w-full bg-black/75 backdrop-blur-sm" />
        <div id="landing-mobile-menu" ref={mobileMenuPanelRef} role="dialog" aria-modal="true" aria-label={language === "fr" ? "Navigation mobile" : "Mobile navigation"} className="relative mx-3 mt-3 max-h-[calc(100dvh-85px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0A0B12]/95 p-3 shadow-2xl sm:mx-5 sm:ml-auto sm:max-w-sm">
          <nav className="flex flex-col gap-1 text-sm">
            <Link ref={mobileMenuFirstLinkRef} to="/register" onClick={closeMobileMenu} className="btn-primary mb-2 inline-flex h-12 items-center justify-center whitespace-nowrap !rounded-xl !px-4">Accès gratuit</Link>
            <a href="#features" onClick={closeMobileMenu} className="rounded-xl px-4 py-3 text-[#D4D7DF] transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">Fonctionnalités</a>
            <a href="#how" onClick={closeMobileMenu} className="rounded-xl px-4 py-3 text-[#D4D7DF] transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">Fonctionnement</a>
            <Link to="/pricing" onClick={closeMobileMenu} className="rounded-xl px-4 py-3 text-[#D4D7DF] transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">Tarifs</Link>
            <Link to="/faq" onClick={closeMobileMenu} className="rounded-xl px-4 py-3 text-[#D4D7DF] transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">FAQ</Link>
            <Link to="/contact" onClick={closeMobileMenu} className="rounded-xl px-4 py-3 text-[#D4D7DF] transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">Contact</Link>
            <Link to="/login" onClick={closeMobileMenu} className="rounded-xl px-4 py-3 text-[#D4D7DF] transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF]/60">Connexion</Link>
            <div className="mt-2 flex items-center justify-between border-t border-white/10 px-4 pt-3"><span className="text-xs text-[#8E96A7]">{language === "fr" ? "Langue" : "Language"}</span><LanguageSwitcher /></div>
          </nav>
        </div>
      </div>}

      {/* HERO */}
      <section data-testid="landing-hero" className="relative px-4 pb-10 pt-[82px] min-[390px]:pt-[86px] sm:px-6 md:pb-20 md:pt-32 lg:flex lg:min-h-screen lg:items-center lg:px-8 lg:pb-10 lg:pt-[104px] xl:px-10 xl:pb-12 xl:pt-[110px]">
        {/* background atmospherics */}
        <div className="absolute inset-0 grid-floor opacity-60 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-[700px] h-[700px] rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle, #7C4DFF, transparent 70%)", transform: `translate(${mx}px, ${my}px)` }} />
          <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle, #4F8CFF, transparent 70%)", transform: `translate(${-mx}px, ${-my}px)` }} />
          <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] rounded-full blur-3xl opacity-15" style={{ background: "radial-gradient(circle, #FF4FD8, transparent 70%)" }} />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-[1500px] items-center gap-7 md:gap-14 lg:grid-cols-12 lg:gap-8 xl:gap-12">
          {/* LEFT */}
          <motion.div initial="hidden" animate="show" variants={fade} className="lg:col-span-5 space-y-4 min-[390px]:space-y-5 md:space-y-7 text-center lg:text-left">
            <motion.div custom={0} variants={fade} data-testid="hero-beta-badge" className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[.1em] text-[#B5BBC9] glass min-[360px]:gap-2 min-[360px]:px-3 min-[360px]:text-[9px] md:text-[11px] md:tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] pulse-glow shrink-0" /><span className="md:hidden">Bêta gratuite · Sans carte bancaire</span><span className="hidden md:inline">Bêta publique · Accès gratuit sans carte bancaire</span>
            </motion.div>
            <motion.h1 custom={1} variants={fade} data-testid="hero-title" className="mx-auto max-w-[720px] break-normal text-[40px] font-bold leading-[1.04] tracking-[-0.035em] min-[430px]:text-[44px] sm:text-[46px] md:text-6xl md:leading-[1.02] lg:mx-0 lg:text-7xl lg:tracking-tight">
              <span className="block text-gradient">Protège tes comptes financés.</span>
              <span className="mt-1 block text-purple-grad md:mt-0">Transforme tes trades en progrès.</span>
            </motion.h1>
            <motion.p custom={2} variants={fade} data-testid="hero-copy" className="mx-auto max-w-[390px] text-[15px] leading-relaxed text-[#AAB0BE] md:max-w-md md:text-lg md:text-[#9CA3AF] lg:mx-0">
              <span className="md:hidden">Analyse tes performances, renforce ta discipline et protège tes comptes financés.</span><span className="hidden md:inline">PipsEvo révèle ce qui renforce ta performance, ce qui fragilise ta discipline et ce qui te rapproche réellement d'un payout.</span>
            </motion.p>
            <motion.div custom={3} variants={fade} className="flex flex-col items-center justify-center gap-3 md:flex-row lg:justify-start">
              <div className="w-full md:w-auto"><Link to="/register" className="btn-primary inline-flex h-[54px] w-full items-center justify-center gap-2 !rounded-[14px] !px-5 text-[15px] md:h-auto md:w-auto md:!px-[26px] md:text-base" data-testid="hero-cta-start">Commencer gratuitement <ArrowRight className="w-4 h-4"/></Link><p className="mt-2 text-center text-[10px] text-[#777F90] md:hidden">Aucune carte bancaire requise pendant la bêta.</p></div>
              <a href="#story" className="btn-ghost inline-flex h-[54px] w-full items-center justify-center gap-2 !px-5 text-[15px] md:h-auto md:w-auto md:!px-[26px] md:text-base" data-testid="hero-cta-demo"><Play className="w-4 h-4 fill-white"/> Découvrir PipsEvo</a>
            </motion.div>
            <motion.div custom={4} variants={fade} className="pt-1 md:pt-6">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[.16em] text-[#777F90] md:mb-3 md:text-[11px] md:tracking-widest md:text-[#6B7280]">Comptes de prop firms compatibles</div>
              <div data-testid="mobile-prop-logos" className="mx-auto grid max-w-[360px] grid-cols-2 items-center justify-items-center gap-x-4 gap-y-4 min-[390px]:grid-cols-3 md:hidden">
                {propFirmLogos.map((firm) => (
                  <img key={`mobile-${firm.name}`} src={firm.src} alt={firm.alt} loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-[25px] w-auto max-w-[120px] object-contain grayscale brightness-125 opacity-65 transition-opacity duration-200 hover:opacity-100 min-[390px]:h-[27px] min-[390px]:max-w-[112px]" />
                ))}
              </div>
              <div className="hidden flex-wrap items-center justify-center gap-x-7 gap-y-5 min-h-7 md:flex lg:justify-start">
                {propFirmLogos.map((firm) => (
                  <img
                    key={firm.name}
                    src={firm.src}
                    alt={firm.alt}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    className="h-6 w-auto max-w-[118px] object-contain grayscale brightness-125 opacity-55 transition-opacity duration-200 hover:opacity-100"
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT — Tilted 3D dashboard mockup with floating candles (desktop/tablet only — too dense to stay legible on phones) */}
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.22,1,0.36,1] }} className="relative hidden lg:col-span-7 lg:block">
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

          {/* Même produit sur petits écrans, recadré sur le contenu principal sans sidebar. */}
          <div className="mx-auto mt-3 w-full max-w-[760px] lg:hidden"><ProductDashboardPreview variant="mobile" /></div>
        </div>
      </section>

      {/* 4 STEPS */}
      <section id="how" className="px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-28">
        <div className="max-w-[1500px] min-h-[390px] mx-auto relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(145deg,rgba(12,15,27,.98),rgba(6,7,13,.98))] p-6 sm:p-10 lg:p-14 xl:p-16 shadow-[0_40px_100px_rgba(0,0,0,.58),0_0_70px_rgba(124,77,255,.08),inset_0_1px_0_rgba(255,255,255,.05)]">
          <div className="pointer-events-none absolute -left-40 top-1/2 h-[360px] w-[360px] -translate-y-1/2 rounded-full bg-[#7C4DFF]/10 blur-[110px]"/>
          <div className="pointer-events-none absolute -right-24 -top-32 h-[360px] w-[360px] rounded-full bg-[#4F8CFF]/10 blur-[120px]"/>
          <div className="pointer-events-none absolute inset-x-[8%] bottom-4 h-16 rounded-[50%] bg-black/80 blur-2xl"/>
          <div className="relative grid lg:grid-cols-[230px_1fr] xl:grid-cols-[270px_1fr] gap-9 lg:gap-10 xl:gap-14 items-center">
            <div className="text-center lg:text-left">
              <div className="text-[10px] font-mono uppercase tracking-[.28em] text-[#B58BFF]">PARCOURS PIPSEVO</div>
              <div className="text-3xl sm:text-4xl lg:text-[42px] font-bold leading-[1.08] text-gradient mt-4">Commence<br className="hidden lg:block"/> en 4 étapes simples</div>
              <p className="mt-5 text-sm leading-relaxed text-[#7E8798] max-w-xs mx-auto lg:mx-0">De la création du compte à l’analyse de tes habitudes, ton suivi reste clair et progressif.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-4 xl:gap-6 relative" style={{perspective:"1400px"}}>
              <div className="hidden lg:block pointer-events-none absolute left-[4%] right-[4%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#7C4DFF]/45 to-transparent shadow-[0_0_18px_rgba(124,77,255,.45)]"/>
              {[
                { n: 1, t: "Crée ton compte", d: "Inscription gratuite en quelques secondes.", I: User },
                { n: 2, t: "Ajoute tes comptes", d: "Renseigne manuellement tes comptes financés.", I: Building2 },
                { n: 3, t: "Journalise tes trades", d: "Saisis le résultat, le contexte et le respect du plan.", I: TrendingUp },
                { n: 4, t: "Analyse ton processus", d: "Identifie tes forces, tes risques et tes habitudes.", I: Trophy },
              ].map((s, i) => (
                <motion.div key={s.n} initial={{ opacity: 0, y: 34, rotateY: i < 2 ? -4 : 4 }} whileInView={{ opacity: 1, y: i % 2 === 0 ? -6 : 6, rotateY: 0 }} whileHover={{ y: -14, scale: 1.045, rotateX: 2, rotateY: i < 2 ? 2 : -2 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.55, ease:[.22,1,.36,1] }} className="relative z-10 min-h-[245px] rounded-[22px] border border-white/[0.09] bg-[linear-gradient(150deg,rgba(17,20,38,.98),rgba(9,11,22,.98))] p-6 text-center shadow-[0_24px_45px_rgba(0,0,0,.42),0_8px_24px_rgba(124,77,255,.08),inset_0_1px_0_rgba(255,255,255,.05)] transition-[border-color,box-shadow] duration-300 hover:border-[#7C4DFF]/45 hover:shadow-[0_34px_65px_rgba(0,0,0,.58),0_12px_40px_rgba(124,77,255,.2),inset_0_1px_0_rgba(255,255,255,.09)]" style={{transformStyle:"preserve-3d"}}>
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"/>
                  <div className="w-10 h-10 mx-auto rounded-full border border-[#7C4DFF]/60 flex items-center justify-center text-[#C8AEFF] font-bold text-sm bg-[#7C4DFF]/15 shadow-[0_0_24px_rgba(124,77,255,.2)]" style={{transform:"translateZ(24px)"}}>{s.n}</div>
                    <div className="mt-5 mb-4 mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border border-white/[0.06] shadow-[0_14px_30px_rgba(0,0,0,.28)]" style={{ background: s.n === 3 ? "linear-gradient(135deg,#00E67624,#00E6760D)" : "linear-gradient(135deg,#7C4DFF28,#4F8CFF0D)", transform:"translateZ(34px)" }}>
                      <s.I className="w-7 h-7" style={{ color: s.n === 3 ? "#00E676" : "#B58BFF", filter:`drop-shadow(0 0 10px ${s.n === 3 ? "#00E67655" : "#7C4DFF66"})` }} />
                    </div>
                    <div className="font-semibold text-[15px]" style={{transform:"translateZ(20px)"}}>{s.t}</div>
                    <div className="text-xs text-[#9CA3AF] mt-2 leading-relaxed" style={{transform:"translateZ(14px)"}}>{s.d}</div>
                  {i < 3 && (
                    <div className="hidden lg:block absolute z-20 top-1/2 -right-4 xl:-right-5 w-8 xl:w-10 -translate-y-1/2">
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
            { I: LayersIcon, t: "Multi-comptes", d: "Centralise tes comptes financés dans une seule vue.", c: "purple" },
            { I: JournalIcon, t: "Journal structuré", d: "Documente le résultat, le contexte, les notes et les émotions.", c: "blue" },
            { I: DisciplineIcon, t: "Moteur de discipline", d: "Mesure le respect de tes règles et de ton plan.", c: "green" },
            { I: AICoachIcon, t: "Coach Atlas", d: "Interroge tes propres données sans recevoir de signaux.", c: "purple" },
            { I: PayoutIcon, t: "Suivi des payouts", d: "Enregistre tes retraits et simule tes prochains objectifs.", c: "pink" },
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
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#B58BFF] mb-3 px-3 py-1 rounded-full inline-block border border-[#7C4DFF]/40">ACTIFS COMPATIBLES</div>
              <div className="text-3xl sm:text-4xl font-bold leading-tight">Journalise <span className="text-purple-grad">tout.</span><br/>Analyse <span className="text-purple-grad">mieux.</span></div>
            </div>
            <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { l: "Forex", I: ForexIcon },
                { l: "Crypto", I: CryptoIcon },
                { l: "Actions", I: StocksIcon },
                { l: "Indices", I: IndicesIcon },
                { l: "Matières premières", I: CommoditiesIcon },
                { l: "Futures", I: FuturesIcon },
              ].map((a, i) => (
                <motion.div key={a.l} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="card-flat p-4 text-center hover:border-[#7C4DFF]/40 transition-all">
                  <div className="mb-2 flex justify-center"><a.I /></div>
                  <div className="text-xs font-medium mt-2">{a.l}</div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="text-center text-xs text-[#6B7280] mt-8">Et d’autres instruments saisis manuellement.</div>
        </div>
      </section>

      {/* ALL-IN-ONE */}
      <section className="px-5 sm:px-6 lg:px-10 pb-14 sm:pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto card-elev p-6 sm:p-10 lg:p-14 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative overflow-hidden">
          <div className="relative z-10 text-center lg:text-left">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#B58BFF] mb-3">TOUT AU MÊME ENDROIT</div>
            <div className="text-3xl sm:text-4xl font-bold leading-tight">Clair. Structuré.<br/>Conçu pour les <span className="text-purple-grad">traders financés.</span></div>
            <div className="mt-7 sm:mt-8 space-y-3 text-left max-w-sm mx-auto lg:mx-0">
              {["Suivi de plusieurs comptes", "Journal avec notes et contexte", "Score de discipline calculé", "Analyse comportementale par Atlas", "Suivi des payouts et objectifs"].map(x => (
                <div key={x} className="flex items-center gap-3"><Check className="w-4 h-4 text-[#00E676] shrink-0"/> <span className="text-sm text-[#B5BBC9]">{x}</span></div>
              ))}
            </div>
            <Link to="/register" className="btn-ghost inline-flex items-center gap-2 mt-8" data-testid="cta-features">Découvrir les fonctionnalités <ArrowRight className="w-4 h-4"/></Link>
          </div>
          {/* Même source produit que le hero, sans recréer une seconde interface. */}
          <div className="hidden lg:block relative">
            <ProductDashboardPreview variant="compact" />
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
              <ProductDashboardPreview activeSection={stories[activeStory].section} accent={stories[activeStory].color} className="relative w-full max-w-[640px]"/>
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
          <StoryChapter section="overview" side="left" eyebrow="TABLEAU DE BORD" title="Vois le risque avant qu'il ne devienne une violation." text="Tous tes comptes, leur capital, leur drawdown restant et leur progression réunis dans une seule vue. Tu sais où ralentir et où ton processus reste solide." bullets={["Vue consolidée multi-comptes","Santé et survie de chaque compte","Progression vers les objectifs"]} color="#00E676" />
          <StoryChapter section="journal" side="right" eyebrow="JOURNAL DE TRADING" title="Le résultat dit combien. Le journal explique pourquoi." text="Un trade gagnant peut être une mauvaise décision. Un trade perdant peut respecter parfaitement ton plan. PipsEvo t'aide à séparer le processus du résultat." bullets={["Notes et contexte par trade","Comparaison par setup et session","Respect du plan mesuré"]} color="#B58BFF" />
          <StoryChapter section="coach" side="left" eyebrow="COACH COMPORTEMENTAL" title="Ne demande plus seulement “combien j'ai gagné ?” Demande “qu'est-ce qui se répète ?”" text="Interroge tes propres données pour identifier les écarts les plus coûteux et définir une action concrète pour ta prochaine session." bullets={["Questions basées sur ton historique","Analyse sans signaux de marché","Actions orientées discipline"]} color="#FF4FD8" />
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

      {/* BÊTA — transparence plutôt que faux témoignages */}
      <section id="reviews" className="px-5 sm:px-6 lg:px-10 pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto rounded-[28px] border border-[#7C4DFF]/25 bg-gradient-to-br from-[#7C4DFF]/10 via-[#0B0E18] to-[#4F8CFF]/5 p-6 sm:p-10 lg:p-12">
          <div className="text-center max-w-3xl mx-auto"><div className="text-[11px] font-mono uppercase tracking-[.22em] text-[#B58BFF]">BÊTA PUBLIQUE</div><h2 className="text-3xl sm:text-5xl font-bold mt-4">Construisons un outil utile,<br/><span className="text-purple-grad">sans promesses artificielles.</span></h2><p className="text-[#9CA3AF] mt-4 leading-relaxed">PipsEvo est encore en bêta. Les fonctions disponibles sont clairement indiquées, l’accès est gratuit et les retours des premiers utilisateurs servent à définir les prochaines priorités.</p></div>
          <div className="grid md:grid-cols-3 gap-4 mt-8">{[
            ["Données réelles","Les chiffres de l’application proviennent uniquement des comptes et trades que tu ajoutes."],
            ["Aucun signal","Atlas analyse ton processus et ta discipline, jamais le prochain mouvement du marché."],
            ["Roadmap transparente","La saisie manuelle est disponible. Les imports et connexions directes restent en développement."],
          ].map(([title,text])=><div key={title} className="rounded-2xl border border-white/[0.07] bg-black/20 p-5"><Check className="w-5 h-5 text-[#00E676]"/><h3 className="font-semibold mt-4">{title}</h3><p className="text-sm text-[#8B93A3] mt-2 leading-relaxed">{text}</p></div>)}</div>
          <div className="text-center mt-8"><Link to="/contact" className="btn-ghost inline-flex items-center gap-2">Partager une suggestion <ArrowRight className="w-4 h-4"/></Link></div>
        </div>
      </section>

      {/* TARIFS */}
      <section id="pricing" className="px-5 sm:px-6 lg:px-10 pb-14 sm:pb-16 lg:pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#B58BFF] mb-3">TARIFS</div>
            <h2 className="text-4xl font-bold text-gradient">Gratuit pendant la bêta. Plus puissant au lancement.</h2>
            <p className="text-[#9CA3AF] mt-3">Commence avec les outils essentiels. Les fonctionnalités avancées, l’automatisation et l’IA arriveront progressivement avec PipsEvo Pro.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card-elev p-6 sm:p-8 glow-purple border-[#7C4DFF]/40">
              <div className="text-sm font-mono uppercase text-[#B58BFF]">Accès bêta</div>
              <div className="text-4xl sm:text-5xl font-bold mt-4 font-mono">0 €</div>
              <div className="text-sm text-[#9CA3AF] mt-2">Dashboard, journal manuel, statistiques essentielles et discipline.</div>
              <div className="mt-8 space-y-3 text-sm">
                {["Gestion limitée des comptes", "Journal et ajout manuel de trades", "PnL, win rate et risk/reward", "Sessions, setups, émotions et payouts manuels"].map(x => <div key={x} className="flex gap-2 text-[#B5BBC9]"><Check className="w-4 h-4 text-[#00E676] shrink-0"/> {x}</div>)}
              </div>
              <Link to="/register" className="btn-primary block text-center mt-8">Rejoindre la bêta</Link>
            </div>
            <div className="card-elev p-6 sm:p-8 relative opacity-80" data-testid="pricing-pro">
              <div className="absolute -top-3 right-6 text-[10px] font-mono uppercase tracking-widest border border-white/10 bg-[#111322] rounded-full px-3 py-1 text-[#9CA3AF]">APRÈS LA BÊTA</div>
              <div className="text-sm font-mono uppercase text-[#9CA3AF]">Tarifs prévus au lancement</div>
              <div className="mt-4 text-2xl font-bold font-numeric">Essential · {formatBillingPrice(PLANS.essential.price)}<span className="text-sm text-[#9CA3AF]">/mois</span></div>
              <div className="mt-3 text-2xl font-bold font-numeric text-[#C8AEFF]">Pro · {formatBillingPrice(PLANS.pro.price)}<span className="text-sm text-[#9CA3AF]">/mois</span></div>
              <div className="text-sm text-[#9CA3AF] mt-3">Les utilisateurs bêta bénéficieront d’une offre de lancement exclusive.</div>
              <div className="mt-8 space-y-3 text-sm">
                {["Essential : jusqu’à 2 comptes", "Pro : plusieurs comptes", "Imports, analyses et rapports avancés", "Coach IA et automatisations premium"].map(x => <div key={x} className="flex gap-2 text-[#B5BBC9]"><Check className="w-4 h-4 text-[#6B7280] shrink-0"/> {x}</div>)}
              </div>
              <Link to="/pricing" className="btn-ghost block w-full text-center mt-8" data-testid="pricing-pro-cta">Comparer les plans</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-5 sm:px-6 lg:px-10 pb-14 sm:pb-16 lg:pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#B58BFF] mb-3">FAQ</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gradient">Questions fréquentes.</h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "PipsEvo se connecte-t-il automatiquement à mon broker ?", a: "Pas encore. La saisie manuelle est disponible. L’import CSV et les connexions directes sont indiqués comme étant en préparation sur la page Plateformes." },
              { q: "PipsEvo fournit-il des signaux ?", a: "Non. PipsEvo analyse uniquement tes données, ta discipline et ton processus. Il ne prédit pas le marché et ne recommande aucune entrée." },
              { q: "Quelles prop firms sont compatibles ?", a: "Tu peux suivre des comptes Topstep, Apex, FTMO, FundedNext, The5ers et Take Profit Trader. Leur présence n’implique aucun partenariat officiel." },
              { q: "Dois-je renseigner une carte bancaire ?", a: "Non. L’accès est gratuit pendant la bêta. Tu seras informé avant l’activation éventuelle d’une offre payante." },
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
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gradient">Prêt à mieux comprendre tes décisions<br className="hidden sm:block"/> et protéger tes comptes ?</div>
            </div>
          </div>
          <Link to="/register" className="btn-primary inline-flex items-center gap-2 relative z-10 w-full sm:w-auto justify-center" data-testid="footer-cta">Créer mon espace gratuit <ArrowRight className="w-4 h-4"/></Link>
        </div>
        <div className="max-w-7xl mx-auto text-center text-xs text-[#6B7280] mt-6">Aucune carte bancaire · Configuration en quelques minutes</div>
      </section>

      <footer className="border-t border-white/5 py-8 sm:py-10 px-5 sm:px-6 lg:px-10 text-sm text-[#9CA3AF]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 text-center sm:text-left">
          <Logo />
          <div className="flex flex-wrap justify-center gap-4"><Link to="/help">Aide</Link><Link to="/contact">Contact</Link><Link to="/platforms">Plateformes</Link><Link to="/blog">Guides</Link><Link to="/faq">FAQ</Link><Link to="/affiliate">Partenaires</Link><Link to="/privacy">Confidentialité</Link><Link to="/terms">Conditions</Link><button type="button" onClick={openCookieSettings} className="hover:text-white">Cookies</button></div>
          <div>© 2026 PipsEvo · Journal et discipline pour traders financés.</div>
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

const StoryChapter = ({ section, side, eyebrow, title, text, bullets, color }) => (
  <motion.div initial={{opacity:0,y:35}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.2}} transition={{duration:.7}} className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
    <div className={side === "right" ? "lg:order-2" : ""}>
      <div className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{color}}>{eyebrow}</div>
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mt-4">{title}</h2>
      <p className="text-[#9CA3AF] leading-relaxed mt-5">{text}</p>
      <div className="space-y-3 mt-7">{bullets.map(x=><div key={x} className="flex items-center gap-3 text-sm text-[#B5BBC9]"><Check className="w-4 h-4" style={{color}}/>{x}</div>)}</div>
    </div>
    <div className={`relative ${side === "right" ? "lg:order-1" : ""}`}>
      <div className="absolute -inset-10 blur-3xl opacity-20 rounded-full" style={{background:color}}/>
      <ProductDashboardPreview activeSection={section} accent={color}/>
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
