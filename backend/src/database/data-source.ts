import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'chatuser',
  password: process.env.DB_PASSWORD || 'chatpassword',
  database: process.env.DB_DATABASE || 'templatenet_chat',
  entities: ['src/modules/**/*.entity.ts', 'src/modules/**/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: false,
});
