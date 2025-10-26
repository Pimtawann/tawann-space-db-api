import dotenv from "dotenv";
dotenv.config();

import * as pg from "pg";
const { Pool } = pg;

const connectionPool = new Pool({
  connectionString: process.env.CONNECTION_STRING,
});

export default connectionPool;