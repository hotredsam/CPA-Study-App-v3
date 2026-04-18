-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CpaSection" ADD VALUE 'BAR';
ALTER TYPE "CpaSection" ADD VALUE 'ISC';
ALTER TYPE "CpaSection" ADD VALUE 'TCP';

-- AlterTable
ALTER TABLE "Recording" ALTER COLUMN "r2Key" DROP NOT NULL;
