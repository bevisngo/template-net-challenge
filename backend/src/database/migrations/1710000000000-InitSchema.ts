import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1710000000000 implements MigrationInterface {
  name = 'InitSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\`         VARCHAR(36)   NOT NULL,
        \`email\`      VARCHAR(100)  NOT NULL,
        \`name\`       VARCHAR(100)  NOT NULL,
        \`password\`   VARCHAR(255)  NOT NULL,
        \`createdAt\`  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\`  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_users_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`conversations\` (
        \`id\`         VARCHAR(36)   NOT NULL,
        \`title\`      VARCHAR(255)  NOT NULL DEFAULT 'New Conversation',
        \`userId\`     VARCHAR(36)   NOT NULL,
        \`createdAt\`  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\`  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_conversations_userId\` (\`userId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_conversations_user\`
          FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`messages\` (
        \`id\`              VARCHAR(36)                  NOT NULL,
        \`role\`            ENUM('user', 'assistant')    NOT NULL,
        \`content\`         TEXT                         NOT NULL,
        \`fileUrl\`         VARCHAR(500)                 NULL,
        \`fileName\`        VARCHAR(255)                 NULL,
        \`conversationId\`  VARCHAR(36)                  NOT NULL,
        \`createdAt\`       DATETIME(6)                  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_messages_conversationId\` (\`conversationId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_messages_conversation\`
          FOREIGN KEY (\`conversationId\`) REFERENCES \`conversations\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`messages\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`conversations\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
  }
}
