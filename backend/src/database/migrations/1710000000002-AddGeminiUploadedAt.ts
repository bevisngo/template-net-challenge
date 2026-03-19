import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGeminiUploadedAt1710000000002 implements MigrationInterface {
  name = 'AddGeminiUploadedAt1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'files'
        AND COLUMN_NAME = 'geminiUploadedAt'
    `);

    if (!columns.length) {
      await queryRunner.query(`
        ALTER TABLE \`files\`
          ADD COLUMN \`geminiUploadedAt\` DATETIME NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`files\`
        DROP COLUMN \`geminiUploadedAt\`
    `);
  }
}
