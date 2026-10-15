import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfileAndRefreshTokens1791984000000 implements MigrationInterface {
  name = 'AddUserProfileAndRefreshTokens1791984000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN "fullName" varchar(100)',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN "phoneNumber" varchar(16)',
    );
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "tokenId" uuid NOT NULL,
        "tokenHash" char(64) NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_token_id" UNIQUE ("tokenId"),
        CONSTRAINT "UQ_refresh_tokens_token_hash" UNIQUE ("tokenHash"),
        CONSTRAINT "FK_refresh_tokens_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("userId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_refresh_tokens_user_id"');
    await queryRunner.query('DROP TABLE "refresh_tokens"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "phoneNumber"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "fullName"');
  }
}
