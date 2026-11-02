-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'declined', 'withdrawn');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('collecting_support', 'under_review', 'in_progress', 'delivered', 'waiting');

-- CreateEnum
CREATE TYPE "IdeaCategory" AS ENUM ('dining', 'campus_planning', 'campus_services', 'green_initiatives', 'sustainability');

-- CreateEnum
CREATE TYPE "IdeaScale" AS ENUM ('small', 'medium', 'large');

-- CreateEnum
CREATE TYPE "CostBand" AS ENUM ('under_1k', 'from_1k_to_5k', 'over_5k');

-- CreateEnum
CREATE TYPE "TimeHorizon" AS ENUM ('this_semester', 'next_semester', 'within_a_year');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('approved', 'declined');

-- CreateEnum
CREATE TYPE "ReviewKind" AS ENUM ('review', 'take_down');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('new', 'contacted', 'joined', 'later');

-- CreateEnum
CREATE TYPE "UpdateKind" AS ENUM ('board', 'check_in', 'system');

-- CreateEnum
CREATE TYPE "StudentLevel" AS ENUM ('undergraduate', 'graduate');

-- CreateEnum
CREATE TYPE "DigestFrequency" AS ENUM ('weekly', 'as_it_happens', 'off');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('post_decided', 'reviewer_reminder', 'digest');

-- CreateEnum
CREATE TYPE "AccessKind" AS ENUM ('author', 'supporters', 'participants');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "student_level" "StudentLevel",
    "major" TEXT,
    "positions_seen" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "positions_seen_at" TIMESTAMP(3),
    "email_stopped_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "IdeaCategory" NOT NULL,
    "chair_position_key" TEXT NOT NULL,
    "member_position_key" TEXT NOT NULL,
    "in_progress_guideline" INTEGER NOT NULL DEFAULT 2,
    "update_cadence_days" INTEGER NOT NULL DEFAULT 30,
    "join_meets" TEXT,
    "join_commitment" TEXT,
    "join_how_to_apply" TEXT,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ideas" (
    "id" UUID NOT NULL,
    "number" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "full_text" TEXT,
    "category" "IdeaCategory" NOT NULL,
    "board_id" TEXT NOT NULL,
    "location" TEXT,
    "scale" "IdeaScale",
    "cost_band" "CostBand",
    "time_horizon" "TimeHorizon",
    "author_id" UUID,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "from_sga" BOOLEAN NOT NULL DEFAULT false,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "status" "IdeaStatus",
    "waiting_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "status_changed_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_revisions" (
    "id" UUID NOT NULL,
    "idea_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "full_text" TEXT,
    "category" "IdeaCategory" NOT NULL,
    "location" TEXT,
    "scale" "IdeaScale",
    "cost_band" "CostBand",
    "time_horizon" "TimeHorizon",
    "is_anonymous" BOOLEAN NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "idea_id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "kind" "ReviewKind" NOT NULL DEFAULT 'review',
    "decision" "ReviewDecision" NOT NULL,
    "reason" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supports" (
    "user_id" UUID NOT NULL,
    "idea_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supports_pkey" PRIMARY KEY ("user_id","idea_id")
);

-- CreateTable
CREATE TABLE "participations" (
    "user_id" UUID NOT NULL,
    "idea_id" UUID NOT NULL,
    "contact_status" "ContactStatus" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participations_pkey" PRIMARY KEY ("user_id","idea_id")
);

-- CreateTable
CREATE TABLE "follows" (
    "user_id" UUID NOT NULL,
    "idea_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("user_id","idea_id")
);

-- CreateTable
CREATE TABLE "updates" (
    "id" UUID NOT NULL,
    "idea_id" UUID NOT NULL,
    "author_id" UUID,
    "kind" "UpdateKind" NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_preferences" (
    "user_id" UUID NOT NULL,
    "digest_frequency" "DigestFrequency" NOT NULL DEFAULT 'weekly',
    "digest_weekday" INTEGER NOT NULL,
    "last_digest_at" TIMESTAMP(3),
    "unsubscribed_at" TIMESTAMP(3),
    "bounced_at" TIMESTAMP(3),

    CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "email_outbox" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "EmailType" NOT NULL,
    "priority" INTEGER NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "send_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "provider_message_id" TEXT,
    "last_error" TEXT,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "send_budget" (
    "day" DATE NOT NULL,
    "sent_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "send_budget_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "access_log" (
    "id" UUID NOT NULL,
    "viewer_id" UUID,
    "idea_id" UUID NOT NULL,
    "what" "AccessKind" NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "boards_category_key" ON "boards"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ideas_number_key" ON "ideas"("number");

-- CreateIndex
CREATE INDEX "ideas_review_status_board_id_submitted_at_idx" ON "ideas"("review_status", "board_id", "submitted_at");

-- CreateIndex
CREATE INDEX "ideas_status_board_id_idx" ON "ideas"("status", "board_id");

-- CreateIndex
CREATE INDEX "ideas_author_id_review_status_idx" ON "ideas"("author_id", "review_status");

-- CreateIndex
CREATE UNIQUE INDEX "idea_revisions_idea_id_version_key" ON "idea_revisions"("idea_id", "version");

-- CreateIndex
CREATE INDEX "reviews_idea_id_decided_at_idx" ON "reviews"("idea_id", "decided_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_revision_id_kind_key" ON "reviews"("revision_id", "kind");

-- CreateIndex
CREATE INDEX "supports_idea_id_idx" ON "supports"("idea_id");

-- CreateIndex
CREATE INDEX "participations_idea_id_idx" ON "participations"("idea_id");

-- CreateIndex
CREATE INDEX "follows_idea_id_idx" ON "follows"("idea_id");

-- CreateIndex
CREATE INDEX "updates_idea_id_created_at_idx" ON "updates"("idea_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "email_outbox_dedupe_key_key" ON "email_outbox"("dedupe_key");

-- CreateIndex
CREATE INDEX "email_outbox_sent_at_priority_created_at_idx" ON "email_outbox"("sent_at", "priority", "created_at");

-- CreateIndex
CREATE INDEX "access_log_idea_id_viewed_at_idx" ON "access_log"("idea_id", "viewed_at");

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_revisions" ADD CONSTRAINT "idea_revisions_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "idea_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supports" ADD CONSTRAINT "supports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supports" ADD CONSTRAINT "supports_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "updates" ADD CONSTRAINT "updates_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "updates" ADD CONSTRAINT "updates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
