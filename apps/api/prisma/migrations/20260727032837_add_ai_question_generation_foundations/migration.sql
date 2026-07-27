-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('BANK', 'AI_GENERATED');

-- AlterTable
ALTER TABLE "interview_answers" ADD COLUMN     "rawModelOutput" JSONB;

-- AlterTable
ALTER TABLE "interview_questions" ADD COLUMN     "source" "QuestionSource" NOT NULL DEFAULT 'BANK';
