import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  root: path.resolve(__dirname),
  configFile: path.resolve(__dirname, 'vitest.config.ts'),
});
