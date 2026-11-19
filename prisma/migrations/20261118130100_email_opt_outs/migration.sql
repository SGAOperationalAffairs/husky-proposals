-- CreateTable
-- A type of email a student turned off. No row means on (#211). Additive only.
CREATE TABLE "email_opt_outs" (
    "user_id" UUID NOT NULL,
    "type" "EmailType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_opt_outs_pkey" PRIMARY KEY ("user_id","type")
);

-- AddForeignKey
ALTER TABLE "email_opt_outs" ADD CONSTRAINT "email_opt_outs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
