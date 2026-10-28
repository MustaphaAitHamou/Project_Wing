"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { action } from "@/server/security/action";
import { rateLimit } from "@/server/security/rate-limit";
import { enqueue } from "@/server/jobs/queue";
import { db } from "@/server/db/client";

const schema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(100),
  email: z.string().trim().email("Email invalide").max(200),
  subject: z.string().trim().min(3, "Objet requis").max(150),
  message: z.string().trim().min(20, "Message trop court (20 caractères minimum)").max(4000),
  website: z.string().max(0).optional(), // champ piège anti-robots
});

export const sendContactAction = action(schema, async (d) => {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await rateLimit(`contact:${ip}`, 5, 3600);
  const to = process.env.CONTACT_EMAIL ?? "contact@tamurt-sending.local";
  await enqueue(db, "email.send", { to, template: "contact", data: { name: d.name, email: d.email, subject: d.subject, message: d.message } });
});
