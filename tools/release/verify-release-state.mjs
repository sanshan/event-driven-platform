import fs from 'node:fs';
import path from 'node:path';

const version = process.argv[2];
const groupName = process.argv[3] ?? 'core';

if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Expected a semver release version, received: ${version ?? '<missing>'}`);
}

const expectedGroups = {
    core: [
        '@event-driven-platform/types',
        '@event-driven-platform/actor',
        '@event-driven-platform/subject',
        '@event-driven-platform/aggregate-reference',
        '@event-driven-platform/tenant-reference',
        '@event-driven-platform/intent',
        '@event-driven-platform/event',
        '@event-driven-platform/operation-result',
        '@event-driven-platform/operation',
    ],
    execution: [
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
    ],
};

const expectedProjects = expectedGroups[groupName];

if (!expectedProjects) {
    throw new Error(`Unknown release group: ${groupName}.`);
}

const root = process.cwd();
const nx = JSON.parse(fs.readFileSync(path.join(root, 'nx.json'), 'utf8'));
const releaseProjects = nx.release?.groups?.[groupName]?.projects;

if (!Array.isArray(releaseProjects)) {
    throw new Error(`Nx release group \`${groupName}\` is missing.`);
}

if (JSON.stringify(releaseProjects) !== JSON.stringify(expectedProjects)) {
    throw new Error(
        `Nx release group \`${groupName}\` does not match the approved public package set.`,
    );
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
const allApprovedPublicProjects = new Set(Object.values(expectedGroups).flat());

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
    if (!allApprovedPublicProjects.has(manifest.name) && manifest.private !== true) {
        throw new Error(`Package outside the approved release sets is publishable: ${manifest.name}.`);
    }
}

console.log(`Verified release state for ${groupName} ${version}.`);
