
import { lucia } from "lucia";
import { betterSqlite3 } from "@lucia-auth/adapter-sqlite";

import { sqliteDatabase } from "./db/client";

export const auth = lucia({
	adapter: betterSqlite3(sqliteDatabase, tableNames)
});