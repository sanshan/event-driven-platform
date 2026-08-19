import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDirectory, '../..');
const fixtureSource = resolve(currentDirectory, 'fixture');

const releasePackages = [
    ['@event-driven-platform/types', 'packages/types'],
    ['@event-driven-platform/actor', 'packages/actor'],
    ['@event-driven-platform/subject', 'packages/subject'],
    ['@event-driven-platform/aggregate-reference', 'packages/aggregate-reference'],
    ['@event-driven-platform/tenant-reference', 'packages/tenant-reference'],
    ['@event-driven-platform/intent', 'packages/intent'],
    ['@event-driven-platform/event', 'packages/event'],
    ['@event-driven-platform/operation-result', 'packages/operation-result'],
    ['@event-driven-platform/operation', 'packages/operation'],
];

function run(command, args, cwd) {
    execFileSync(command, args, {
        cwd,
        env: process.env,
        stdio: 'inherit',
    });
}

function listTarballs(directory) {
    return new Set(readdirSync(directory).filter((entry) => entry.endsWith('.tgz')));
}

const temporaryRoot = mkdtempSync(join(tmpdir(), 'event-driven-platform-packages-'));
const artifactsDirectory = join(temporaryRoot, 'artifacts');
const fixtureDirectory = join(temporaryRoot, 'fixture');

mkdirSync(artifactsDirectory, { recursive: true });
mkdirSync(fixtureDirectory, { recursive: true });

const projectNames = releasePackages.map(([name]) => name).join(',');

run('pnpm', ['nx', 'run-many', '-t', 'build', '--projects', projectNames], workspaceRoot);

const tarballs = new Map();

for (const [packageName, packageDirectory] of releasePackages) {
    const packageRoot = resolve(workspaceRoot, packageDirectory);
    const before = listTarballs(artifactsDirectory);

    run('pnpm', ['pack', '--pack-destination', artifactsDirectory], packageRoot);

    const created = [...listTarballs(artifactsDirectory)].filter((entry) => !before.has(entry));

    if (created.length !== 1) {
        throw new Error(`Expected exactly one tarball for ${packageName}, received ${created.length}.`);
    }

    tarballs.set(packageName, join(artifactsDirectory, created[0]));
}

cpSync(fixtureSource, fixtureDirectory, { recursive: true });

const fileDependencies = Object.fromEntries(
    [...tarballs.entries()].map(([name, tarball]) => [name, `file:${tarball}`]),
);

writeFileSync(
    join(fixtureDirectory, 'package.json'),
    `${JSON.stringify(
        {
            name: 'event-driven-platform-package-verification',
            private: true,
            type: 'module',
            dependencies: fileDependencies,
            pnpm: {
                overrides: fileDependencies,
            },
        },
        null,
        4,
    )}\n`,
);

run('pnpm', ['install', '--frozen-lockfile=false'], fixtureDirectory);
run('pnpm', ['exec', 'tsc', '--project', join(fixtureDirectory, 'tsconfig.json')], workspaceRoot);
run('node', [join(fixtureDirectory, 'dist/index.js')], fixtureDirectory);

const installedManifest = JSON.parse(readFileSync(join(fixtureDirectory, 'package.json'), 'utf8'));

if (Object.keys(installedManifest.dependencies).length !== releasePackages.length) {
    throw new Error('Package verification fixture does not contain the complete release set.');
}
