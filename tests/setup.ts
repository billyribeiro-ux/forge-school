/**
 * Global test setup. Loads .env.local so DATABASE_URL (and any future
 * test-only env vars) are available to every test file.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config();
