"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, NumberInput, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { CityCombobox, type CityOption } from "@/components/marketplace/city-combobox";
import { cn, toDateInput } from "@/lib/utils";
import { computeFees, formatMoney, parseAmountToMinor, type FeeModel } from "@/lib/domain/money";
import { parcelInputSchema, type ParcelFormValues, type ParcelInput } from "./schemas";
import { saveParcelAction, uploadParcelPhotoAction } from "./actions";

type Category = { id: string; name: string; description: string | null; requiresReview: boolean };

const STEPS = [
  { title: "Trajet", fields: ["originCityId", "destCityId", "desiredDate", "dateFlexDays"] },
  { title: "Colis", fields: ["title", "categoryId", "description", "weightGrams", "lengthCm", "widthCm", "heightCm", "quantity", "declaredValue", "isFragile", "specialConditions"] },
  { title: "Destinataire", fields: ["recipient.name", "recipient.phone", "recipient.email", "recipient.city", "recipient.instructions"] },
  { title: "Budget", fields: ["budget", "currency"] },
  { title: "Vérification", fields: [] },
] as const;

export interface WizardInitial {
  id?: string;
  values?: Partial<ParcelFormValues>;
  origin?: CityOption | null;
  dest?: CityOption | null;
  published?: boolean;
}

export function ParcelWizard({ categories, rateBps, feeModel, maxWeightKg, initial }: { categories: Category[]; rateBps: number; feeModel: FeeModel; maxWeightKg: number; initial?: WizardInitial }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [origin, setOrigin] = React.useState<CityOption | null>(initial?.origin ?? null);
  const [dest, setDest] = React.useState<CityOption | null>(initial?.dest ?? null);
  const [photos, setPhotos] = React.useState<{ file: File; url: string }[]>([]);
  const [honor, setHonor] = React.useState(false);
  const [rules, setRules] = React.useState(false);
  const [submitting, setSubmitting] = React.useState<"draft" | "publish" | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  const form = useForm<ParcelFormValues, unknown, ParcelInput>({
    resolver: zodResolver(parcelInputSchema),
    mode: "onTouched",
    defaultValues: {
      originCityId: "", destCityId: "", desiredDate: "" as unknown as string, dateFlexDays: 3, title: "", categoryId: "", description: "",
      weightGrams: "" as unknown as number, lengthCm: "" as unknown as number, widthCm: "" as unknown as number, heightCm: "" as unknown as number, quantity: 1,
      declaredValue: "", isFragile: false, specialConditions: "", budget: "", currency: "EUR",
      recipient: { name: "", phone: "", email: "", city: "", instructions: "" },
      ...initial?.values,
    },
  });
  const { register, formState: { errors }, watch, setValue, trigger, getValues } = form;
  const err = (path: string) => path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], errors) as { message?: string } | undefined;

  React.useEffect(() => headingRef.current?.focus(), [step]);

  const next = async () => {
    const ok = await trigger(STEPS[step]!.fields as unknown as FieldPath<ParcelFormValues>[], { shouldFocus: true });
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const budgetMinor = parseAmountToMinor(String(watch("budget") ?? "")) ?? 0;
  const fees = budgetMinor > 0 ? computeFees(budgetMinor, rateBps, feeModel) : null;
  const category = categories.find((c) => c.id === watch("categoryId"));

  const submit = async (publish: boolean) => {
    setServerError(null);
    const valid = await trigger();
    if (!valid) {
      const firstStep = STEPS.findIndex((s) => s.fields.some((f) => err(f)));
      if (firstStep >= 0) setStep(firstStep);
      toast.error("Certains champs sont à corriger.");
      return;
    }
    if (publish && (!honor || !rules)) {
      setServerError("Cochez la déclaration sur l'honneur et l'acceptation des règles de transport.");
      return;
    }
    setSubmitting(publish ? "publish" : "draft");
    const raw = getValues();
    const res = await saveParcelAction({ id: initial?.id, data: raw as never, publish, declarations: publish ? { honorDeclaration: true, rulesAccepted: true } : undefined });
    if (!res.ok) {
      setSubmitting(null);
      setServerError(res.error);
      const fe = res.fieldErrors ?? {};
      for (const [k, v] of Object.entries(fe)) form.setError(k.replace(/^data\./, "") as FieldPath<ParcelFormValues>, { message: v[0] });
      return;
    }
    for (const p of photos) {
      const fd = new FormData();
      fd.set("parcelId", res.data.id);
      fd.set("file", p.file);
      const up = await uploadParcelPhotoAction(fd);
      if (!up.ok) toast.error(`Photo « ${p.file.name} » : ${up.error}`);
    }
    toast.success(res.data.status === "PUBLISHED" ? "Annonce publiée" : res.data.status === "PENDING_REVIEW" ? "Annonce envoyée en validation" : "Brouillon enregistré");
    router.push(`/tableau-de-bord/colis/${res.data.id}`);
    router.refresh();
  };

  return (
    <div className="grid gap-6">
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Étapes">
        {STEPS.map((s, i) => (
          <li key={s.title} className="grid gap-1.5">
            <span className={cn("h-1.5 rounded-full bg-muted", i <= step && "bg-primary")} />
            <span className={cn("hidden text-xs font-medium sm:block", i === step ? "text-foreground" : "text-muted-foreground")} aria-current={i === step ? "step" : undefined}>{i + 1}. {s.title}</span>
          </li>
        ))}
      </ol>

      <form className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-7" onSubmit={(e) => { e.preventDefault(); if (step < 4) void next(); }} noValidate>
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold outline-none">
          <span className="sr-only">Étape {step + 1} sur 5 : </span>{STEPS[step]!.title}
        </h2>

        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="originCityId" label="Ville de départ" error={err("originCityId")?.message}>
              <CityCombobox id="originCityId" value={origin} onChange={(c) => { setOrigin(c); setValue("originCityId", c?.id ?? "", { shouldValidate: !!c }); }} placeholder="ex. Marseille" />
            </Field>
            <Field id="destCityId" label="Ville d'arrivée" error={err("destCityId")?.message}>
              <CityCombobox id="destCityId" value={dest} onChange={(c) => { setDest(c); setValue("destCityId", c?.id ?? "", { shouldValidate: !!c }); }} placeholder="ex. Béjaïa" />
            </Field>
            <Field id="desiredDate" label="Date d'expédition souhaitée" error={err("desiredDate")?.message}>
              <Input type="date" min={toDateInput(new Date())} {...register("desiredDate")} />
            </Field>
            <Field id="dateFlexDays" label="Flexibilité sur la date" error={err("dateFlexDays")?.message}>
              <Select {...register("dateFlexDays")}>
                {[0, 1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d === 0 ? "Date exacte" : `± ${d} jour${d > 1 ? "s" : ""}`}</option>)}
              </Select>
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-2">Les pays de départ et d&apos;arrivée sont déduits des villes. Seuls les trajets ouverts sur la plateforme sont acceptés.</p>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="title" label="Titre de l'annonce" className="sm:col-span-2" error={err("title")?.message}><Input placeholder="ex. Vêtements pour enfants" {...register("title")} /></Field>
            <Field id="categoryId" label="Catégorie" className="sm:col-span-2" hint={category?.description ?? undefined} error={err("categoryId")?.message}>
              <Select {...register("categoryId")}>
                <option value="">Choisir une catégorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.requiresReview ? " (validation requise)" : ""}</option>)}
              </Select>
            </Field>
            {category?.requiresReview && <Alert tone="warning" className="sm:col-span-2">Cette catégorie est réglementée : votre annonce sera vérifiée par notre équipe avant publication.</Alert>}
            <Field id="description" label="Description précise du contenu" className="sm:col-span-2" hint="Le voyageur doit savoir exactement ce qu'il transporte." error={err("description")?.message}><Textarea rows={4} {...register("description")} /></Field>
            <Field id="weightGrams" label="Poids (kg)" hint={`Maximum ${maxWeightKg} kg`} error={err("weightGrams")?.message}><NumberInput decimals={1} placeholder="ex. 4" {...register("weightGrams")} /></Field>
            <Field id="quantity" label="Nombre de colis" error={err("quantity")?.message}><NumberInput decimals={0} {...register("quantity")} /></Field>
            <div className="grid grid-cols-3 gap-3 sm:col-span-2">
              <Field id="lengthCm" label="Longueur (cm)" error={err("lengthCm")?.message}><NumberInput decimals={0} {...register("lengthCm")} /></Field>
              <Field id="widthCm" label="Largeur (cm)" error={err("widthCm")?.message}><NumberInput decimals={0} {...register("widthCm")} /></Field>
              <Field id="heightCm" label="Hauteur (cm)" error={err("heightCm")?.message}><NumberInput decimals={0} {...register("heightCm")} /></Field>
            </div>
            <Field id="declaredValue" label="Valeur déclarée (€)" hint="Valeur réelle du contenu. Aucune assurance n'est incluse." error={err("declaredValue")?.message}><NumberInput placeholder="ex. 120" {...register("declaredValue")} /></Field>
            <label className="flex items-center gap-3 self-end rounded-lg border px-3 py-3 text-sm"><Checkbox {...register("isFragile")} />Colis fragile</label>
            <Field id="specialConditions" label="Conditions particulières" optional className="sm:col-span-2" error={err("specialConditions")?.message}><Textarea rows={2} {...register("specialConditions")} /></Field>
            <div className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-medium">Photos <span className="font-normal text-muted-foreground">(facultatif, 6 maximum, JPEG/PNG/WebP, 8 Mo)</span></span>
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <div key={p.url} className="relative size-20 overflow-hidden rounded-lg border">
                    <img src={p.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                    <button type="button" className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white" aria-label={`Retirer la photo ${i + 1}`} onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}><X className="size-3.5" /></button>
                  </div>
                ))}
                {photos.length < 6 && (
                  <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted">
                    <ImagePlus className="size-5" aria-hidden />Ajouter
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => {
                      const files = Array.from(e.target.files ?? []).filter((f) => f.size <= 8 * 1024 * 1024).slice(0, 6 - photos.length);
                      setPhotos((ps) => [...ps, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
                      e.target.value = "";
                    }} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Alert tone="info" className="sm:col-span-2">Ces informations restent privées. Le voyageur ne les voit qu&apos;après le paiement de la réservation. Si vous indiquez un email, le destinataire recevra directement son code de réception.</Alert>
            <Field id="recipient.name" label="Nom du destinataire" error={err("recipient.name")?.message}><Input autoComplete="off" {...register("recipient.name")} /></Field>
            <Field id="recipient.phone" label="Téléphone du destinataire" hint="ex. +213550123456" error={err("recipient.phone")?.message}><Input type="tel" inputMode="tel" {...register("recipient.phone")} /></Field>
            <Field id="recipient.email" label="Email du destinataire" optional error={err("recipient.email")?.message}><Input type="email" {...register("recipient.email")} /></Field>
            <Field id="recipient.city" label="Ville / quartier de remise" error={err("recipient.city")?.message}><Input {...register("recipient.city")} /></Field>
            <Field id="recipient.instructions" label="Instructions de remise" optional className="sm:col-span-2" error={err("recipient.instructions")?.message}><Textarea rows={3} {...register("recipient.instructions")} /></Field>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="budget" label="Budget proposé (€)" hint="Prix que vous êtes prêt à payer pour le transport." error={err("budget")?.message}><NumberInput placeholder="ex. 40" {...register("budget")} /></Field>
            <Field id="currency" label="Devise"><Select {...register("currency")}><option value="EUR">Euro (€)</option></Select></Field>
            <div className="grid gap-2 rounded-xl bg-muted p-4 text-sm sm:col-span-2">
              <p className="font-semibold">Estimation</p>
              {fees ? (
                <dl className="grid gap-1.5 tabular">
                  <div className="flex justify-between"><dt>Prix du transport</dt><dd>{formatMoney(fees.transportPrice, "EUR")}</dd></div>
                  <div className="flex justify-between text-muted-foreground"><dt>Frais de plateforme ({rateBps / 100} %){feeModel === "TRAVELER_DEDUCTION" ? ", déduits de la rémunération du voyageur" : ""}</dt><dd>{formatMoney(fees.platformFee, "EUR")}</dd></div>
                  <div className="flex justify-between border-t pt-1.5 font-semibold"><dt>Total que vous payez</dt><dd>{formatMoney(fees.totalCharged, "EUR")}</dd></div>
                </dl>
              ) : <p className="text-muted-foreground">Saisissez un budget pour voir l&apos;estimation.</p>}
              <p className="text-xs text-muted-foreground">Le prix définitif est celui de la proposition que vous accepterez. Il est figé dès l&apos;acceptation.</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-5">
            <dl className="grid gap-3 rounded-xl bg-muted p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Trajet</dt><dd className="font-medium">{origin?.name} → {dest?.name}</dd></div>
              <div><dt className="text-muted-foreground">Date</dt><dd className="font-medium">{String(watch("desiredDate"))} (± {String(watch("dateFlexDays"))} j)</dd></div>
              <div><dt className="text-muted-foreground">Colis</dt><dd className="font-medium">{watch("title")} · {String(watch("weightGrams"))} kg · {String(watch("lengthCm"))}×{String(watch("widthCm"))}×{String(watch("heightCm"))} cm</dd></div>
              <div><dt className="text-muted-foreground">Catégorie</dt><dd className="font-medium">{category?.name}</dd></div>
              <div><dt className="text-muted-foreground">Destinataire</dt><dd className="font-medium">{watch("recipient.name")} ({watch("recipient.city")})</dd></div>
              <div><dt className="text-muted-foreground">Budget</dt><dd className="font-medium">{fees ? formatMoney(fees.totalCharged, "EUR") : "-"}</dd></div>
            </dl>
            <label className="flex items-start gap-3 text-sm"><Checkbox className="mt-0.5" checked={honor} onChange={(e) => setHonor(e.target.checked)} /><span>Je déclare sur l&apos;honneur que le contenu correspond exactement à la description, qu&apos;il ne contient aucun objet interdit ou réglementé non déclaré, et que la valeur déclarée est exacte.</span></label>
            <label className="flex items-start gap-3 text-sm"><Checkbox className="mt-0.5" checked={rules} onChange={(e) => setRules(e.target.checked)} /><span>J&apos;accepte les règles de transport et la liste des <a href="/objets-interdits" target="_blank" className="font-medium text-primary underline">objets interdits</a>. Le voyageur pourra vérifier le contenu lors de la remise.</span></label>
          </div>
        )}

        {serverError && <Alert tone="danger">{serverError}</Alert>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft />Retour</Button>
          <div className="flex flex-wrap gap-2">
            {!initial?.published && <Button type="button" variant="outline" loading={submitting === "draft"} disabled={!!submitting} onClick={() => submit(false)}>Enregistrer le brouillon</Button>}
            {step < 4 ? (
              <Button type="button" onClick={next}>Continuer<ArrowRight /></Button>
            ) : (
              <Button type="button" loading={submitting === "publish"} disabled={!!submitting} onClick={() => submit(true)}><Check />{initial?.published ? "Enregistrer les modifications" : "Publier l'annonce"}</Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
