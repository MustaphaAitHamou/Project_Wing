import { layout, type RenderedEmail } from "./layout";

export const templates = {
  verifyEmail: (d: { name: string; url: string }): RenderedEmail => ({
    subject: "Confirmez votre adresse email",
    ...layout({ title: `Bienvenue ${d.name}`, preheader: "Confirmez votre email pour activer votre compte.", paragraphs: ["Confirmez votre adresse email pour activer votre compte Tamurt Sending. Ce lien expire dans 24 heures."], cta: { label: "Confirmer mon email", url: d.url } }),
  }),
  resetPassword: (d: { name: string; url: string }): RenderedEmail => ({
    subject: "Réinitialisation de votre mot de passe",
    ...layout({ title: "Nouveau mot de passe", preheader: "Lien de réinitialisation valable 1 heure.", paragraphs: [`Bonjour ${d.name}, vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable 1 heure.`, "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé."], cta: { label: "Choisir un nouveau mot de passe", url: d.url } }),
  }),
  pickupCode: (d: { name: string; reference: string; code: string; travelerName: string; expiresAt: string }): RenderedEmail => ({
    subject: `Code de remise du colis ${d.reference}`,
    ...layout({ title: "Code de remise au voyageur", preheader: "À communiquer au voyageur uniquement lorsqu'il récupère votre colis.", paragraphs: [`Bonjour ${d.name}, voici le code à donner à ${d.travelerName} au moment où vous lui remettez le colis (réservation ${d.reference}).`, `Ne communiquez ce code qu'en main propre, une fois le colis vérifié ensemble. Il expire le ${d.expiresAt}.`], code: d.code }),
  }),
  deliveryCode: (d: { name: string; reference: string; code: string; expiresAt: string; url?: string }): RenderedEmail => ({
    subject: `Code de réception du colis ${d.reference}`,
    ...layout({ title: "Votre colis arrive", preheader: "Code à donner au voyageur à la réception du colis.", paragraphs: [`Bonjour ${d.name}, un colis Tamurt Sending vous est destiné (réservation ${d.reference}).`, `Donnez ce code au voyageur uniquement après avoir reçu et vérifié le colis. Il expire le ${d.expiresAt}.`], code: d.code }),
  }),
  notification: (d: { name: string; title: string; body: string; url?: string }): RenderedEmail => ({
    subject: d.title,
    ...layout({ title: d.title, preheader: d.body, paragraphs: [`Bonjour ${d.name},`, d.body], cta: d.url ? { label: "Ouvrir Tamurt Sending", url: d.url } : undefined, footer: "Vous pouvez gérer vos préférences de notification dans Paramètres > Notifications." }),
  }),
  contact: (d: { name: string; email: string; subject: string; message: string }): RenderedEmail => ({
    subject: `[Contact] ${d.subject}`,
    ...layout({ title: `Message de ${d.name}`, preheader: d.subject, paragraphs: [`De : ${d.name} <${d.email}>`, `Objet : ${d.subject}`, d.message], footer: "Message envoyé depuis le formulaire de contact." }),
  }),
} as const;

export type TemplateName = keyof typeof templates;
