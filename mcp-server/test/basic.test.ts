import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(__dirname, '..');

describe('MEEET MCP Server', () => {
  it('should have valid package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('@meeet/mcp-server');
    expect(pkg.dependencies).toHaveProperty('@modelcontextprotocol/sdk');
  });

  it('should have compiled TypeScript', () => {
    expect(fs.existsSync(path.join(rootDir, 'dist/index.js'))).toBe(true);
  });

  it('should have README', () => {
    expect(fs.existsSync(path.join(rootDir, 'README.md'))).toBe(true);
  });
});