import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    name: 'mcp-server',
    testDir: '.',
    configFile: './vitest.config.ts',
  },
]);