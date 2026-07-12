import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { contact } from "@/lib/api";
import { toast } from "sonner";

const faqs = [
  ["Comment ajouter mes trades ?", "Depuis le Journal, clique sur Nouveau trade, choisis ton compte puis renseigne le résultat et le contexte du trade."],
  ["Quelles prop firms sont compatibles ?", "PipsEvo accepte Topstep, Apex, FTMO, FundedNext, The5ers, Take Profit Trader et les comptes personnalisés."],
  ["PipsEvo donne-t-il des signaux ?", "Non. Le service analyse uniquement tes performances, ta discipline et tes habitudes."],
  ["Mes données sont-elles privées ?", "Tes données sont associées à ton compte et les routes privées nécessitent une authentification."],
  ["Puis-je utiliser plusieurs comptes ?", "Oui. Le plan bêta permet de centraliser plusieurs comptes et de filtrer les résultats par compte."],
  ["Comment fonctionne le coach IA ?", "Il s'appuie sur tes derniers trades pour proposer une analyse comportementale, jamais des ordres d'achat ou de vente."],
  ["Puis-je résilier à tout moment ?", "Oui. Lors de l'ouverture commerciale, la résiliation restera possible depuis les paramètres du compte."],
];

function PublicLayout({ title, subtitle, children }) {
  return <div className="min-h-screen bg-[#050505] text-white">
    <header className="border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl"><div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between"><Link to="/"><Logo/></Link><nav className="flex items-center gap-4 text-sm text-[#9CA3AF]"><Link to="/pricing" className="hover:text-white">Tarifs</Link><Link to="/faq" className="hover:text-white">FAQ</Link><Link to="/contact" className="hover:text-white">Contact</Link><Link to="/login" className="btn-primary py-2">Connexion</Link></nav></div></header>
    <main className="max-w-5xl mx-auto px-5 py-14"><div className="text-center mb-10"><h1 className="text-3xl sm:text-5xl font-bold text-gradient">{title}</h1><p className="text-[#9CA3AF] mt-3 max-w-2xl mx-auto">{subtitle}</p></div>{children}</main>
    <Footer/>
  </div>;
}

export function FAQPage(){return <PublicLayout title="Questions fréquentes" subtitle="Tout ce qu'il faut savoir pour utiliser PipsEvo."><div className="max-w-3xl mx-auto space-y-3">{faqs.map(([q,a])=><details key={q} className="card-flat p-5"><summary className="cursor-pointer font-semibold">{q}</summary><p className="text-sm text-[#9CA3AF] mt-3 leading-relaxed">{a}</p></details>)}</div></PublicLayout>}

export function ContactPage(){
  const [form,setForm]=useState({name:"",email:"",subject:"",message:""}); const [sending,setSending]=useState(false);
  const submit=async(e)=>{e.preventDefault();setSending(true);try{await contact(form);toast.success("Message envoyé");setForm({name:"",email:"",subject:"",message:""})}catch(e){toast.error(e.response?.data?.detail || "Envoi impossible")}finally{setSending(false)}};
  const field=(k,p,type="text")=><input type={type} required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={p} className="w-full bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3"/>;
  return <PublicLayout title="Contacte-nous" subtitle="Une question, une difficulté ou une suggestion ? Notre équipe te répond."><div className="grid md:grid-cols-3 gap-5"><div className="card-elev p-6 space-y-4"><Mail className="text-[#B58BFF]"/><div><div className="font-semibold">Support</div><div className="text-sm text-[#9CA3AF] mt-1">Réponse sous 1 à 2 jours ouvrés.</div></div><div className="text-sm text-[#B58BFF]">support@pipsevo.app</div></div><form onSubmit={submit} className="card-elev p-6 md:col-span-2 space-y-3">{field("name","Ton nom")}{field("email","Ton e-mail","email")}{field("subject","Sujet")}<textarea required minLength={10} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Décris ta demande…" rows={6} className="w-full bg-[#0D1020] border border-white/10 rounded-xl px-4 py-3"/><button disabled={sending} className="btn-primary w-full">{sending?"Envoi…":"Envoyer le message"}</button></form></div></PublicLayout>;
}

export function PricingPage(){return <PublicLayout title="Des offres simples" subtitle="Commence gratuitement et passe à Pro lorsque tu en as besoin."><div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto"><Plan name="Basic" price="0 €" items={["2 comptes","Journal de trades","Dashboard","Statistiques essentielles"]}/><Plan pro name="Pro" price="19,99 €/mois" items={["Comptes illimités","Coach IA","Trading DNA","Backtest","Support prioritaire"]}/></div></PublicLayout>}
const Plan=({name,price,items,pro})=><div className={`card-elev p-7 ${pro?"glow-purple border-[#7C4DFF]/40":""}`}><div className="text-[#B58BFF] font-mono uppercase text-xs">{name}</div><div className="text-4xl font-bold mt-3">{price}</div><div className="space-y-3 mt-6">{items.map(x=><div key={x} className="flex gap-2 text-sm"><Check className="w-4 h-4 text-[#00E676]"/>{x}</div>)}</div><Link to="/register" className={`${pro?"btn-primary":"btn-ghost"} block text-center mt-7`}>Commencer</Link></div>;

const legal = {
  privacy:["Confidentialité","PipsEvo collecte les informations nécessaires au fonctionnement du compte, notamment l'e-mail, le profil et les données de trading saisies.","Les données ne sont pas vendues. Tu peux demander leur consultation ou leur suppression via la page Contact."],
  terms:["Conditions d'utilisation","PipsEvo est un outil d'analyse et de journalisation. Il ne fournit aucun conseil financier, signal ou garantie de performance.","Tu restes responsable de tes décisions de trading et de la sécurité de ton compte."],
  security:["Sécurité","Les espaces privés sont protégés par authentification et les mots de passe sont enregistrés sous forme hachée.","Ne partage jamais ton mot de passe ou ton jeton de connexion. Signale toute activité suspecte au support."],
};
export function LegalPage({type}){const [title,...parts]=legal[type];return <PublicLayout title={title} subtitle="Informations importantes concernant PipsEvo."><div className="card-elev p-7 max-w-3xl mx-auto space-y-5"><ShieldCheck className="text-[#B58BFF]"/>{parts.map(p=><p key={p} className="text-[#B5BBC9] leading-relaxed">{p}</p>)}</div></PublicLayout>}

function Footer(){return <footer className="border-t border-white/5 px-5 py-10"><div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-6 text-sm"><div><Logo/><p className="text-[#6B7280] mt-3">Le journal des traders financés.</p></div><div><div className="font-semibold mb-3">Aide</div><div className="flex flex-col gap-2 text-[#9CA3AF]"><Link to="/faq">FAQ</Link><Link to="/contact">Contact</Link><Link to="/pricing">Tarifs</Link></div></div><div><div className="font-semibold mb-3">Légal</div><div className="flex flex-col gap-2 text-[#9CA3AF]"><Link to="/privacy">Confidentialité</Link><Link to="/terms">Conditions</Link><Link to="/security">Sécurité</Link></div></div></div></footer>}
