-- AlterTable
ALTER TABLE "email_outbox" ADD COLUMN     "bounced_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "email_outbox_provider_message_id_idx" ON "email_outbox"("provider_message_id");
