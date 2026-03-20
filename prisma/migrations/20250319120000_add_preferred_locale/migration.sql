-- CreateEnum
CREATE TYPE "PreferredLocale" AS ENUM ('en', 'fa');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "preferredLocale" "PreferredLocale" NOT NULL DEFAULT 'fa';
