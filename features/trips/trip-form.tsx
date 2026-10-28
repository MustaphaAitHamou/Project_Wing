"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { CityCombobox, type CityOption } from "@/components/marketplace/city-combobox";
import { TRANSPORT_MODES, TRANSPORT_MODE_LABELS } from "@/features/shared/schemas";
import { computeFees, formatMoney, parseAmountToMinor, type FeeModel } from "@/lib/domain/money";
import { toDateInput } from "@/lib/utils";
import { tripInputSchema, type TripFormValues, type TripInput } from "./schemas";
import { saveTripAction } from "./actions";

export function TripForm({ rateBps, feeModel, initial }: { rateBps: number; feeModel: FeeModel; initial?: { id: string; values: Partial<TripFormValues>; origin: CityOption; dest: CityOption } }) {
  const router = useRouter();
  const [origin, setOrigin] = React.useState<CityOption | null>(initial?.origin ?? null);
  const [dest, setDest] = React.useState<CityOption | null>(initial?.dest ?? null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<TripFormValues, unknown, TripInput>({
    resolver: zodResolver(tripInputSchema),
    mode: "onTouched",
    defaultValues: { originCityId: "", destCityId: "", departureDate: "", arrivalDate: "", transportMode: "PLANE", capacityGrams: "" as never, capacityVolumeL: "", pricePerKg: "", minPrice: "", currency: "EUR", acceptsFragile: false, description: "", conditions: "", ...initial?.values },
  });
  const { register, formState: { errors, isSubmitting }, setValue, watch } = form;
  const ppk = parseAmountToMinor(String(watch("pricePerKg") ?? "")) ?? 0;
  const example = ppk > 0 ? computeFees(Math.max(ppk * 5, parseAmountToMinor(String(watch("minPrice") ?? "")) ?? 0), rateBps, feeModel) : null;

  const onSubmit = form.handleSubmit(async () => {
    setServerError(null);
    const res = await saveTripAction({ id: initial?.id, data: form.getValues() as never });
    if (!res.ok) {
      setServerError(res.error);
      for (const [k, v] of Object.entries(res.fieldErrors ?? {})) form.setError(k.replace(/^data\./, "") as FieldPath<TripFormValues>, { message: v[0] });
      return;
    }
    toast.success(initial ? "Trajet mis à jour" : "Trajet publié");
    router.push(`/tableau-de-bord/trajets/${res.data.id}`);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="originCityId" label="Ville de départ" error={errors.originCityId?.message}>
          <CityCombobox id="originCityId" value={origin} onChange={(c) => { setOrigin(c); setValue("originCityId", c?.id ?? "", { shouldValidate: !!c }); }} placeholder="ex. Paris" />
        </Field>
        <Field id="destCityId" label="Ville de destination" error={errors.destCityId?.message}>
          <CityCombobox id="destCityId" value={dest} onChange={(c) => { setDest(c); setValue("destCityId", c?.id ?? "", { shouldValidate: !!c }); }} placeholder="ex. Tizi Ouzou" />
        </Field>
        <Field id="departureDate" label="Date de départ" error={errors.departureDate?.message}><Input type="date" min={toDateInput(new Date())} {...register("departureDate")} /></Field>
        <Field id="arrivalDate" label="Date d'arrivée estimée" optional error={errors.arrivalDate?.message}><Input type="date" min={toDateInput(new Date())} {...register("arrivalDate")} /></Field>
        <Field id="transportMode" label="Moyen de transport" error={errors.transportMode?.message}>
          <Select {...register("transportMode")}>{TRANSPORT_MODES.map((m) => <option key={m} value={m}>{TRANSPORT_MODE_LABELS[m]}</option>)}</Select>
        </Field>
        <label className="flex items-center gap-3 self-end rounded-lg border px-3 py-3 text-sm"><Checkbox {...register("acceptsFragile")} />J&apos;accepte les colis fragiles</label>
        <Field id="capacityGrams" label="Poids disponible (kg)" error={errors.capacityGrams?.message}><Input type="number" inputMode="decimal" step="0.5" min="0.5" {...register("capacityGrams")} /></Field>
        <Field id="capacityVolumeL" label="Volume disponible (litres)" optional hint="Une valise cabine fait environ 40 L." error={errors.capacityVolumeL?.message}><Input type="number" inputMode="numeric" min="1" {...register("capacityVolumeL")} /></Field>
        <Field id="pricePerKg" label="Prix demandé par kg (€)" error={errors.pricePerKg?.message}><Input inputMode="decimal" placeholder="ex. 8" {...register("pricePerKg")} /></Field>
        <Field id="minPrice" label="Prix minimum par colis (€)" optional error={errors.minPrice?.message}><Input inputMode="decimal" placeholder="ex. 15" {...register("minPrice")} /></Field>
      </div>
      {example && (
        <div className="rounded-xl bg-muted p-4 text-sm">
          <p className="mb-2 font-semibold">Exemple pour un colis de 5 kg</p>
          <dl className="grid gap-1 tabular">
            <div className="flex justify-between"><dt>Prix du transport</dt><dd>{formatMoney(example.transportPrice, "EUR")}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>Frais de plateforme ({rateBps / 100} %)</dt><dd>{feeModel === "TRAVELER_DEDUCTION" ? "−" : ""}{formatMoney(example.platformFee, "EUR")}</dd></div>
            <div className="flex justify-between border-t pt-1 font-semibold"><dt>Montant net estimé pour vous</dt><dd>{formatMoney(example.travelerNet, "EUR")}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">Hors éventuels frais du prestataire de paiement pour le versement.</p>
        </div>
      )}
      <Field id="description" label="Description" optional hint="Lieu et horaires de récupération possibles, contraintes…" error={errors.description?.message}><Textarea rows={3} {...register("description")} /></Field>
      <Field id="conditions" label="Conditions de transport" optional error={errors.conditions?.message}><Textarea rows={2} {...register("conditions")} placeholder="ex. Colis ouvert pour vérification à la remise, pas de liquides." /></Field>
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <div className="flex justify-end border-t pt-5"><Button type="submit" size="lg" loading={isSubmitting}>{initial ? "Enregistrer" : "Publier le trajet"}</Button></div>
    </form>
  );
}
