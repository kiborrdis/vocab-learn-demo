/*
  Warnings:

  - You are about to drop the column `correctCount` on the `UserWordStatus` table. All the data in the column will be lost.
  - You are about to drop the column `incorrectCount` on the `UserWordStatus` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserWordStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userWordId" INTEGER NOT NULL,
    "lastReviewed" DATETIME,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserWordStatus_userWordId_fkey" FOREIGN KEY ("userWordId") REFERENCES "UserWord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserWordStatus" ("createdAt", "id", "lastReviewed", "updatedAt", "userWordId") SELECT "createdAt", "id", "lastReviewed", "updatedAt", "userWordId" FROM "UserWordStatus";
DROP TABLE "UserWordStatus";
ALTER TABLE "new_UserWordStatus" RENAME TO "UserWordStatus";
CREATE UNIQUE INDEX "UserWordStatus_userWordId_key" ON "UserWordStatus"("userWordId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
