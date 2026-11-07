-- CreateTable
CREATE TABLE "action_counts" (
    "user_id" UUID NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "action_counts_pkey" PRIMARY KEY ("user_id","window_start")
);

-- AddForeignKey
ALTER TABLE "action_counts" ADD CONSTRAINT "action_counts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
