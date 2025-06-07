-- CreateTable
CREATE TABLE "UserWordStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userWordId" INTEGER NOT NULL,
    "lastReviewed" DATETIME,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserWordStatus_userWordId_fkey" FOREIGN KEY ("userWordId") REFERENCES "UserWord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWordStatus_userWordId_key" ON "UserWordStatus"("userWordId");
