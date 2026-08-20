import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const workspaceRoot = resolve(import.meta.dirname, '../..');
const fixtureSource = resolve(import.meta.dirname, 'fixture-execution');
const registry = 'http://localhost:4873';

function run(command: string, args: string[], cwd: string) {
    execFileSync(command, args, {
        cwd,
        env: process.env,
        stdio: 'inherit',
    });
}

describe('published workspace packages', () => {
    it('can be installed and executed by an external consumer', () => {
        const fixtureDirectory = mkdtempSync(join(tmpdir(), 'event-driven-platform-consumer-'));

        cpSync(fixtureSource, fixtureDirectory, { recursive: true });

        run(
            'pnpm',
            ['install', '--frozen-lockfile=false', `--registry=${registry}`],
            fixtureDirectory,
        );
        run(
            'pnpm',
            ['exec', 'tsc', '--project', join(fixtureDirectory, 'tsconfig.json')],
            workspaceRoot,
        );
        run('node', [join(fixtureDirectory, 'dist/index.js')], fixtureDirectory);

        expect(true).toBe(true);
    });
});
