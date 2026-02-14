type MailTemplate = {
  subject: string
  body: string
  mediaUrl?: string | null
}

const DEFAULT_APPROVAL_SUBJECT = "🎉 Du wurdest freigeschaltet"
const DEFAULT_APPROVAL_BODY =
  "Stark – dein Creator-Profil wurde freigeschaltet. Du kannst jetzt dein Profil ausbauen und deine Musik veröffentlichen."

const DEFAULT_REJECTION_SUBJECT = "Update zu deiner Creator-Bewerbung"
const DEFAULT_REJECTION_BODY =
  "Danke für deine Bewerbung bei Aivolution. Aktuell können wir dich aus strategischen Plattform-Gründen leider nicht freischalten. Das ist keine Bewertung deines Werks. Wir wünschen dir weiterhin viel Erfolg."

function withFallback(value: string | null | undefined, fallback: string) {
  const trimmed = (value || "").trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export async function loadTemplateBySlot(
  supabase: any,
  slotId: number,
  fallbackSubject: string,
  fallbackBody: string
): Promise<MailTemplate> {
  const { data } = await supabase
    .from("promo_slots")
    .select("title, body_text, media_url")
    .eq("slot_id", slotId)
    .maybeSingle()

  return {
    subject: withFallback(data?.title, fallbackSubject),
    body: withFallback(data?.body_text, fallbackBody),
    mediaUrl: data?.media_url ?? null,
  }
}

export async function sendTransactionalMail(params: {
  to: string
  subject: string
  text: string
  mediaUrl?: string | null
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from || !params.to) {
    return { sent: false, reason: "missing_email_config_or_target" as const }
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2 style="margin: 0 0 12px 0;">${params.subject}</h2>
      <p style="white-space: pre-line; margin: 0 0 16px 0;">${params.text}</p>
      ${
        params.mediaUrl
          ? `<img src="${params.mediaUrl}" alt="Aivo" style="max-width: 320px; border-radius: 16px; border: 2px solid #111;" />`
          : ""
      }
      <p style="margin-top: 20px; font-size: 12px; color: #666;">Aivolution Music</p>
    </div>
  `

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html,
      text: params.text,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return { sent: false, reason: "resend_error" as const, errorText }
  }

  return { sent: true as const }
}

export const CURATION_TEMPLATE_DEFAULTS = {
  approval: {
    slotId: 201,
    subject: DEFAULT_APPROVAL_SUBJECT,
    body: DEFAULT_APPROVAL_BODY,
  },
  rejection: {
    slotId: 202,
    subject: DEFAULT_REJECTION_SUBJECT,
    body: DEFAULT_REJECTION_BODY,
  },
}
