import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { releasePublish, releaseVersion } from 'nx/release';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDirectory, '../..');
const registry = 'http://localhost:4873';
const publicRegistry = 'https://registry.npmjs.org';
const version = '0.1.0';
const groupName = process.argv[2] ?? 'core';

const corePackages = [
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

const executionPackages = [
    '@event-driven-platform/guard',
    '@event-driven-platform/rate-limit',
    '@event-driven-platform/retry',
    '@event-driven-platform/command',
    '@event-driven-platform/clock',
    '@event-driven-platform/execution',
    '@event-driven-platform/execution-log',
    '@event-driven-platform/execution-log-store',
    '@event-driven-platform/execution-transaction',
    '@event-driven-platform/operation-handler',
    '@event-driven-platform/operation-handler-resolver',
    '@event-driven-platform/operation-event-envelope-factory',
    '@event-driven-platform/outbox',
    '@event-driven-platform/outbox-store',
    '@event-driven-platform/runner',
];

const verificationGroups = {
    core: {
        fixture: 'fixture',
        releasePackages: corePackages,
        installPackages: corePackages,
        baselinePackages: [],
    },
    execution: {
        fixture: 'fixture-execution',
        releasePackages: executionPackages,
        installPackages: [...corePackages, ...executionPackages],
        baselinePackages: corePackages,
    },
};

const verification = verificationGroups[groupName];

if (!verification) {
    throw new Error(`Unknown local-registry verification group: ${groupName}.`);
}

const fixtureSource = resolve(currentDirectory, verification.fixture);

function run(command, args, cwd) {
    execFileSync(command, args, {
        cwd,
        env: process.env,
        stdio: 'inherit',
    });
}

function runAndCapture(command, args, cwd) {
    return execFileSync(command, args, {
        cwd,
        env: process.env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit'],
    });
}

function seedPublishedBaseline(packages, destination) {
    if (packages.length === 0) {
        return;
    }

    mkdirSync(destination, { recursive: true });

    for (const packageName of packages) {
        const packOutput = runAndCapture(
            'npm',
            [
                'pack',
                `${packageName}@${version}`,
                '--json',
                '--pack-destination',
                destination,
                `--registry=${publicRegistry}`,
            ],
            workspaceRoot,
        );
        const packResult = JSON.parse(packOutput);
        const filename = packResult.at(0)?.filename;

        if (!filename) {
            throw new Error(`npm pack did not return a tarball for ${packageName}@${version}.`);
        }

        run(
            'npm',
            [
                'publish',
                join(destination, filename),
                `--registry=${registry}`,
                '--access=public',
                '--tag=baseline',
            ],
            workspaceRoot,
        );
    }

    console.log(
        `Seeded ${packages.length} already-published core package(s) into the local registry.`,
    );
}

const temporaryRoot = mkdtempSync(join(tmpdir(), 'event-driven-platform-registry-'));
const fixtureDirectory = join(temporaryRoot, 'fixture');
const baselineDirectory = join(temporaryRoot, 'baseline');

let stopLocalRegistry;

try {
    stopLocalRegistry = await startLocalRegistry({
        localRegistryTarget: 'event-driven-platform:local-registry',
        storage: './tmp/local-registry/storage',
        verbose: false,
    });

    seedPublishedBaseline(verification.baselinePackages, baselineDirectory);

    run(
        'pnpm',
        ['nx', 'run-many', '-t', 'build', '--projects', verification.installPackages.join(',')],
        workspaceRoot,
    );

    const { projectsVersionData, releaseGraph } = await releaseVersion({
        specifier: version,
        groups: [groupName],
        stageChanges: false,
        gitCommit: false,
        gitTag: false,
        firstRelease: true,
        versionActionsOptionsOverrides: {
            skipLockFileUpdate: true,
        },
    });

    const versionedProjects = Object.keys(projectsVersionData).sort();
    const expectedProjects = [...verification.releasePackages].sort();

    if (JSON.stringify(versionedProjects) !== JSON.stringify(expectedProjects)) {
        throw new Error(
            `Nx Release versioned an unexpected project set for ${groupName}: ${versionedProjects.join(', ')}`,
        );
    }

    const publishResults = await releasePublish({
        releaseGraph,
        versionData: projectsVersionData,
        groups: [groupName],
        tag: 'local',
        firstRelease: true,
    });

    const publishedProjects = Object.keys(publishResults).sort();

    if (JSON.stringify(publishedProjects) !== JSON.stringify(expectedProjects)) {
        throw new Error(
            `Nx Release published an unexpected project set for ${groupName}: ${publishedProjects.join(', ')}`,
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
        verification.installPackages.map((packageName) => [packageName, version]),
    );

    writeFileSync(
        join(fixtureDirectory, 'package.json'),
        `${JSON.stringify(
            {
                name: `event-driven-platform-${groupName}-local-registry-verification`,
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

    for (const packageName of verification.installPackages) {
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

    console.log(`Verified local-registry release lifecycle for ${groupName}.`);
} finally {
    if (stopLocalRegistry) {
        await stopLocalRegistry();
    }
}
