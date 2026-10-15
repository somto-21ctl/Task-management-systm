import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskAssignmentsAndSlidingSessions1791984600000 implements MigrationInterface {
  name = 'AddTaskAssignmentsAndSlidingSessions1791984600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TYPE \"task_status\" RENAME VALUE 'TODO' TO 'pending'",
    );
    await queryRunner.query(
      "ALTER TYPE \"task_status\" RENAME VALUE 'IN_PROGRESS' TO 'inProgress'",
    );
    await queryRunner.query(
      "ALTER TYPE \"task_status\" RENAME VALUE 'DONE' TO 'done'",
    );
    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT \'pending\'',
    );
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD COLUMN "assignedToUserId" uuid,
      ADD COLUMN "reviewStatus" varchar(24) NOT NULL DEFAULT 'notReviewed',
      ADD COLUMN "managerFeedback" text,
      ADD COLUMN "reviewedByUserId" uuid,
      ADD COLUMN "reviewedAt" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      UPDATE "tasks" AS task
      SET "assignedToUserId" = project."ownerId"
      FROM "projects" AS project
      WHERE task."projectId" = project."id"
    `);
    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "assignedToUserId" SET NOT NULL',
    );
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_assignee"
        FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
      ADD CONSTRAINT "FK_tasks_reviewed_by"
        FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL,
      ADD CONSTRAINT "CHK_tasks_review_status"
        CHECK ("reviewStatus" IN ('notReviewed', 'approved', 'changesRequested'))
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_tasks_assignee" ON "tasks" ("assignedToUserId")',
    );

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ADD COLUMN "sessionId" uuid
    `);
    await queryRunner.query(`
      UPDATE "refresh_tokens"
      SET "sessionId" = uuid_generate_v4(),
          "expiresAt" = LEAST("expiresAt", now() + interval '1 hour')
    `);
    await queryRunner.query(
      'ALTER TABLE "refresh_tokens" ALTER COLUMN "sessionId" SET NOT NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_refresh_tokens_session_id" ON "refresh_tokens" ("sessionId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_refresh_tokens_session_id"');
    await queryRunner.query(
      'ALTER TABLE "refresh_tokens" DROP COLUMN "sessionId"',
    );
    await queryRunner.query('DROP INDEX "IDX_tasks_assignee"');
    await queryRunner.query(`
      ALTER TABLE "tasks"
      DROP CONSTRAINT "CHK_tasks_review_status",
      DROP CONSTRAINT "FK_tasks_reviewed_by",
      DROP CONSTRAINT "FK_tasks_assignee",
      DROP COLUMN "reviewedAt",
      DROP COLUMN "reviewedByUserId",
      DROP COLUMN "managerFeedback",
      DROP COLUMN "reviewStatus",
      DROP COLUMN "assignedToUserId"
    `);
    await queryRunner.query(
      "ALTER TYPE \"task_status\" RENAME VALUE 'done' TO 'DONE'",
    );
    await queryRunner.query(
      "ALTER TYPE \"task_status\" RENAME VALUE 'inProgress' TO 'IN_PROGRESS'",
    );
    await queryRunner.query(
      "ALTER TYPE \"task_status\" RENAME VALUE 'pending' TO 'TODO'",
    );
    await queryRunner.query(
      'ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT \'TODO\'',
    );
  }
}
