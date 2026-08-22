import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, it } from 'vitest';

const fixtureSource = resolve(import.meta.dirname, 'fixture-execution');
const registry = 'http://localhost:4873';
const e2eVersion = '0.0.0-e2e';

const consumerDependencies = [
    '@event-driven-platform/actor',
    '@event-driven-platform/aggregate-reference',
    '@event-driven-platform/clock',
    '@event-driven-platform/command',
    '@event-driven-platform/execution',
    '@event-driven-platform/execution-log-store',
    '@event-driven-platform/execution-transaction',
    '@event-driven-platform/event',
    '@event-driven-platform/intent',
    '@event-driven-platform/operation',
    '@event-driven-platform/operation-event-envelope-factory',
    '@event-driven-platform/operation-handler-resolver',
    '@event-driven-platform/operation-result',
    '@event-driven-platform/outbox',
    '@event-driven-platform/outbox-store',
    '@event-driven-platform/query',
    '@event-driven-platform/read',
    '@event-driven-platform/read-cache-in-memory',
    '@event-driven-platform/read-cache-redis',
    '@event-driven-platform/read-execution-coordinator',
    '@event-driven-platform/read-execution-coordinator-redis',
    '@event-driven-platform/read-handler',
    '@event-driven-platform/read-handler-resolver',
    '@event-driven-platform/reader',
    '@event-driven-platform/runner',
    '@event-driven-platform/subject',
    '@event-driven-platform/tenant-reference',
    '@event-driven-platform/types',
    '@event-driven-platform/use-case',
    '@event-driven-platform/use-case-execution-store',
    '@event-driven-platform/use-case-executor',
];

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
        writeFileSync(
            join(fixtureDirectory, 'package.json'),
            `${JSON.stringify(
                {
                    name: 'event-driven-platform-package-verification',
                    private: true,
                    type: 'module',
                    dependencies: {
                        ...Object.fromEntries(
                            consumerDependencies.map((packageName) => [packageName, e2eVersion]),
                        ),
                        redis: '^6.2.1',
                    },
                    devDependencies: {
                        '@types/node': '^22.0.0',
                        typescript: '~5.9.2',
                    },
                },
                null,
                4,
            )}\n`,
        );

        run(
            'pnpm',
            ['install', '--frozen-lockfile=false', `--registry=${registry}`],
            fixtureDirectory,
        );
        run('pnpm', ['exec', 'tsc', '--project', 'tsconfig.json'], fixtureDirectory);
        run('node', [join(fixtureDirectory, 'dist/index.js')], fixtureDirectory);
        run('node', [join(fixtureDirectory, 'dist/read.js')], fixtureDirectory);
        run('node', [join(fixtureDirectory, 'dist/use-case.js')], fixtureDirectory);
    });
});
