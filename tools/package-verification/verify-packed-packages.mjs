import { execFileSync } from 'node:child_process';
import {
    cpSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDirectory, '../..');
const fixtureSource = resolve(currentDirectory, 'fixture-execution');
const packagesRoot = resolve(workspaceRoot, 'packages');

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

function findPublicPackages() {
    return readdirSync(packagesRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
            const packageDirectory = join(packagesRoot, entry.name);
            const manifestPath = join(packageDirectory, 'package.json');
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

            return {
                name: manifest.name,
                directory: packageDirectory,
                private: manifest.private === true,
            };
        })
        .filter((entry) => !entry.private);
}

const publicPackages = findPublicPackages();

if (publicPackages.length === 0) {
    throw new Error('No public packages found for verification.');
}

const temporaryRoot = mkdtempSync(join(tmpdir(), 'event-driven-platform-packages-'));
const artifactsDirectory = join(temporaryRoot, 'artifacts');
const fixtureDirectory = join(temporaryRoot, 'fixture');

mkdirSync(artifactsDirectory, { recursive: true });

run(
    'pnpm',
    ['nx', 'run-many', '-t', 'build', '--projects', publicPackages.map(({ name }) => name).join(',')],
    workspaceRoot,
);

const tarballs = new Map();

for (const { name, directory } of publicPackages) {
    const before = listTarballs(artifactsDirectory);

    run('pnpm', ['pack', '--pack-destination', artifactsDirectory], directory);

    const created = [...listTarballs(artifactsDirectory)].filter((entry) => !before.has(entry));

    if (created.length !== 1) {
        throw new Error(`Expected exactly one tarball for ${name}, received ${created.length}.`);
    }

    tarballs.set(name, join(artifactsDirectory, created[0]));
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

if (Object.keys(installedManifest.dependencies).length !== publicPackages.length) {
    throw new Error('Package verification fixture does not contain every public package.');
}

console.log(`Verified ${publicPackages.length} packed public package(s).`);
