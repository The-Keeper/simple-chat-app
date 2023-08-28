import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
 
import { DATABASE_URL } from "$env/static/private";
 
export const sqliteDatabase = new Database('sqlite.db');
export const db: BetterSQLite3Database = drizzle(sqliteDatabase);
  