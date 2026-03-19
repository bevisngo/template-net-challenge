import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFilesAndMessageFileIds1710000000001 implements MigrationInterface {
  name = 'AddFilesAndMessageFileIds1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1 — files table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`files\` (
        \`id\`              VARCHAR(36)                               NOT NULL,
        \`originalName\`    VARCHAR(255)                              NOT NULL,
        \`mimeType\`        VARCHAR(100)                              NOT NULL,
        \`size\`            BIGINT                                    NOT NULL,
        \`minioKey\`        VARCHAR(500)                              NOT NULL,
        \`status\`          ENUM('processing','ready','failed')       NOT NULL DEFAULT 'processing',
        \`geminiFileUri\`   VARCHAR(500)                              NULL,
        \`geminiFileName\`  VARCHAR(255)                              NULL,
        \`userId\`          VARCHAR(36)                               NOT NULL,
        \`createdAt\`       DATETIME(6)                               NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_files_userId\` (\`userId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_files_user\`
          FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2 — drop legacy columns if they exist, then add fileIds
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages'
        AND COLUMN_NAME IN ('fileUrl', 'fileName')
    `);
    const existing = columns.map((c: any) => c.COLUMN_NAME);

    if (existing.includes('fileUrl')) {
      await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`fileUrl\``);
    }
    if (existing.includes('fileName')) {
      await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`fileName\``);
    }

    await queryRunner.query(`ALTER TABLE \`messages\` ADD COLUMN \`fileIds\` JSON NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`messages\`
        DROP COLUMN IF EXISTS \`fileIds\`,
        ADD COLUMN \`fileUrl\`  VARCHAR(500) NULL,
        ADD COLUMN \`fileName\` VARCHAR(255) NULL
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS \`files\``);
  }
}
