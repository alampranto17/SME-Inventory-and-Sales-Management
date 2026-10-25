import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// Reads DB settings from .env and gives them to TypeORM.
export function databaseConfig(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST') ?? 'localhost',
    port: Number(config.get('DB_PORT') ?? 5432),
    username: config.get<string>('DB_USER') ?? 'postgres',
    password: config.get<string>('DB_PASSWORD') ?? 'postgres',
    database: config.get<string>('DB_NAME') ?? 'sme_db',

    // every entity used in TypeOrmModule.forFeature([...]) is loaded
    autoLoadEntities: true,

    // synchronize = TypeORM creates/changes tables from your entities
    // automatically. GREAT for learning / development.
    // NEVER use it in production (it can delete columns + data).
    // In production use migrations instead (npm run migration:generate).
    synchronize: config.get('DB_SYNC') === 'true',

    // set DB_LOGGING=true in .env to see every SQL query in the console
    logging: config.get('DB_LOGGING') === 'true',
  };
}
