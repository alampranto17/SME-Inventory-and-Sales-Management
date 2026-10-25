import 'dotenv/config';
import { DataSource } from 'typeorm';

// This file is ONLY used by the TypeORM CLI for migrations:
//   npm run build
//   npm run migration:generate -- src/database/migrations/Init
//   npm run migration:run
// (The app itself uses database.config.ts)
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'sme_db',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
});
