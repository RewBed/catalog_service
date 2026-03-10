-- CreateTable
CREATE TABLE "InboxEvent" (
    "eventId" VARCHAR(128) NOT NULL,
    "topic" VARCHAR(150) NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "eventVersion" INTEGER NOT NULL,
    "externalId" VARCHAR(255),
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE INDEX "InboxEvent_topic_processedAt_idx" ON "InboxEvent"("topic", "processedAt");
