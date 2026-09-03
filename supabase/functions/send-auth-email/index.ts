import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type EmailAction = "signup" | "recovery" | "invite" | "magiclink" | "email_change" | "reauthentication";

interface HookPayload {
  user: {
    id: string;
    email?: string;
    new_email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailAction;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

const actionCopy: Record<EmailAction, { subject: string; eyebrow: string; title: string; intro: string; cta: string; warning: string }> = {
  signup: {
    subject: "Confirme ton adresse e-mail PipsEvo",
    eyebrow: "Activation du compte",
    title: "Bienvenue chez PipsEvo",
    intro: "Confirme ton adresse e-mail pour activer ton espace et commencer ton onboarding.",
    cta: "Confirmer mon adresse",
    warning: "Ce lien est personnel. Si tu n’as pas créé de compte PipsEvo, ignore ce message.",
  },
  recovery: {
    subject: "Réinitialise ton mot de passe PipsEvo",
    eyebrow: "Sécurité du compte",
    title: "Nouveau mot de passe",
    intro: "Une demande de réinitialisation a été faite pour ton compte PipsEvo.",
    cta: "Choisir un nouveau mot de passe",
    warning: "Si tu n’es pas à l’origine de cette demande, ne clique pas sur ce lien et conserve ton mot de passe actuel.",
  },
  invite: {
    subject: "Ton invitation PipsEvo",
    eyebrow: "Invitation",
    title: "Tu es invité sur PipsEvo",
    intro: "Finalise ton accès sécurisé pour rejoindre ton espace PipsEvo.",
    cta: "Accepter l’invitation",
    warning: "Cette invitation est personnelle et ne doit pas être transférée.",
  },
  magiclink: {
    subject: "Ton lien de connexion PipsEvo",
    eyebrow: "Connexion sécurisée",
    title: "Connecte-toi à PipsEvo",
    intro: "Utilise ce lien à usage unique pour ouvrir ta session PipsEvo.",
    cta: "Me connecter",
    warning: "Si tu n’as pas demandé ce lien, tu peux ignorer ce message.",
  },
  email_change: {
    subject: "Confirme ta nouvelle adresse PipsEvo",
    eyebrow: "Modification du compte",
    title: "Confirme ce changement d’adresse",
    intro: "Valide cette adresse pour terminer la modification de ton compte PipsEvo.",
    cta: "Confirmer le changement",
    warning: "Si tu n’as pas demandé cette modification, sécurise immédiatement ton compte.",
  },
  reauthentication: {
    subject: "Confirme cette action sensible sur PipsEvo",
    eyebrow: "Vérification de sécurité",
    title: "Confirme ton identité",
    intro: "Une vérification supplémentaire est nécessaire avant cette action sensible.",
    cta: "Confirmer mon identité",
    warning: "Ne transfère jamais cet e-mail ni son lien de vérification.",
  },
};

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const verificationUrl = (supabaseUrl: string, hash: string, action: EmailAction, redirectTo: string) => {
  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/verify`);
  url.searchParams.set("token", hash);
  url.searchParams.set("type", action);
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
};

const template = (copy: typeof actionCopy[EmailAction], url: string, displayName?: string) => {
  const greeting = displayName ? `Bonjour ${escapeHtml(displayName)},` : "Bonjour,";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(copy.subject)}</title></head>
  <body style="margin:0;background:#05070D;color:#F7F7FB;font-family:Inter,Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(copy.intro)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#05070D;padding:32px 14px"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#0D1120;border:1px solid #242B46;border-radius:20px;overflow:hidden">
  <tr><td style="padding:27px 32px;border-bottom:1px solid #20263D"><div style="font-size:24px;font-weight:800">Pips<span style="color:#6B72FF">Evo.</span></div></td></tr>
  <tr><td style="padding:34px 32px 12px"><div style="color:#9E83FF;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${escapeHtml(copy.eyebrow)}</div><h1 style="font-size:28px;line-height:1.2;margin:13px 0 18px">${escapeHtml(copy.title)}</h1><p style="font-size:15px;line-height:1.7;color:#C8CEDA;margin:0 0 10px">${greeting}</p><p style="font-size:15px;line-height:1.7;color:#C8CEDA;margin:0">${escapeHtml(copy.intro)}</p></td></tr>
  <tr><td style="padding:22px 32px 30px"><a href="${escapeHtml(url)}" style="display:inline-block;background:linear-gradient(135deg,#7C4DFF,#4F8CFF);color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">${escapeHtml(copy.cta)}</a></td></tr>
  <tr><td style="padding:22px 32px;background:#090C16;border-top:1px solid #20263D"><p style="font-size:12px;line-height:1.65;color:#818A9B;margin:0">${escapeHtml(copy.warning)}<br><br>PipsEvo ne te demandera jamais ton mot de passe par e-mail.</p></td></tr>
  </table></td></tr></table></body></html>`;
};

const send = async (to: string, action: EmailAction, hash: string, payload: HookPayload) => {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("AUTH_EMAIL_FROM");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!apiKey || !from || !supabaseUrl) throw new Error("Missing email provider configuration");
  const copy = actionCopy[action];
  const redirectTo = payload.email_data.redirect_to || payload.email_data.site_url;
  const url = verificationUrl(supabaseUrl, hash, action, redirectTo);
  const displayName = typeof payload.user.user_metadata?.display_name === "string"
    ? payload.user.user_metadata.display_name
    : undefined;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `pipsevo-auth-${action}-${payload.user.id}-${hash.slice(0, 24)}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: Deno.env.get("EMAIL_REPLY_TO") || undefined,
      subject: copy.subject,
      html: template(copy, url, displayName),
      text: `${copy.title}\n\n${copy.intro}\n\n${copy.cta}: ${url}\n\n${copy.warning}`,
    }),
  });
  if (!response.ok) throw new Error(`Resend rejected auth email (${response.status})`);
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const secret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
    if (!secret) throw new Error("SEND_EMAIL_HOOK_SECRET is missing");
    const rawBody = await request.text();
    const webhook = new Webhook(secret.replace("v1,whsec_", ""));
    const payload = webhook.verify(rawBody, Object.fromEntries(request.headers)) as HookPayload;
    const action = payload.email_data.email_action_type;
    if (!actionCopy[action]) throw new Error("Unsupported auth email action");
    if (!payload.user.email) throw new Error("Auth email recipient is missing");

    await send(payload.user.email, action, payload.email_data.token_hash, payload);
    if (action === "email_change" && payload.user.new_email && payload.email_data.token_hash_new) {
      await send(payload.user.new_email, action, payload.email_data.token_hash_new, payload);
    }
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("PipsEvo auth email hook failed", error);
    return new Response(JSON.stringify({ error: "Email delivery failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
