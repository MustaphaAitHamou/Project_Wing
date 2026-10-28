import { Badge } from "@/components/ui/badge";
import { BOOKING_STATUS_LABELS, type BookingState } from "@/lib/domain/booking-state";
import { PARCEL_STATUS_LABELS } from "@/features/parcels/schemas";
import { TRIP_STATUS_LABELS } from "@/features/trips/schemas";

type Tone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger";

const bookingTone: Record<BookingState, Tone> = {
  PENDING: "neutral", AWAITING_VERIFICATION: "warning", ACCEPTED: "primary", AWAITING_PAYMENT: "warning", PAID: "primary", READY_FOR_PICKUP: "primary",
  PICKED_UP: "accent", IN_TRANSIT: "accent", OUT_FOR_DELIVERY: "accent", DELIVERED: "success", COMPLETED: "success", CANCELLED: "neutral", DISPUTED: "danger", REFUNDED: "neutral",
};
const parcelTone: Record<keyof typeof PARCEL_STATUS_LABELS, Tone> = { DRAFT: "neutral", PENDING_REVIEW: "warning", PUBLISHED: "primary", RESERVED: "accent", IN_TRANSIT: "accent", DELIVERED: "success", CANCELLED: "neutral", EXPIRED: "neutral", SUSPENDED: "danger" };
const tripTone: Record<keyof typeof TRIP_STATUS_LABELS, Tone> = { DRAFT: "neutral", PUBLISHED: "primary", FULL: "accent", COMPLETED: "success", CANCELLED: "neutral", EXPIRED: "neutral", SUSPENDED: "danger" };

export const BookingStatusBadge = ({ status }: { status: BookingState }) => <Badge tone={bookingTone[status]}>{BOOKING_STATUS_LABELS[status]}</Badge>;
export const ParcelStatusBadge = ({ status }: { status: keyof typeof PARCEL_STATUS_LABELS }) => <Badge tone={parcelTone[status]}>{PARCEL_STATUS_LABELS[status]}</Badge>;
export const TripStatusBadge = ({ status }: { status: keyof typeof TRIP_STATUS_LABELS }) => <Badge tone={tripTone[status]}>{TRIP_STATUS_LABELS[status]}</Badge>;
