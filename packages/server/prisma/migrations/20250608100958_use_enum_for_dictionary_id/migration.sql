/*
  Warnings:

  - The primary key for the `Dictionary` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Definition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "wordId" INTEGER NOT NULL,
    "dictionaryId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "dataFormat" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Definition_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Definition_dictionaryId_fkey" FOREIGN KEY ("dictionaryId") REFERENCES "Dictionary" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Definition" ("createdAt", "data", "dataFormat", "dictionaryId", "id", "wordId") SELECT "createdAt", "data", "dataFormat", "dictionaryId", "id", "wordId" FROM "Definition";
DROP TABLE "Definition";
ALTER TABLE "new_Definition" RENAME TO "Definition";
CREATE TABLE "new_Dictionary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);
INSERT INTO "new_Dictionary" ("id", "name") SELECT "id", "name" FROM "Dictionary";
DROP TABLE "Dictionary";
ALTER TABLE "new_Dictionary" RENAME TO "Dictionary";
CREATE UNIQUE INDEX "Dictionary_name_key" ON "Dictionary"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
