-- Drafts cleared before this were written as JSON null rather than SQL NULL,
-- which SQL counts as a value. The admin writes a real NULL now
UPDATE "Section" SET "draft" = NULL WHERE "draft" = 'null'::jsonb;
UPDATE "Project" SET "draft" = NULL WHERE "draft" = 'null'::jsonb;
UPDATE "Stat" SET "draft" = NULL WHERE "draft" = 'null'::jsonb;
UPDATE "Skill" SET "draft" = NULL WHERE "draft" = 'null'::jsonb;
UPDATE "Service" SET "draft" = NULL WHERE "draft" = 'null'::jsonb;
UPDATE "Testimonial" SET "draft" = NULL WHERE "draft" = 'null'::jsonb;
UPDATE "ContactLink" SET "draft" = NULL WHERE "draft" = 'null'::jsonb;
