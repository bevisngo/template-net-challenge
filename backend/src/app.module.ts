import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ChatModule } from './modules/chat/chat.module';
import { FilesModule } from './modules/files/files.module';
import { User } from './modules/users/user.entity';
import { Conversation } from './modules/chat/entities/conversation.entity';
import { Message } from './modules/chat/entities/message.entity';
import { UploadedFile } from './modules/files/entities/file.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'chatuser',
      password: process.env.DB_PASSWORD || 'chatpassword',
      database: process.env.DB_DATABASE || 'templatenet_chat',
      entities: [User, Conversation, Message, UploadedFile],
      migrations: [__dirname + '/database/migrations/*.{ts,js}'],
      migrationsTableName: 'migrations',
      synchronize: !isProd,
      migrationsRun: isProd,
      logging: false,
    }),
    AuthModule,
    UsersModule,
    ChatModule,
    FilesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
