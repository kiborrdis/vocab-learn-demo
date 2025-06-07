/*
  Warnings:

  - Added the required column `dataFormat` to the `Definition` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Definition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "wordId" INTEGER NOT NULL,
    "dictionaryId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "dataFormat" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Definition_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Definition_dictionaryId_fkey" FOREIGN KEY ("dictionaryId") REFERENCES "Dictionary" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Definition" ("createdAt", "data", "dictionaryId", "id", "wordId") SELECT "createdAt", "data", "dictionaryId", "id", "wordId" FROM "Definition";
DROP TABLE "Definition";
ALTER TABLE "new_Definition" RENAME TO "Definition";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
