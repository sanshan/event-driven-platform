import fs from 'node:fs';
import path from 'node:path';

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Expected a semver release version, received: ${version ?? '<missing>'}`);
}

const root = process.cwd();
const nx = JSON.parse(fs.readFileSync(path.join(root, 'nx.json'), 'utf8'));
const releaseProjects = nx.release?.groups?.core?.projects;

const expectedProjects = [
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

if (!Array.isArray(releaseProjects)) {
    throw new Error('Nx release group `core` is missing.');
}

if (JSON.stringify(releaseProjects) !== JSON.stringify(expectedProjects)) {
    throw new Error('Nx release group `core` does not match the approved public package set.');
}

const packageDirectories = fs
    .readdirSync(path.join(root, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

const manifests = packageDirectories
    .map((directory) => {
        const manifestPath = path.join(root, 'packages', directory, 'package.json');

        if (!fs.existsSync(manifestPath)) {
            return null;
        }

        return {
            directory,
            manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')),
        };
    })
    .filter(Boolean);

const manifestsByName = new Map(manifests.map((entry) => [entry.manifest.name, entry]));

for (const project of expectedProjects) {
    const entry = manifestsByName.get(project);

    if (!entry) {
        throw new Error(`Missing package manifest for ${project}.`);
    }

    const { manifest } = entry;

    if (manifest.version !== version) {
        throw new Error(`${project} has version ${manifest.version}; expected ${version}.`);
    }

    if (manifest.private === true) {
        throw new Error(`${project} is still private.`);
    }

    if (manifest.publishConfig?.access !== 'public') {
        throw new Error(`${project} must declare publishConfig.access = public.`);
    }
}

for (const { manifest } of manifests) {
    if (!expectedProjects.includes(manifest.name) && manifest.private !== true) {
        throw new Error(`Package outside the release set is publishable: ${manifest.name}.`);
    }
}

console.log(`Verified release state for core ${version}.`);
