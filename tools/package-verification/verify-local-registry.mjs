import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { releasePublish, releaseVersion } from 'nx/release';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDirectory, '../..');
const fixtureSource = resolve(currentDirectory, 'fixture');
const registry = 'http://localhost:4873';
const version = '0.1.0';

const releasePackages = [
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

function run(command, args, cwd) {
    execFileSync(command, args, {
        cwd,
        env: process.env,
        stdio: 'inherit',
    });
}

const temporaryRoot = mkdtempSync(join(tmpdir(), 'event-driven-platform-registry-'));
const fixtureDirectory = join(temporaryRoot, 'fixture');

let stopLocalRegistry;

try {
    stopLocalRegistry = await startLocalRegistry({
        localRegistryTarget: 'event-driven-platform:local-registry',
        storage: './tmp/local-registry/storage',
        verbose: false,
    });

    run(
        'pnpm',
        ['nx', 'run-many', '-t', 'build', '--projects', releasePackages.join(',')],
        workspaceRoot,
    );

    const { projectsVersionData, releaseGraph } = await releaseVersion({
        specifier: version,
        stageChanges: false,
        gitCommit: false,
        gitTag: false,
        firstRelease: true,
        versionActionsOptionsOverrides: {
            skipLockFileUpdate: true,
        },
    });

    const versionedProjects = Object.keys(projectsVersionData).sort();
    const expectedProjects = [...releasePackages].sort();

    if (JSON.stringify(versionedProjects) !== JSON.stringify(expectedProjects)) {
        throw new Error(
            `Nx Release versioned an unexpected project set: ${versionedProjects.join(', ')}`,
        );
    }

    const publishResults = await releasePublish({
        releaseGraph,
        versionData: projectsVersionData,
        tag: 'local',
        firstRelease: true,
    });

    const publishedProjects = Object.keys(publishResults).sort();

    if (JSON.stringify(publishedProjects) !== JSON.stringify(expectedProjects)) {
        throw new Error(
            `Nx Release published an unexpected project set: ${publishedProjects.join(', ')}`,
        );
    }

    const failedProjects = Object.entries(publishResults)
        .filter(([, result]) => result.code !== 0)
        .map(([project]) => project);

    if (failedProjects.length > 0) {
        throw new Error(`Nx Release failed to publish: ${failedProjects.join(', ')}`);
    }

    cpSync(fixtureSource, fixtureDirectory, { recursive: true });

    const dependencies = Object.fromEntries(
        releasePackages.map((packageName) => [packageName, version]),
    );

    writeFileSync(
        join(fixtureDirectory, 'package.json'),
        `${JSON.stringify(
            {
                name: 'event-driven-platform-local-registry-verification',
                private: true,
                type: 'module',
                dependencies,
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

    run(
        'pnpm',
        ['exec', 'tsc', '--project', join(fixtureDirectory, 'tsconfig.json')],
        workspaceRoot,
    );
    run('node', [join(fixtureDirectory, 'dist/index.js')], fixtureDirectory);

    for (const packageName of releasePackages) {
        const manifestPath = join(
            fixtureDirectory,
            'node_modules',
            ...packageName.split('/'),
            'package.json',
        );
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

        if (manifest.version !== version) {
            throw new Error(
                `${packageName} resolved to ${manifest.version}; expected ${version}.`,
            );
        }
    }
} finally {
    if (stopLocalRegistry) {
        await stopLocalRegistry();
    }
}
