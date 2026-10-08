import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConstrainUserRoles1791470000000 implements MigrationInterface {
  name = 'ConstrainUserRoles1791470000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "CHK_users_role"
      CHECK ("role" IN ('user', 'admin'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" DROP CONSTRAINT "CHK_users_role"',
    );
  }
}
