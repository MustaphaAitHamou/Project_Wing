-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CorridorStatus" AS ENUM ('DISABLED', 'TEST_ONLY', 'LIVE');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('PLANE', 'CAR', 'FERRY', 'TRAIN', 'BUS', 'OTHER');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'FULL', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ParcelStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'RESERVED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProposalInitiator" AS ENUM ('TRAVELER', 'SENDER');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'AWAITING_VERIFICATION', 'ACCEPTED', 'AWAITING_PAYMENT', 'PAID', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('REQUIRES_PAYMENT', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'BLOCKED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('ESTIMATED', 'EARNED', 'REVERSED');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "DeliveryEventType" AS ENUM ('PARCEL_CREATED', 'TRAVELER_SELECTED', 'BOOKING_CONFIRMED', 'PAYMENT_CONFIRMED', 'PICKUP_CODE_SENT', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'OUT_FOR_DELIVERY', 'DELIVERY_CODE_SENT', 'DELIVERED', 'COMPLETED', 'INCIDENT_REPORTED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_MESSAGE', 'NEW_PROPOSAL', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'MATCHING_TRIP', 'MATCHING_PARCEL', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'PARCEL_PICKED_UP', 'PARCEL_DELIVERED', 'DISPUTE_OPENED', 'DISPUTE_UPDATED', 'REVIEW_RECEIVED', 'VERIFICATION_APPROVED', 'VERIFICATION_REJECTED', 'BOOKING_UPDATED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'FLAGGED');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('LOST', 'DAMAGED', 'NOT_AS_DESCRIBED', 'TRAVELER_NO_SHOW', 'SENDER_NO_SHOW', 'RECIPIENT_UNAVAILABLE', 'DELAY', 'PAYMENT_CONTESTED', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'WAITING_FOR_INFORMATION', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisputeResolution" AS ENUM ('FULL_REFUND', 'PARTIAL_REFUND', 'RELEASE_PAYOUT', 'NO_ACTION');

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('USER', 'PARCEL', 'TRIP', 'MESSAGE', 'REVIEW');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "twoFactorEnabled" BOOLEAN DEFAULT false,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "countryCode" CHAR(2),
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspendedReason" TEXT,
    "termsAcceptedAt" TIMESTAMP(3),
    "locale" TEXT NOT NULL DEFAULT 'fr',

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN DEFAULT true,
    "failedVerificationCount" INTEGER DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "userId" TEXT NOT NULL,
    "bio" VARCHAR(600),
    "city" VARCHAR(120),
    "avatarKey" TEXT,
    "ratingSum" INTEGER NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "deliveriesCount" INTEGER NOT NULL DEFAULT 0,
    "shipmentsCount" INTEGER NOT NULL DEFAULT 0,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "notificationPrefs" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "identity_verification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "identity_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_block" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_block_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateTable
CREATE TABLE "country" (
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "phonePrefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "country_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "city" (
    "id" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "searchNames" TEXT[],
    "aliases" TEXT[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "city_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corridor" (
    "id" TEXT NOT NULL,
    "originCountry" CHAR(2) NOT NULL,
    "destCountry" CHAR(2) NOT NULL,
    "status" "CorridorStatus" NOT NULL DEFAULT 'DISABLED',
    "allowedModes" "TransportMode"[],
    "maxWeightGrams" INTEGER NOT NULL DEFAULT 23000,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corridor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcel_category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isProhibited" BOOLEAN NOT NULL DEFAULT false,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "allowedModes" "TransportMode"[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "parcel_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip" (
    "id" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "originCityId" TEXT NOT NULL,
    "destCityId" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "arrivalDate" DATE,
    "transportMode" "TransportMode" NOT NULL,
    "capacityGrams" INTEGER NOT NULL,
    "reservedGrams" INTEGER NOT NULL DEFAULT 0,
    "capacityVolumeCm3" INTEGER,
    "reservedVolumeCm3" INTEGER NOT NULL DEFAULT 0,
    "pricePerKg" INTEGER NOT NULL,
    "minPrice" INTEGER NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL,
    "acceptsFragile" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(2000),
    "conditions" VARCHAR(2000),
    "status" "TripStatus" NOT NULL DEFAULT 'PUBLISHED',
    "moderationNote" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcel" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "originCityId" TEXT NOT NULL,
    "destCityId" TEXT NOT NULL,
    "desiredDate" DATE NOT NULL,
    "dateFlexDays" INTEGER NOT NULL DEFAULT 0,
    "title" VARCHAR(120) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "lengthCm" INTEGER NOT NULL,
    "widthCm" INTEGER NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "declaredValue" INTEGER NOT NULL,
    "isFragile" BOOLEAN NOT NULL DEFAULT false,
    "specialConditions" VARCHAR(1000),
    "budget" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "ParcelStatus" NOT NULL DEFAULT 'DRAFT',
    "honorDeclarationAt" TIMESTAMP(3),
    "rulesAcceptedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "moderationNote" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcel_recipient" (
    "parcelId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(200),
    "city" VARCHAR(120) NOT NULL,
    "instructions" VARCHAR(1000),

    CONSTRAINT "parcel_recipient_pkey" PRIMARY KEY ("parcelId")
);

-- CreateTable
CREATE TABLE "parcel_photo" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcel_photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "initiatedBy" "ProposalInitiator" NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "message" VARCHAR(1000),
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "transportPrice" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "commissionRateBps" INTEGER NOT NULL,
    "travelerNet" INTEGER NOT NULL,
    "totalCharged" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "volumeCm3" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "acceptedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSessionId" TEXT,
    "providerPaymentId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'REQUIRES_PAYMENT',
    "failureReason" TEXT,
    "receiptNumber" TEXT,
    "amountRefunded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "succeededAt" TIMESTAMP(3),

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_event" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "paymentId" TEXT,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "providerRefundId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "initiatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "provider" TEXT NOT NULL,
    "providerTransferId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "blockedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'ESTIMATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_event" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "DeliveryEventType" NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_verification" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "qrTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "sendCount" INTEGER NOT NULL DEFAULT 1,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "parcelId" TEXT,
    "tripId" TEXT,
    "contextKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participant" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participant_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "attachmentKey" TEXT,
    "attachmentMime" TEXT,
    "attachmentName" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_log" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT,
    "template" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(1000),
    "status" "ReviewStatus" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "type" "DisputeType" NOT NULL,
    "description" VARCHAR(4000) NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "previousBookingStatus" "BookingStatus" NOT NULL,
    "resolution" "DisputeResolution",
    "refundAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_evidence" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_event" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "note" VARCHAR(4000),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" VARCHAR(120) NOT NULL,
    "details" VARCHAR(2000),
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "faq_item" (
    "id" TEXT NOT NULL,
    "question" VARCHAR(300) NOT NULL,
    "answer" VARCHAR(4000) NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_bucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_limit_bucket_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "user_status_idx" ON "user"("status");

-- CreateIndex
CREATE INDEX "user_createdAt_idx" ON "user"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "twoFactor_userId_idx" ON "twoFactor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "rateLimit_key_key" ON "rateLimit"("key");

-- CreateIndex
CREATE UNIQUE INDEX "identity_verification_providerRef_key" ON "identity_verification"("providerRef");

-- CreateIndex
CREATE INDEX "identity_verification_userId_createdAt_idx" ON "identity_verification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "city_slug_key" ON "city"("slug");

-- CreateIndex
CREATE INDEX "city_countryCode_idx" ON "city"("countryCode");

-- CreateIndex
CREATE INDEX "city_searchNames_idx" ON "city" USING GIN ("searchNames");

-- CreateIndex
CREATE UNIQUE INDEX "corridor_originCountry_destCountry_key" ON "corridor"("originCountry", "destCountry");

-- CreateIndex
CREATE UNIQUE INDEX "parcel_category_slug_key" ON "parcel_category"("slug");

-- CreateIndex
CREATE INDEX "trip_status_originCityId_destCityId_departureDate_idx" ON "trip"("status", "originCityId", "destCityId", "departureDate");

-- CreateIndex
CREATE INDEX "trip_status_departureDate_idx" ON "trip"("status", "departureDate");

-- CreateIndex
CREATE INDEX "trip_travelerId_createdAt_idx" ON "trip"("travelerId", "createdAt");

-- CreateIndex
CREATE INDEX "parcel_status_originCityId_destCityId_desiredDate_idx" ON "parcel"("status", "originCityId", "destCityId", "desiredDate");

-- CreateIndex
CREATE INDEX "parcel_status_desiredDate_idx" ON "parcel"("status", "desiredDate");

-- CreateIndex
CREATE INDEX "parcel_senderId_createdAt_idx" ON "parcel"("senderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "parcel_photo_storageKey_key" ON "parcel_photo"("storageKey");

-- CreateIndex
CREATE INDEX "parcel_photo_parcelId_idx" ON "parcel_photo"("parcelId");

-- CreateIndex
CREATE INDEX "proposal_parcelId_status_idx" ON "proposal"("parcelId", "status");

-- CreateIndex
CREATE INDEX "proposal_travelerId_status_idx" ON "proposal"("travelerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_parcelId_tripId_key" ON "proposal"("parcelId", "tripId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_reference_key" ON "booking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "booking_proposalId_key" ON "booking"("proposalId");

-- CreateIndex
CREATE INDEX "booking_senderId_createdAt_idx" ON "booking"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "booking_travelerId_createdAt_idx" ON "booking"("travelerId", "createdAt");

-- CreateIndex
CREATE INDEX "booking_status_idx" ON "booking"("status");

-- CreateIndex
CREATE INDEX "booking_parcelId_idx" ON "booking"("parcelId");

-- CreateIndex
CREATE INDEX "booking_tripId_idx" ON "booking"("tripId");

-- CreateIndex
CREATE INDEX "booking_status_history_bookingId_createdAt_idx" ON "booking_status_history"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payout_account_providerAccountId_key" ON "payout_account"("providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "payout_account_userId_provider_key" ON "payout_account"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "payment_providerSessionId_key" ON "payment"("providerSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_providerPaymentId_key" ON "payment"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_idempotencyKey_key" ON "payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "payment_receiptNumber_key" ON "payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "payment_bookingId_idx" ON "payment"("bookingId");

-- CreateIndex
CREATE INDEX "payment_status_createdAt_idx" ON "payment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_event_provider_providerEventId_key" ON "payment_event"("provider", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "refund_providerRefundId_key" ON "refund"("providerRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "refund_idempotencyKey_key" ON "refund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "refund_paymentId_idx" ON "refund"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payout_bookingId_key" ON "payout"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "payout_providerTransferId_key" ON "payout"("providerTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "payout_idempotencyKey_key" ON "payout"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payout_travelerId_status_idx" ON "payout"("travelerId", "status");

-- CreateIndex
CREATE INDEX "payout_status_idx" ON "payout"("status");

-- CreateIndex
CREATE UNIQUE INDEX "commission_bookingId_key" ON "commission"("bookingId");

-- CreateIndex
CREATE INDEX "commission_status_createdAt_idx" ON "commission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "delivery_event_bookingId_createdAt_idx" ON "delivery_event"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_verification_qrTokenHash_key" ON "delivery_verification"("qrTokenHash");

-- CreateIndex
CREATE INDEX "delivery_verification_bookingId_purpose_createdAt_idx" ON "delivery_verification"("bookingId", "purpose", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_bookingId_key" ON "conversation"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_contextKey_key" ON "conversation"("contextKey");

-- CreateIndex
CREATE INDEX "conversation_lastMessageAt_idx" ON "conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "conversation_participant_userId_idx" ON "conversation_participant"("userId");

-- CreateIndex
CREATE INDEX "message_conversationId_createdAt_idx" ON "message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_createdAt_idx" ON "notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "job_dedupeKey_key" ON "job"("dedupeKey");

-- CreateIndex
CREATE INDEX "job_status_runAt_idx" ON "job"("status", "runAt");

-- CreateIndex
CREATE INDEX "email_log_to_createdAt_idx" ON "email_log"("to", "createdAt");

-- CreateIndex
CREATE INDEX "review_subjectId_status_createdAt_idx" ON "review"("subjectId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_bookingId_authorId_key" ON "review"("bookingId", "authorId");

-- CreateIndex
CREATE INDEX "dispute_status_createdAt_idx" ON "dispute"("status", "createdAt");

-- CreateIndex
CREATE INDEX "dispute_bookingId_idx" ON "dispute"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "dispute_evidence_storageKey_key" ON "dispute_evidence"("storageKey");

-- CreateIndex
CREATE INDEX "dispute_evidence_disputeId_idx" ON "dispute_evidence"("disputeId");

-- CreateIndex
CREATE INDEX "dispute_event_disputeId_createdAt_idx" ON "dispute_event"("disputeId", "createdAt");

-- CreateIndex
CREATE INDEX "report_status_createdAt_idx" ON "report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "report_targetType_targetId_idx" ON "report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "audit_log_targetType_targetId_idx" ON "audit_log"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_log_actorId_createdAt_idx" ON "audit_log"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "rate_limit_bucket_windowStart_idx" ON "rate_limit_bucket"("windowStart");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verification" ADD CONSTRAINT "identity_verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city" ADD CONSTRAINT "city_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corridor" ADD CONSTRAINT "corridor_originCountry_fkey" FOREIGN KEY ("originCountry") REFERENCES "country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corridor" ADD CONSTRAINT "corridor_destCountry_fkey" FOREIGN KEY ("destCountry") REFERENCES "country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES "city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_destCityId_fkey" FOREIGN KEY ("destCityId") REFERENCES "city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel" ADD CONSTRAINT "parcel_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel" ADD CONSTRAINT "parcel_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES "city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel" ADD CONSTRAINT "parcel_destCityId_fkey" FOREIGN KEY ("destCityId") REFERENCES "city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel" ADD CONSTRAINT "parcel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "parcel_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel_recipient" ADD CONSTRAINT "parcel_recipient_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel_photo" ADD CONSTRAINT "parcel_photo_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_account" ADD CONSTRAINT "payout_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_event" ADD CONSTRAINT "payment_event_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout" ADD CONSTRAINT "payout_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout" ADD CONSTRAINT "payout_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission" ADD CONSTRAINT "commission_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_event" ADD CONSTRAINT "delivery_event_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_verification" ADD CONSTRAINT "delivery_verification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_event" ADD CONSTRAINT "dispute_event_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ───────── Contraintes d'intégrité métier (ajoutées manuellement) ─────────
-- Capacité : impossible de réserver plus que la capacité annoncée, même en cas de requêtes concurrentes.
ALTER TABLE "trip" ADD CONSTRAINT "trip_capacity_positive" CHECK ("capacityGrams" > 0);
ALTER TABLE "trip" ADD CONSTRAINT "trip_reserved_within_capacity" CHECK ("reservedGrams" >= 0 AND "reservedGrams" <= "capacityGrams");
ALTER TABLE "trip" ADD CONSTRAINT "trip_reserved_volume_within_capacity" CHECK ("reservedVolumeCm3" >= 0 AND ("capacityVolumeCm3" IS NULL OR "reservedVolumeCm3" <= "capacityVolumeCm3"));
ALTER TABLE "trip" ADD CONSTRAINT "trip_price_non_negative" CHECK ("pricePerKg" >= 0 AND "minPrice" >= 0);
ALTER TABLE "trip" ADD CONSTRAINT "trip_dates_ordered" CHECK ("arrivalDate" IS NULL OR "arrivalDate" >= "departureDate");
ALTER TABLE "trip" ADD CONSTRAINT "trip_distinct_cities" CHECK ("originCityId" <> "destCityId");

ALTER TABLE "parcel" ADD CONSTRAINT "parcel_positive_dimensions" CHECK ("weightGrams" > 0 AND "lengthCm" > 0 AND "widthCm" > 0 AND "heightCm" > 0 AND "quantity" > 0);
ALTER TABLE "parcel" ADD CONSTRAINT "parcel_amounts_non_negative" CHECK ("budget" >= 0 AND "declaredValue" >= 0);
ALTER TABLE "parcel" ADD CONSTRAINT "parcel_distinct_cities" CHECK ("originCityId" <> "destCityId");

ALTER TABLE "proposal" ADD CONSTRAINT "proposal_price_positive" CHECK ("price" > 0);

ALTER TABLE "booking" ADD CONSTRAINT "booking_amounts_consistent" CHECK (
  "transportPrice" > 0 AND "platformFee" >= 0 AND "travelerNet" >= 0 AND "totalCharged" >= "transportPrice"
);
-- Une seule réservation active par colis.
CREATE UNIQUE INDEX "booking_one_active_per_parcel" ON "booking" ("parcelId")
  WHERE "status" NOT IN ('CANCELLED', 'REFUNDED');

ALTER TABLE "payment" ADD CONSTRAINT "payment_amounts" CHECK ("amount" > 0 AND "amountRefunded" >= 0 AND "amountRefunded" <= "amount");
-- Un seul paiement réussi par réservation.
CREATE UNIQUE INDEX "payment_one_success_per_booking" ON "payment" ("bookingId")
  WHERE "status" IN ('SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED');
ALTER TABLE "refund" ADD CONSTRAINT "refund_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "payout" ADD CONSTRAINT "payout_amount_non_negative" CHECK ("amount" >= 0);

ALTER TABLE "review" ADD CONSTRAINT "review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "review" ADD CONSTRAINT "review_not_self" CHECK ("authorId" <> "subjectId");
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_not_self" CHECK ("blockerId" <> "blockedId");

ALTER TABLE "delivery_verification" ADD CONSTRAINT "delivery_verification_attempts" CHECK ("attempts" >= 0 AND "attempts" <= "maxAttempts");
-- Un seul code actif (non consommé, non invalidé) par réservation et par étape.
CREATE UNIQUE INDEX "delivery_verification_one_active" ON "delivery_verification" ("bookingId", "purpose")
  WHERE "consumedAt" IS NULL AND "invalidatedAt" IS NULL;
