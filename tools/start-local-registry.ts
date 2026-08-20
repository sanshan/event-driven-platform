import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { releasePublish, releaseVersion } from 'nx/release';

export default async function setupLocalRegistry() {
    const stopLocalRegistry = await startLocalRegistry({
        localRegistryTarget: 'event-driven-platform:local-registry',
        storage: './tmp/local-registry/storage',
        verbose: false,
    });

    await releaseVersion({
        specifier: '0.0.0-e2e',
        stageChanges: false,
        gitCommit: false,
        gitTag: false,
        firstRelease: true,
        versionActionsOptionsOverrides: {
            skipLockFileUpdate: true,
        },
    });

    await releasePublish({
        tag: 'e2e',
        firstRelease: true,
    });

    return async () => {
        await stopLocalRegistry();
    };
}
