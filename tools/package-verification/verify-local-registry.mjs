import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { releasePublish, releaseVersion } from 'nx/release';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDirectory, '../..');
const fixtureDirectory = resolve(currentDirectory, 'fixture');
const registry = 'http://localhost:4873';

const releaseProjects = [
    '@event-driven-platform/types',
    '@event-driven-platform/actor',
    '@event-driven-platform/subject',
    '@event-driven-platform/aggregate-reference',
    '@event-driven-platform/tenant-reference',
    '@event-driven-platform/intent',
    '@event-driven-platform/event',
    '@event-driven-platform/operation-result',
    '@event-driven-platform/operation',
];

const releaseFiles = [
    'packages/types/package.json',
    'packages/actor/package.json',
    'packages/subject/package.json',
    'packages/aggregate-reference/package.json',
    'packages/tenant-reference/package.json',
    'packages/intent/package.json',
    'packages/event/package.json',
    'packages/operation-result/package.json',
    'packages/operation/package.json',
    'pnpm-lock.yaml',
];

function run(command, args, cwd = workspaceRoot) {
    execFileSync(command, args, {
        cwd,
        env: process.env,
        stdio: 'inherit',
    });
}

function cleanupFixture() {
    rmSync(resolve(fixtureDirectory, 'node_modules'), { recursive: true, force: true });
    rmSync(resolve(fixtureDirectory, 'dist'), { recursive: true, force: true });
    rmSync(resolve(fixtureDirectory, 'package-lock.json'), { force: true });
}

function restoreVersionFiles() {
    run('git', ['restore', '--source=HEAD', '--staged', '--worktree', '--', ...releaseFiles]);
}

const initialStatus = execFileSync('git', ['status', '--porcelain'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
}).trim();

if (initialStatus.length > 0) {
    throw new Error('Local registry verification requires a clean working tree.');
}

let stopLocalRegistry;

try {
    stopLocalRegistry = await startLocalRegistry({
        localRegistryTarget: 'event-driven-platform:local-registry',
        storage: './tmp/local-registry/storage',
        verbose: false,
    });

    const { projectsVersionData, releaseGraph } = await releaseVersion({
        specifier: '0.1.0',
        stageChanges: false,
        gitCommit: false,
        gitTag: false,
        firstRelease: true,
    });

    run('pnpm', [
        'nx',
        'run-many',
        '-t',
        'build',
        '--projects',
        releaseProjects.join(','),
    ]);

    const publishResults = await releasePublish({
        releaseGraph,
        versionData: projectsVersionData,
        registry,
        tag: 'e2e',
        firstRelease: true,
    });

    const publishedProjects = Object.keys(publishResults).sort();
    const expectedProjects = [...releaseProjects].sort();

    if (JSON.stringify(publishedProjects) !== JSON.stringify(expectedProjects)) {
        throw new Error(
            `Unexpected published project set: ${publishedProjects.join(', ')}`,
        );
    }

    if (Object.values(publishResults).some((result) => result.code !== 0)) {
        throw new Error('Nx Release failed to publish one or more packages to Verdaccio.');
    }

    cleanupFixture();
    run('npm', ['install', '--ignore-scripts', '--registry', registry], fixtureDirectory);
    run('pnpm', ['exec', 'tsc', '--project', resolve(fixtureDirectory, 'tsconfig.json')]);
    run('node', [resolve(fixtureDirectory, 'dist/index.js')], fixtureDirectory);
} finally {
    cleanupFixture();
    restoreVersionFiles();

    if (stopLocalRegistry) {
        await stopLocalRegistry();
    }
}
