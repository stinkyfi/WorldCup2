-- CreateTable
CREATE TABLE "oracle_posts" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "tx_hash" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oracle_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oracle_errors" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "group_id" INTEGER,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oracle_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_oracle_posts_chain_group" ON "oracle_posts"("chain_id", "group_id");

-- CreateIndex
CREATE INDEX "idx_oracle_posts_posted_at" ON "oracle_posts"("posted_at");

-- CreateIndex
CREATE INDEX "idx_oracle_errors_chain_time" ON "oracle_errors"("chain_id", "created_at");
