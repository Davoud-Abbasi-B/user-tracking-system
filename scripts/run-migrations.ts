import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  user: process.env.DATABASE_USER ?? 'tracking',
  password: process.env.DATABASE_PASSWORD ?? 'tracking',
  database: process.env.DATABASE_NAME ?? 'tracking'
});

async function run() {
  const migrationsDir = join(process.cwd(), 'migrations');
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const alreadyApplied = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE version = $1',
      [file]
    ).catch(() => ({ rowCount: 0 }));

    if (alreadyApplied.rowCount) {
      console.log(`Skipping ${file}`);
      continue;
    }

    const sql = await readFile(join(migrationsDir, file), 'utf8');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
        [file]
      );
      await pool.query('COMMIT');
      console.log(`Applied ${file}`);
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
