import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  CircleDollarSign,
  Database,
  FileText,
  Gauge,
  Layers3,
  LockKeyhole,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  WalletCards,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import PublicHeader from "@/components/PublicHeader";
import ProductDashboardPreview from "@/components/ProductDashboardPreview";
import { openCookieSettings } from "@/components/CookieConsent";
import { useI18n } from "@/context/I18nContext";

gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

const productTabs = [
  { id: "overview", fr: "Vue d’ensemble", en: "Overview", icon: Layers3 },
  { id: "journal", fr: "Journal", en: "Journal", icon: BookOpen },
  { id: "discipline", fr: "Discipline", en: "Discipline", icon: Shield },
  { id: "backtest", fr: "Backtest", en: "Backtest", icon: BarChart3 },
  { id: "coach", fr: "Atlas IA", en: "Atlas AI", icon: Brain },
  { id: "payouts", fr: "Payouts", en: "Payouts", icon: CircleDollarSign },
];

const propFirmLogos = [
  { name: "Topstep", src: "/brand/prop-firms/topstep.webp", className: "h-[18px] sm:h-[21px]" },
  { name: "Apex Trader Funding", src: "/brand/prop-firms/apex.svg", className: "h-[24px] sm:h-[28px]" },
  { name: "FTMO", src: "/brand/prop-firms/ftmo.svg", className: "h-[18px] sm:h-[21px]" },
  { name: "FundedNext", src: "/brand/prop-firms/fundednext.png", className: "h-[19px] sm:h-[22px]" },
  { name: "The5ers", src: "/brand/prop-firms/the5ers.svg", className: "h-[20px] sm:h-[24px]" },
];

const systemFlowPaths = [
  "M450 276 L150 84",
  "M450 276 L450 84",
  "M450 276 L750 84",
  "M450 276 L150 276",
  "M450 276 L750 276",
  "M450 276 L150 468",
  "M450 276 L450 468",
  "M450 276 L750 468",
];

const faqs = [
  {
    fr: "À qui s’adresse PipsEvo ?",
    en: "Who is PipsEvo for?",
    answerFr: "Aux traders qui veulent structurer leur journal, suivre plusieurs comptes financés et prendre de meilleures décisions à partir de leurs propres données.",
    answerEn: "For traders who want to structure their journal, track funded accounts, and make better decisions from their own data.",
  },
  {
    fr: "La bêta est-elle vraiment gratuite ?",
    en: "Is the beta really free?",
    answerFr: "Oui. L’accès bêta est gratuit, sans carte bancaire et sans prélèvement automatique.",
    answerEn: "Yes. Beta access is free, with no credit card and no automatic charge.",
  },
  {
    fr: "Puis-je ajouter mes trades manuellement ?",
    en: "Can I add trades manually?",
    answerFr: "Oui. La saisie manuelle est disponible et permet d’ajouter le compte, le résultat, le setup, la session, les notes et le respect du plan.",
    answerEn: "Yes. Manual entry is available for the account, result, setup, session, notes, and plan compliance.",
  },
  {
    fr: "L’import CSV est-il disponible ?",
    en: "Is CSV import available?",
    answerFr: "Oui, en bêta, avec prévisualisation, validation, détection des doublons et possibilité d’annuler un lot importé.",
    answerEn: "Yes, in beta, with preview, validation, duplicate detection, and imported-batch rollback.",
  },
  {
    fr: "La synchronisation automatique est-elle active ?",
    en: "Is automatic synchronization active?",
    answerFr: "Pas encore. Les connexions MetaTrader 5, cTrader, Tradovate et NinjaTrader restent annoncées comme à venir tant qu’un accès officiel et des tests fiables ne sont pas validés.",
    answerEn: "Not yet. MetaTrader 5, cTrader, Tradovate, and NinjaTrader connections remain upcoming until official access and reliable testing are validated.",
  },
  {
    fr: "Atlas IA donne-t-il des signaux ?",
    en: "Does Atlas AI provide signals?",
    answerFr: "Non. Atlas analyse tes données de journal pour t’aider à comprendre tes habitudes. Il ne prédit pas le marché et ne fournit aucun conseil d’investissement.",
    answerEn: "No. Atlas analyzes your journal data to help you understand your habits. It does not predict markets or provide investment advice.",
  },
  {
    fr: "Quelles prop firms puis-je suivre ?",
    en: "Which prop firms can I track?",
    answerFr: "La saisie guidée couvre notamment Topstep, Apex, FTMO, FundedNext et The5ers. Cela indique une compatibilité de suivi, pas un partenariat officiel.",
    answerEn: "Guided entry covers Topstep, Apex, FTMO, FundedNext, and The5ers. This means tracking compatibility, not an official partnership.",
  },
  {
    fr: "Mes données restent-elles privées ?",
    en: "Does my data remain private?",
    answerFr: "Ton espace est lié à ta session et tu peux exporter tes données personnelles. PipsEvo n’affiche pas publiquement tes performances.",
    answerEn: "Your workspace is tied to your session and you can export your personal data. PipsEvo does not publicly display your performance.",
  },
];

function Reveal({ children, className = "", delay = 0 }) {
  return <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.18 }} transition={{ duration: 0.62, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>;
}

function Eyebrow({ children }) {
  return <div className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.24em] text-[#9C86FF]"><span className="h-px w-7 bg-[#7657FF]" />{children}</div>;
}

function SectionTitle({ eyebrow, title, copy, center = false }) {
  return <div className={`${center ? "mx-auto max-w-3xl text-center" : "max-w-xl"}`}>
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2 className="text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#F3F4F6] sm:text-4xl lg:text-[50px]">{title}</h2>
    {copy && <p className={`mt-5 max-w-2xl text-[15px] leading-7 text-[#969EAE] sm:text-base ${center ? "mx-auto" : ""}`}>{copy}</p>}
  </div>;
}

function CheckLine({ children }) {
  return <div className="flex items-start gap-3 text-sm leading-6 text-[#BEC3CD]"><span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#7C4DFF]/15 text-[#A991FF]"><Check className="h-3 w-3" /></span><span>{children}</span></div>;
}

function SystemNode({ icon: Icon, label, copy, index }) {
  return <article
    data-system-node
    data-system-index={index}
    className="group relative z-10 flex min-h-[154px] flex-col justify-between overflow-hidden rounded-[18px] border border-white/[0.075] bg-[#090B11]/95 p-5 transition-colors duration-300 hover:border-[#7657FF]/45 hover:bg-[#0B0D16] sm:min-h-[168px] sm:p-6"
    style={{ transformStyle: "preserve-3d", willChange: "transform" }}
  >
    <span data-node-glow className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[#7657FF]/0 blur-[38px] transition-colors duration-300 group-hover:bg-[#7657FF]/[0.14]" />
    <span data-node-scan className="pointer-events-none absolute -left-1/2 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-[#A591FF]/70 to-transparent opacity-0" />
    <div data-node-content className="relative flex items-start justify-between" style={{ transform: "translateZ(18px)" }}>
      <span data-node-icon className="grid h-10 w-10 place-items-center rounded-xl border border-[#7657FF]/25 bg-[#7657FF]/[0.10] text-[#A58EFF] shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_0_0_rgba(118,87,255,0)]">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="font-mono text-[9px] tracking-[.16em] text-[#545C6B] transition-colors group-hover:text-[#A394DE]">0{index + 1}</span>
    </div>
    <div className="relative mt-7" style={{ transform: "translateZ(12px)" }}>
      <h3 className="text-[15px] font-semibold text-[#E5E7EC]">{label}</h3>
      <p className="mt-1.5 text-[11px] leading-[1.55] text-[#737B8B] transition-colors group-hover:text-[#A0A7B5]">{copy}</p>
      <div className="mt-4 flex h-1 items-center gap-1 opacity-45 transition-opacity group-hover:opacity-90">
        {[36, 58, 24].map((width, meterIndex) => <span key={width} className="h-px flex-1 overflow-hidden rounded-full bg-white/[0.06]"><span data-node-meter-line className="block h-full rounded-full bg-gradient-to-r from-[#7657FF] to-[#4F8CFF]" style={{ width: `${width + index * 3 + meterIndex * 2}%` }} /></span>)}
      </div>
    </div>
  </article>;
}

function SystemCore({ t }) {
  return <div
    data-system-core
    className="relative flex min-h-[190px] flex-col items-center justify-center overflow-hidden rounded-[22px] border border-[#7657FF]/35 bg-[#0C0D17] p-7 text-center shadow-[0_22px_70px_rgba(39,23,91,.26)] lg:min-h-0"
    style={{ transformStyle: "preserve-3d", willChange: "transform" }}
  >
    <div data-core-halo className="pointer-events-none absolute inset-[-25%] rounded-full bg-[radial-gradient(circle_at_center,rgba(105,72,255,.27),rgba(79,140,255,.09)_32%,transparent_66%)]" />
    <span data-core-beam className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[165%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[#8C73FF]/45 to-transparent" />
    <span data-core-beam className="pointer-events-none absolute left-1/2 top-1/2 h-[165%] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-[#4F8CFF]/35 to-transparent" />
    <div className="relative grid h-[86px] w-[86px] place-items-center">
      <span data-core-ring className="absolute inset-[-12px] rounded-full border border-dashed border-[#8C73FF]/20" />
      <span data-core-ring-reverse className="absolute inset-0 rounded-full border border-dashed border-[#8C73FF]/45" />
      <span data-core-ring className="absolute inset-[9px] rounded-full border border-[#4F8CFF]/25">
        <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#6E8CFF] shadow-[0_0_14px_rgba(78,140,255,.85)]" />
      </span>
      <span data-core-logo className="relative grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-[#090A10] shadow-[0_10px_30px_rgba(0,0,0,.35),0_0_28px_rgba(118,87,255,.18)]"><LogoMark size="lg" /></span>
    </div>
    <div className="relative mt-4 text-[10px] font-semibold uppercase tracking-[.2em] text-[#A995FF]">PipsEvo Core</div>
    <p className="relative mt-2 max-w-[230px] text-[11px] leading-5 text-[#7E8796]">{t("Toutes tes données convergent vers une seule lecture.", "All your data converges into one clear view.")}</p>
    <div className="relative mt-4 inline-flex items-center gap-2 text-[9px] uppercase tracking-[.14em] text-[#697282]"><span data-sync-dot className="h-1.5 w-1.5 rounded-full bg-[#17E6AF] shadow-[0_0_12px_rgba(23,230,175,.75)]" />{t("Flux synchronisé", "Synchronized flow")}</div>
  </div>;
}

function ProductFeature({ id, reverse, eyebrow, title, copy, bullets, section, accent = "#7C4DFF" }) {
  return <section id={id} className="scroll-mt-32 px-5 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-28">
    <div className={`mx-auto grid max-w-[1280px] items-center gap-11 lg:grid-cols-12 lg:gap-14 ${reverse ? "" : ""}`}>
      <Reveal className={`lg:col-span-5 ${reverse ? "lg:order-2" : ""}`}>
        <SectionTitle eyebrow={eyebrow} title={title} copy={copy} />
        <div className="mt-7 space-y-3">{bullets.map(bullet => <CheckLine key={bullet}>{bullet}</CheckLine>)}</div>
      </Reveal>
      <Reveal delay={0.08} className={`relative lg:col-span-7 ${reverse ? "lg:order-1" : ""}`}>
        <div className="pointer-events-none absolute inset-x-[12%] bottom-0 h-28 rounded-full blur-[70px]" style={{ backgroundColor: `${accent}18` }} />
        <div className="relative overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#090B12] p-2 shadow-[0_30px_80px_rgba(0,0,0,.45)] sm:p-3">
          <ProductDashboardPreview activeSection={section} accent={accent} className="w-full" />
        </div>
      </Reveal>
    </div>
  </section>;
}

export default function LandingV2() {
  const { language, setLanguage, t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [activeProduct, setActiveProduct] = useState("overview");
  const systemSectionRef = useRef(null);

  useEffect(() => {
    const section = systemSectionRef.current;
    if (!section) return undefined;

    const media = gsap.matchMedia();

    media.add(
      {
        desktop: "(min-width: 1024px)",
        mobile: "(max-width: 1023px)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      context => {
        const { desktop, reduceMotion: prefersReducedMotion } = context.conditions;
        const layout = section.querySelector(`[data-system-layout="${desktop ? "desktop" : "mobile"}"]`);
        const heading = section.querySelector("[data-system-heading]");
        const core = layout?.querySelector("[data-system-core]");
        const nodes = gsap.utils.toArray("[data-system-node]", layout);
        const icons = gsap.utils.toArray("[data-node-icon]", layout);
        const meterLines = gsap.utils.toArray("[data-node-meter-line]", layout);
        const scanLines = gsap.utils.toArray("[data-node-scan]", layout);
        const rings = gsap.utils.toArray("[data-core-ring]", layout);
        const reverseRings = gsap.utils.toArray("[data-core-ring-reverse]", layout);
        const coreBeams = gsap.utils.toArray("[data-core-beam]", layout);
        const halos = gsap.utils.toArray("[data-core-halo]", layout);
        const coreLogos = gsap.utils.toArray("[data-core-logo]", layout);
        const syncDots = gsap.utils.toArray("[data-sync-dot]", layout);
        const auroras = gsap.utils.toArray("[data-system-aurora]", section);
        const flowPaths = desktop ? gsap.utils.toArray("[data-flow-path]", layout) : [];
        const flowDots = desktop ? gsap.utils.toArray("[data-flow-dot]", layout) : [];
        const interactiveCleanups = [];

        if (!layout || !core) return undefined;

        if (prefersReducedMotion) {
          gsap.set([heading, core, ...nodes, ...meterLines], { clearProps: "all" });
          gsap.set(flowDots, { autoAlpha: 0 });
          return undefined;
        }

        gsap.set(heading, { autoAlpha: 0, y: 34 });
        gsap.set(core, { autoAlpha: 0, scale: 0.68, rotationX: -14, transformPerspective: 900 });
        gsap.set(nodes, { autoAlpha: 0, y: 54, scale: 0.88, rotationX: -12, transformPerspective: 900 });
        gsap.set(meterLines, { scaleX: 0, transformOrigin: "left center" });
        gsap.set(flowPaths, { strokeDasharray: "0 900", strokeDashoffset: 0, opacity: 0 });
        gsap.set(flowDots, { autoAlpha: 0, transformOrigin: "center" });

        const intro = gsap.timeline({
          defaults: { ease: "power4.out" },
          scrollTrigger: {
            trigger: section,
            start: "top 70%",
            once: true,
          },
        });

        intro
          .to(heading, { autoAlpha: 1, y: 0, duration: 0.9 })
          .to(core, { autoAlpha: 1, scale: 1, rotationX: 0, duration: 1.15, ease: "back.out(1.45)" }, "-=0.52")
          .to(flowPaths, { strokeDasharray: "12 18", opacity: 0.82, duration: 1.15, stagger: { each: 0.045, from: "center" } }, "-=0.82")
          .to(nodes, { autoAlpha: 1, y: 0, scale: 1, rotationX: 0, duration: 0.82, stagger: { amount: 0.68, from: "center" } }, "-=0.92")
          .to(meterLines, { scaleX: 1, duration: 0.72, ease: "expo.out", stagger: { amount: 0.42, from: "random" } }, "-=0.55");

        const ambientTweens = [
          gsap.to(rings, { rotation: 360, duration: 17, repeat: -1, ease: "none", stagger: 1.8, paused: true }),
          gsap.to(reverseRings, { rotation: -360, duration: 11, repeat: -1, ease: "none", paused: true }),
          gsap.to(coreBeams, { rotation: "+=180", duration: 13, repeat: -1, ease: "none", stagger: 0.8, paused: true }),
          gsap.to(halos, { scale: 1.18, autoAlpha: 0.72, duration: 2.4, repeat: -1, yoyo: true, ease: "sine.inOut", paused: true }),
          gsap.to(coreLogos, { scale: 1.08, boxShadow: "0 12px 34px rgba(0,0,0,.35), 0 0 34px rgba(118,87,255,.48)", duration: 1.6, repeat: -1, yoyo: true, ease: "sine.inOut", paused: true }),
          gsap.to(syncDots, { scale: 1.75, autoAlpha: 0.38, duration: 0.85, repeat: -1, yoyo: true, ease: "sine.inOut", paused: true }),
          gsap.to(icons, { y: -5, rotation: 2.5, duration: 1.9, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.22, from: "random" }, paused: true }),
          gsap.to(flowPaths, { strokeDashoffset: -120, duration: 3.2, repeat: -1, ease: "none", stagger: 0.07, paused: true }),
          gsap.to(auroras, { xPercent: (_, element) => Number(element.dataset.direction || 1) * 22, yPercent: (_, element) => Number(element.dataset.direction || 1) * -10, duration: 6.5, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 0.55, paused: true }),
        ];

        scanLines.forEach((scanLine, index) => {
          ambientTweens.push(gsap.fromTo(scanLine, { xPercent: -30, autoAlpha: 0 }, { xPercent: 330, autoAlpha: 0.7, duration: 2.15, repeat: -1, repeatDelay: 2.2 + index * 0.24, delay: index * 0.34, ease: "power1.inOut", paused: true }));
        });

        flowDots.forEach((dot, index) => {
          const path = flowPaths[index];
          if (!path) return;
          const travel = gsap.timeline({ repeat: -1, delay: index * 0.18, paused: true });
          travel
            .set(dot, { autoAlpha: 0, scale: 0.55 })
            .to(dot, { autoAlpha: 1, scale: 1.15, duration: 0.18, ease: "power2.out" })
            .to(dot, {
              duration: 2.15 + index * 0.11,
              ease: "none",
              motionPath: {
                path,
                align: path,
                alignOrigin: [0.5, 0.5],
                start: index % 2 ? 1 : 0,
                end: index % 2 ? 0 : 1,
              },
            }, "<")
            .to(dot, { autoAlpha: 0, scale: 0.35, duration: 0.2 }, "-=0.2");
          ambientTweens.push(travel);
        });

        const setActivity = active => ambientTweens.forEach(animation => active ? animation.play() : animation.pause());
        const activityTrigger = ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          onEnter: () => setActivity(true),
          onEnterBack: () => setActivity(true),
          onLeave: () => setActivity(false),
          onLeaveBack: () => setActivity(false),
        });

        if (desktop) {
          nodes.forEach(node => {
            const glow = node.querySelector("[data-node-glow]");
            const rotateXTo = gsap.quickTo(node, "rotationX", { duration: 0.36, ease: "power3.out" });
            const rotateYTo = gsap.quickTo(node, "rotationY", { duration: 0.36, ease: "power3.out" });

            const onMove = event => {
              const bounds = node.getBoundingClientRect();
              const px = (event.clientX - bounds.left) / bounds.width;
              const py = (event.clientY - bounds.top) / bounds.height;
              rotateYTo((px - 0.5) * 10);
              rotateXTo((0.5 - py) * 8);
              if (glow) gsap.to(glow, { x: px * 70, y: py * 52, duration: 0.45, ease: "power3.out", overwrite: "auto" });
            };
            const onEnter = () => gsap.to(node, { scale: 1.025, z: 26, duration: 0.34, ease: "power3.out", overwrite: "auto" });
            const onLeave = () => {
              rotateXTo(0);
              rotateYTo(0);
              gsap.to(node, { scale: 1, z: 0, duration: 0.42, ease: "power3.out", overwrite: "auto" });
            };

            node.addEventListener("pointermove", onMove);
            node.addEventListener("pointerenter", onEnter);
            node.addEventListener("pointerleave", onLeave);
            interactiveCleanups.push(() => {
              node.removeEventListener("pointermove", onMove);
              node.removeEventListener("pointerenter", onEnter);
              node.removeEventListener("pointerleave", onLeave);
            });
          });

          const moveAuroraX = gsap.quickTo(auroras, "x", { duration: 1.1, ease: "power3.out" });
          const moveAuroraY = gsap.quickTo(auroras, "y", { duration: 1.1, ease: "power3.out" });
          const onSectionMove = event => {
            const bounds = section.getBoundingClientRect();
            moveAuroraX(((event.clientX - bounds.left) / bounds.width - 0.5) * 38);
            moveAuroraY(((event.clientY - bounds.top) / bounds.height - 0.5) * 26);
          };
          section.addEventListener("pointermove", onSectionMove);
          interactiveCleanups.push(() => section.removeEventListener("pointermove", onSectionMove));
        }

        return () => {
          setActivity(false);
          activityTrigger.kill();
          interactiveCleanups.forEach(cleanup => cleanup());
        };
      },
    );

    return () => media.revert();
  }, []);

  const outcomes = [
    { icon: ShieldCheck, title: t("Protège ton capital", "Protect your capital"), copy: t("Visualise le drawdown restant et les règles critiques avant qu’une mauvaise session ne devienne une violation.", "See remaining drawdown and critical rules before a bad session becomes a violation.") },
    { icon: Database, title: t("Comprends tes décisions", "Understand your decisions"), copy: t("Relie résultats, setups, sessions, émotions et respect du plan dans un historique exploitable.", "Connect results, setups, sessions, emotions, and plan compliance in an actionable history.") },
    { icon: Target, title: t("Avance vers le payout", "Move toward your payout"), copy: t("Suis tes objectifs et tes retraits sans perdre de vue la marge de sécurité de chaque compte.", "Track goals and withdrawals without losing sight of each account’s safety margin.") },
  ];

  const systemTools = [
    { icon: BookOpen, label: t("Journal", "Journal"), copy: t("Décisions, contexte et notes", "Decisions, context, and notes") },
    { icon: WalletCards, label: t("Comptes", "Accounts"), copy: t("Capital, règles et objectifs", "Capital, rules, and targets") },
    { icon: BarChart3, label: t("Statistiques", "Statistics"), copy: t("Patterns et performance réelle", "Patterns and real performance") },
    { icon: Shield, label: t("Discipline", "Discipline"), copy: t("Écarts au plan et régularité", "Plan deviations and consistency") },
    { icon: Gauge, label: t("Risque", "Risk"), copy: t("Exposition et drawdown restant", "Exposure and remaining drawdown") },
    { icon: CircleDollarSign, label: t("Payouts", "Payouts"), copy: t("Progression et retraits", "Progress and withdrawals") },
    { icon: Brain, label: t("Atlas IA", "Atlas AI"), copy: t("Analyse de tes comportements", "Behavioral analysis") },
    { icon: Upload, label: t("Import & export", "Import & export"), copy: t("Données portables et contrôlées", "Portable, controlled data") },
  ];

  return <div data-i18n-managed className="min-h-screen overflow-hidden bg-[#050505] text-white selection:bg-[#7657FF]/40">
    <PublicHeader variant="landing" />
    <main id="main-content">
      <section className="relative px-5 pb-16 pt-[138px] sm:px-6 sm:pt-[154px] lg:flex lg:min-h-[100svh] lg:items-center lg:px-10 lg:pb-20 lg:pt-[142px]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-[16%] top-[8%] h-[620px] w-[620px] rounded-full bg-[#4630B8]/[0.11] blur-[120px]" />
          <div className="absolute left-[28%] top-[22%] h-[300px] w-[300px] rounded-full bg-[#1D64B9]/[0.06] blur-[100px]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        <div className="relative mx-auto grid w-full max-w-[1480px] items-center gap-12 lg:grid-cols-12 lg:gap-9 xl:gap-14">
          <Reveal className="text-center lg:col-span-5 lg:text-left">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.025] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-[#AEB4C1] lg:mx-0"><span className="h-1.5 w-1.5 rounded-full bg-[#17E6AF]" />{t("L’OS des traders financés", "The OS for funded traders")}</div>
            <h1 className="mx-auto max-w-[720px] text-balance text-[43px] font-semibold leading-[1.02] tracking-[-0.045em] text-[#F3F4F6] sm:text-[58px] lg:mx-0 lg:text-[64px] xl:text-[72px]">
              {t("Protège tes comptes financés.", "Protect your funded accounts.")}<span className="mt-2 block bg-gradient-to-r from-[#9B72FF] to-[#4F8CFF] bg-clip-text text-transparent">{t("Transforme chaque trade en progrès.", "Turn every trade into progress.")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[570px] text-[16px] leading-7 text-[#A1A8B6] sm:text-lg lg:mx-0">{t("Centralise tes comptes, ton journal, ta discipline, tes statistiques et tes payouts pour comprendre ce qui te rapproche — ou t’éloigne — de ton prochain retrait.", "Centralize accounts, journal, discipline, statistics, and payouts to understand what moves you closer to — or further from — your next withdrawal.")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link to="/register" className="btn-primary inline-flex h-[52px] items-center justify-center gap-2 !rounded-xl !px-6 text-[15px]">{t("Commencer gratuitement", "Start for free")}<ArrowRight className="h-4 w-4" /></Link>
              <a href="#product" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-6 text-[15px] font-semibold text-[#D8DBE2] transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white">{t("Voir le produit", "See the product")}</a>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#777F8F] lg:justify-start"><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#17E6AF]" />{t("Bêta gratuite", "Free beta")}</span><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#17E6AF]" />{t("Sans carte bancaire", "No credit card")}</span><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#17E6AF]" />{t("Accès immédiat", "Instant access")}</span></div>
          </Reveal>

          <Reveal delay={0.08} className="relative lg:col-span-7">
            <div className="pointer-events-none absolute inset-x-[8%] bottom-[2%] h-40 rounded-full bg-[#5A3DDA]/[0.13] blur-[80px]" />
            <div className="relative rounded-[24px] border border-white/[0.10] bg-[#080A10] p-2 shadow-[0_35px_100px_rgba(0,0,0,.58)] sm:p-3 lg:rotate-[0.4deg]">
              <div className="absolute -top-3 left-5 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0B0D15]/95 px-3 py-1 text-[9px] font-medium uppercase tracking-[.16em] text-[#8F96A5]"><span className="h-1.5 w-1.5 rounded-full bg-[#7657FF]" />{t("Aperçu avec données de démonstration", "Preview with demo data")}</div>
              <ProductDashboardPreview variant="hero" activeSection="overview" />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-white/[0.012] px-5 py-7 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-6 lg:flex-row">
          <div className="text-center lg:text-left"><div className="text-xs font-semibold text-[#D7DAE1]">{t("Suivi guidé des comptes financés", "Guided funded-account tracking")}</div><div className="mt-1 text-[11px] text-[#727A8A]">{t("Compatibilité de saisie — aucun partenariat officiel sous-entendu", "Entry compatibility — no official partnership implied")}</div></div>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-x-8 gap-y-5 sm:gap-x-10 lg:justify-end">
            {propFirmLogos.map(({ name, src, className }) => (
              <img
                key={name}
                src={src}
                alt={`Logo officiel ${name}`}
                title={name}
                decoding="async"
                className={`${className} w-auto max-w-[132px] object-contain opacity-55 grayscale transition duration-200 hover:opacity-90 hover:grayscale-0`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-6 sm:py-28 lg:px-10 lg:py-36">
        <div className="mx-auto max-w-[1280px]">
          <Reveal><SectionTitle center eyebrow={t("Pourquoi PipsEvo", "Why PipsEvo")} title={t("Le résultat ne raconte jamais toute l’histoire.", "The result never tells the whole story.")} copy={t("PipsEvo relie performance, processus et risque pour t’aider à corriger ce qui coûte réellement de l’argent.", "PipsEvo connects performance, process, and risk to help you fix what actually costs money.")} /></Reveal>
          <div className="mt-16 grid border-y border-white/[0.08] md:grid-cols-3">
            {outcomes.map(({ icon: Icon, title, copy }, index) => <Reveal key={title} delay={index * 0.07} className={`px-2 py-9 md:px-9 md:py-12 ${index ? "border-t border-white/[0.08] md:border-l md:border-t-0" : ""}`}><Icon className="h-5 w-5 text-[#8F72FF]" /><h3 className="mt-6 text-xl font-semibold tracking-tight text-[#EEF0F4]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#868E9E]">{copy}</p></Reveal>)}
          </div>
        </div>
      </section>

      <section id="product" className="scroll-mt-28 px-5 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-[1380px] rounded-[28px] border border-white/[0.08] bg-[#080A10] p-4 shadow-[0_40px_100px_rgba(0,0,0,.40)] sm:p-7 lg:p-10">
          <Reveal className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionTitle eyebrow={t("Un seul espace", "One workspace")} title={t("Tous tes outils. Une seule lecture de ta progression.", "All your tools. One view of your progress.")} copy={t("Navigue dans un aperçu cohérent du vrai produit — pas dans une série de dashboards inventés.", "Explore one coherent preview of the real product — not a series of invented dashboards.")} />
            <div className="flex max-w-full gap-2 overflow-x-auto pb-2 lg:max-w-[600px]">{productTabs.map(({ id, fr, en, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveProduct(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition ${activeProduct === id ? "border-[#7657FF]/55 bg-[#7657FF]/15 text-white" : "border-white/[0.07] bg-white/[0.015] text-[#858D9D] hover:border-white/15 hover:text-white"}`}><Icon className="h-3.5 w-3.5" />{t(fr, en)}</button>)}</div>
          </Reveal>
          <Reveal delay={0.08} className="relative mt-10"><div className="pointer-events-none absolute inset-x-[18%] bottom-0 h-32 rounded-full bg-[#6948FF]/10 blur-[80px]" /><div className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#05060A] p-2 sm:p-3"><ProductDashboardPreview activeSection={activeProduct} /></div></Reveal>
        </div>
      </section>

      <ProductFeature id="accounts" eyebrow={t("Comptes financés", "Funded accounts")} title={t("Garde chaque compte sous contrôle.", "Keep every account under control.")} copy={t("Solde, drawdown, objectifs et progression réunis dans une vue qui reste lisible, même avec plusieurs comptes.", "Balance, drawdown, goals, and progress in one view that stays readable, even with multiple accounts.")} bullets={[t("Vue consolidée de tes comptes", "Consolidated account view"), t("Marge de risque et objectifs visibles", "Visible risk margin and goals"), t("Filtres par compte et période", "Filters by account and period")]} section="overview" accent="#4F8CFF" />
      <ProductFeature id="journal" reverse eyebrow={t("Journal de trading", "Trading journal")} title={t("Le résultat dit combien. Ton journal explique pourquoi.", "The result says how much. Your journal explains why.")} copy={t("Chaque décision conserve son contexte : setup, session, émotion, notes, captures et respect du plan.", "Every decision keeps its context: setup, session, emotion, notes, screenshots, and plan compliance.")} bullets={[t("Saisie manuelle structurée", "Structured manual entry"), t("Import CSV sécurisé en bêta", "Secure CSV import in beta"), t("Tags, favoris et historique comparable", "Tags, favorites, and comparable history")]} section="journal" accent="#A472FF" />
      <ProductFeature id="discipline" eyebrow={t("Discipline et risque", "Discipline and risk")} title={t("Ton problème n’est pas toujours la stratégie.", "Your problem is not always the strategy.")} copy={t("Repère l’overtrading, les écarts au plan et les règles qui fragilisent ton compte avant qu’ils ne deviennent une habitude.", "Spot overtrading, plan deviations, and rules that weaken your account before they become a habit.")} bullets={[t("Score construit depuis tes trades réels", "Score built from your real trades"), t("Check-list et limites personnalisées", "Custom checklist and limits"), t("Alertes comportementales lisibles", "Clear behavioral alerts")]} section="discipline" accent="#17E6AF" />
      <ProductFeature id="payouts" reverse eyebrow={t("Objectifs et retraits", "Goals and withdrawals")} title={t("Projette tes payouts sans oublier la marge de sécurité.", "Project payouts without forgetting your safety margin.")} copy={t("Enregistre tes retraits, estime ton prochain objectif et conserve une lecture prudente du drawdown de chaque compte.", "Record withdrawals, estimate your next goal, and keep a prudent view of each account’s drawdown.")} bullets={[t("Historique des payouts", "Payout history"), t("Projection d’objectif", "Goal projection"), t("Retrait prudent estimé par compte", "Estimated prudent withdrawal per account")]} section="payouts" accent="#4F8CFF" />

      <section id="prop-firms" className="scroll-mt-28 px-5 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-[1280px] overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#080A10] lg:grid-cols-12">
          <Reveal className="p-7 sm:p-10 lg:col-span-5 lg:p-14"><SectionTitle eyebrow="Prop firms" title={t("Ce qui fait perdre un challenge n’est pas toujours visible à temps.", "What loses a challenge is not always visible in time.")} copy={t("PipsEvo t’aide à suivre les limites saisies pour tes comptes. Il ne remplace ni les règles officielles de la prop firm ni ta propre vérification.", "PipsEvo helps track the limits entered for your accounts. It does not replace the prop firm’s official rules or your own verification.")} /><Link to="/register" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#AE97FF] transition hover:text-white">{t("Configurer mon premier compte", "Set up my first account")}<ArrowRight className="h-4 w-4" /></Link></Reveal>
          <div className="border-t border-white/[0.08] lg:col-span-7 lg:border-l lg:border-t-0">
            {[{ n: "01", title: t("Définis les règles", "Define the rules"), copy: t("Perte quotidienne, drawdown, objectif et taille du compte.", "Daily loss, drawdown, target, and account size."), icon: FileText }, { n: "02", title: t("Journalise le processus", "Log the process"), copy: t("Ajoute contexte et respect du plan à chaque trade.", "Add context and plan compliance to every trade."), icon: BookOpen }, { n: "03", title: t("Surveille les écarts", "Monitor deviations"), copy: t("Lis les alertes comme une aide à la discipline, jamais comme une garantie.", "Read alerts as a discipline aid, never as a guarantee."), icon: ShieldCheck }].map(({ n, title, copy, icon: Icon }, index) => <Reveal key={n} delay={index * .07} className={`grid grid-cols-[42px_1fr_auto] items-center gap-4 p-6 sm:p-8 ${index ? "border-t border-white/[0.08]" : ""}`}><span className="font-mono text-xs text-[#6D7481]">{n}</span><div><h3 className="font-semibold text-[#E8EAF0]">{title}</h3><p className="mt-1.5 text-sm leading-6 text-[#818999]">{copy}</p></div><Icon className="hidden h-5 w-5 text-[#755CDE] sm:block" /></Reveal>)}
          </div>
        </div>
      </section>

      <section id="atlas" className="scroll-mt-28 px-5 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5"><div className="mb-6 grid h-11 w-11 place-items-center rounded-2xl border border-[#7657FF]/25 bg-[#7657FF]/10"><Sparkles className="h-5 w-5 text-[#A98EFF]" /></div><SectionTitle eyebrow={t("Atlas IA", "Atlas AI")} title={t("Pose une question à tes données.", "Ask your data a question.")} copy={t("Atlas transforme ton historique en analyse comportementale sourcée. Aucun signal, aucune prédiction : seulement tes données et des pistes d’action concrètes.", "Atlas turns your history into sourced behavioral analysis. No signals, no predictions: only your data and concrete action paths.")} /><div className="mt-8 flex flex-wrap gap-2">{[t("Pourquoi je perds plus l’après-midi ?", "Why do I lose more in the afternoon?"), t("Quel setup me rapporte le plus ?", "Which setup earns me the most?"), t("Quel est mon coût d’overtrading ?", "What is my overtrading cost?")].map(question => <span key={question} className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-[#A5ACB9]">{question}</span>)}</div></Reveal>
          <Reveal delay={0.08} className="relative lg:col-span-7"><div className="pointer-events-none absolute inset-x-[15%] bottom-0 h-32 rounded-full bg-[#9B4DFF]/10 blur-[80px]" /><div className="relative overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#080A10] p-2 sm:p-3"><ProductDashboardPreview activeSection="coach" accent="#B15DFF" /></div></Reveal>
        </div>
      </section>

      <section ref={systemSectionRef} id="tools" className="relative scroll-mt-28 overflow-hidden border-y border-white/[0.06] bg-[#06070A] px-5 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32">
        <div className="pointer-events-none absolute inset-0 opacity-[0.17]" style={{ backgroundImage: "radial-gradient(rgba(140,115,255,.24) .7px, transparent .7px)", backgroundSize: "26px 26px", maskImage: "linear-gradient(to bottom, transparent, black 16%, black 84%, transparent)" }} />
        <div data-system-aurora data-direction="1" aria-hidden="true" className="pointer-events-none absolute -left-[8%] top-[20%] h-[420px] w-[420px] rounded-full bg-[#5C3DFF]/[0.09] blur-[110px] will-change-transform" />
        <div data-system-aurora data-direction="-1" aria-hidden="true" className="pointer-events-none absolute -right-[9%] bottom-[10%] h-[460px] w-[460px] rounded-full bg-[#246DFF]/[0.07] blur-[120px] will-change-transform" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7657FF]/45 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#4F8CFF]/25 to-transparent" />
        <div className="relative mx-auto max-w-[1180px]">
          <div data-system-heading><SectionTitle center eyebrow={t("Un système complet", "A complete system")} title={t("De la décision au payout, tout se connecte.", "From decision to payout, everything connects.")} copy={t("Chaque outil alimente la même lecture de ta performance, de ton risque et de ta discipline.", "Every tool feeds the same view of your performance, risk, and discipline.")} /></div>

          <div data-system-layout="mobile" className="mt-14 lg:hidden">
            <SystemCore t={t} />
            <div className="relative mt-4 grid grid-cols-2 gap-3 sm:gap-4">
              <div className="pointer-events-none absolute bottom-0 left-1/2 top-[-16px] w-px -translate-x-1/2 bg-gradient-to-b from-[#7657FF]/35 via-[#7657FF]/10 to-transparent" />
              {systemTools.map((tool, index) => <SystemNode key={tool.label} {...tool} index={index} />)}
            </div>
          </div>

          <div data-system-layout="desktop" className="relative mt-16 hidden grid-cols-3 gap-[18px] lg:grid" style={{ perspective: "1100px" }}>
            <svg aria-hidden="true" viewBox="0 0 900 552" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
              <defs>
                <linearGradient id="system-flow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4F8CFF" stopOpacity=".14" />
                  <stop offset="52%" stopColor="#8C73FF" stopOpacity=".8" />
                  <stop offset="100%" stopColor="#17E6AF" stopOpacity=".12" />
                </linearGradient>
                <filter id="system-dot-glow" x="-250%" y="-250%" width="600%" height="600%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {systemFlowPaths.map(path => <path key={`base-${path}`} d={path} fill="none" stroke="#8C73FF" strokeOpacity=".11" strokeWidth="1" />)}
              {systemFlowPaths.map((path, index) => <path
                key={path}
                data-flow-path
                d={path}
                fill="none"
                stroke="url(#system-flow)"
                strokeWidth="1.65"
                strokeLinecap="round"
                strokeDasharray="12 18"
              />)}
              {systemFlowPaths.map((_, index) => <circle key={`dot-${index}`} data-flow-dot r={index % 3 === 0 ? 4.2 : 3.2} fill={index % 2 ? "#8C73FF" : "#5F9BFF"} filter="url(#system-dot-glow)" />)}
            </svg>
            <SystemNode {...systemTools[0]} index={0} />
            <SystemNode {...systemTools[1]} index={1} />
            <SystemNode {...systemTools[2]} index={2} />
            <SystemNode {...systemTools[3]} index={3} />
            <SystemCore t={t} />
            <SystemNode {...systemTools[4]} index={4} />
            <SystemNode {...systemTools[5]} index={5} />
            <SystemNode {...systemTools[6]} index={6} />
            <SystemNode {...systemTools[7]} index={7} />
          </div>
        </div>
      </section>

      <section id="beta" className="scroll-mt-28 px-5 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32">
        <Reveal className="mx-auto max-w-[1120px] text-center"><div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#17E6AF]/20 bg-[#17E6AF]/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-[#64E6BD]"><span className="h-1.5 w-1.5 rounded-full bg-[#17E6AF]" />{t("Bêta publique", "Public beta")}</div><h2 className="text-balance text-3xl font-semibold tracking-[-0.035em] text-[#F0F1F4] sm:text-4xl lg:text-5xl">{t("Un produit vivant, construit avec ses premiers utilisateurs.", "A living product, built with its first users.")}</h2><p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-[#8D95A4]">{t("Accède gratuitement aux fonctions disponibles, partage ton feedback et suis clairement ce qui est en bêta ou encore à venir.", "Access available features for free, share feedback, and clearly see what is in beta or still upcoming.")}</p><div className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-3 text-xs text-[#747C8B]"><span>{t("Accès gratuit", "Free access")}</span><span>•</span><span>{t("Sans carte bancaire", "No credit card")}</span><span>•</span><span>{t("Fonctions à venir clairement étiquetées", "Upcoming features clearly labeled")}</span></div></Reveal>
      </section>

      <section id="pricing" className="scroll-mt-28 px-5 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-[1180px] overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#080A10] lg:grid-cols-12">
          <Reveal className="p-7 sm:p-10 lg:col-span-5 lg:p-14"><Eyebrow>{t("Accès bêta", "Beta access")}</Eyebrow><div className="flex items-end gap-2"><span className="text-6xl font-semibold tracking-[-0.05em]">0 €</span><span className="pb-2 text-sm text-[#7F8796]">{t("pendant la bêta", "during beta")}</span></div><p className="mt-5 text-sm leading-6 text-[#9097A5]">{t("Aucun abonnement payant n’est proposé pendant la bêta. Les futurs tarifs seront annoncés avant toute activation.", "No paid subscription is offered during beta. Future pricing will be announced before activation.")}</p><Link to="/register" className="btn-primary mt-8 inline-flex items-center gap-2 !rounded-xl">{t("Créer mon espace", "Create my workspace")}<ArrowRight className="h-4 w-4" /></Link></Reveal>
          <div className="border-t border-white/[0.08] p-7 sm:p-10 lg:col-span-7 lg:border-l lg:border-t-0 lg:p-14"><h3 className="text-sm font-semibold text-[#E5E7EB]">{t("Inclus dans la bêta actuelle", "Included in the current beta")}</h3><div className="mt-7 grid gap-4 sm:grid-cols-2">{[t("Journal manuel structuré", "Structured manual journal"), t("Dashboard et statistiques essentielles", "Dashboard and essential statistics"), t("Score de discipline et check-list", "Discipline score and checklist"), t("Suivi manuel des payouts", "Manual payout tracking"), t("Import CSV sécurisé", "Secure CSV import"), t("Atlas IA avec sources", "Atlas AI with sources"), t("Export de tes données", "Your data export"), t("Plusieurs comptes en accès de test", "Multiple accounts in test access")].map(item => <CheckLine key={item}>{item}</CheckLine>)}</div><Link to="/pricing" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#9D85FF] transition hover:text-white">{t("Voir les tarifs prévus", "See planned pricing")}<ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-28 px-5 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-12 lg:gap-20"><Reveal className="lg:col-span-4"><SectionTitle eyebrow="FAQ" title={t("Des réponses claires avant de commencer.", "Clear answers before you start.")} copy={t("Une autre question ? Notre équipe te répond directement.", "Another question? Our team will answer directly.")} /><Link to="/contact" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#A68FFF] transition hover:text-white">{t("Contacter PipsEvo", "Contact PipsEvo")}<ArrowRight className="h-4 w-4" /></Link></Reveal><div className="divide-y divide-white/[0.08] border-y border-white/[0.08] lg:col-span-8">{faqs.map((faq, index) => <Reveal key={faq.fr} delay={index * .025}><details className="group"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-left text-[15px] font-semibold text-[#E2E4E9] sm:py-6"><span>{t(faq.fr, faq.en)}</span><ChevronDown className="h-4 w-4 shrink-0 text-[#747C8A] transition group-open:rotate-180 group-open:text-[#A88FFF]" /></summary><p className="max-w-2xl pb-6 pr-10 text-sm leading-6 text-[#8991A0]">{t(faq.answerFr, faq.answerEn)}</p></details></Reveal>)}</div></div>
      </section>

      <section className="px-5 pb-24 pt-10 sm:px-6 sm:pb-28 lg:px-10 lg:pb-36">
        <Reveal className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0A0B12] px-6 py-14 text-center sm:px-10 sm:py-[72px] lg:py-20"><div className="pointer-events-none absolute left-1/2 top-full h-48 w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6745E8]/[0.14] blur-[90px]" /><LockKeyhole className="relative mx-auto h-6 w-6 text-[#8F76FF]" /><h2 className="relative mx-auto mt-6 max-w-3xl text-balance text-3xl font-semibold tracking-[-0.035em] text-[#F1F2F5] sm:text-4xl lg:text-5xl">{t("Tes données montrent déjà la prochaine chose à corriger.", "Your data already shows the next thing to fix.")}</h2><p className="relative mx-auto mt-5 max-w-xl text-sm leading-6 text-[#8D95A4]">{t("Commence à les structurer aujourd’hui. Gratuitement, sans carte bancaire.", "Start structuring it today. Free, with no credit card.")}</p><Link to="/register" className="btn-primary relative mt-8 inline-flex items-center gap-2 !rounded-xl">{t("Commencer gratuitement", "Start for free")}<ArrowRight className="h-4 w-4" /></Link></Reveal>
      </section>
    </main>

    <footer className="border-t border-white/[0.07] px-5 py-12 sm:px-6 lg:px-10 lg:py-16">
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]"><div><Logo size="md" /><p className="mt-4 max-w-xs text-sm leading-6 text-[#777F8E]">{t("Le système d’exploitation pour protéger, comprendre et faire progresser tes comptes financés.", "The operating system to protect, understand, and grow your funded accounts.")}</p><p className="mt-5 text-[11px] text-[#5F6673]">{t("PipsEvo ne fournit aucun signal ni conseil financier.", "PipsEvo provides no signals or financial advice.")}</p></div>{[
        [t("Produit", "Product"), [[t("Fonctionnalités", "Features"), "/#product"], ["Prop Firms", "/#prop-firms"], [t("Tarifs", "Pricing"), "/pricing"], [t("Bêta", "Beta"), "/#beta"], [t("Plateformes", "Platforms"), "/platforms"]]],
        [t("Ressources", "Resources"), [["FAQ", "/faq"], [t("Centre d’aide", "Help center"), "/help"], ["Contact", "/contact"], [t("Guides", "Guides"), "/blog"]]],
        [t("Légal", "Legal"), [[t("Confidentialité", "Privacy"), "/privacy"], [t("Conditions d’utilisation", "Terms of use"), "/terms"], [t("Sécurité", "Security"), "/security"]]],
      ].map(([title, links]) => <div key={title}><h3 className="text-xs font-semibold uppercase tracking-[.16em] text-[#AEB4BF]">{title}</h3><div className="mt-5 space-y-3">{links.map(([label, href]) => <Link key={label} to={href} className="block text-sm text-[#747C8B] transition hover:text-white">{label}</Link>)}</div></div>)}</div>
      <div className="mx-auto mt-12 flex max-w-[1280px] flex-col gap-5 border-t border-white/[0.07] pt-7 text-xs text-[#5E6572] sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} PipsEvo. {t("Tous droits réservés.", "All rights reserved.")}</span><div className="flex flex-wrap items-center gap-4"><button type="button" onClick={() => setLanguage("fr")} className={`transition hover:text-white ${language === "fr" ? "text-[#B6A4FF]" : ""}`}>🇫🇷 Français</button><button type="button" onClick={() => setLanguage("en")} className={`transition hover:text-white ${language === "en" ? "text-[#B6A4FF]" : ""}`}>🇬🇧 English</button><button type="button" onClick={openCookieSettings} className="transition hover:text-white">{t("Gérer les cookies", "Manage cookies")}</button></div></div>
    </footer>
  </div>;
}
