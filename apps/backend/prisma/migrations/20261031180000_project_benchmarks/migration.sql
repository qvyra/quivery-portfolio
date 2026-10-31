-- The blocks of a project's benchmarks page. Empty means it has none
ALTER TABLE "Project" ADD COLUMN "benchmarks" JSONB NOT NULL DEFAULT '[]';
