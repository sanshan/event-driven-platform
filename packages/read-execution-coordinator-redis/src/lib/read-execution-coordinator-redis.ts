import type {
    ClaimReadExecutionRequest,
    ClaimReadExecutionResult,
    ReadExecutionCoordinator,
    ReadExecutionLeaseReference,
    ReleaseReadExecutionRequest,
    ReleaseReadExecutionResult,
    RenewReadExecutionRequest,
    RenewReadExecutionResult,
    WaitForReadExecutionRequest,
    WaitForReadExecutionResult,
} from '@event-driven-platform/read-execution-coordinator';
import type { ReadCacheKey } from '@event-driven-platform/query';
import type { RedisClientType } from 'redis';

const renewScript = `
local current = redis.call('GET', KEYS[1])
if current ~= ARGV[1] then
  return 0
end
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return 1
`;

const releaseScript = `
local current = redis.call('GET', KEYS[1])
if current ~= ARGV[1] then
  return 0
end
redis.call('DEL', KEYS[1])
redis.call('PUBLISH', KEYS[2], ARGV[1])
return 1
`;

export interface RedisReadExecutionCoordinatorOptions {
    readonly keyPrefix?: string;
}

export class RedisReadExecutionCoordinator implements ReadExecutionCoordinator {
    private readonly keyPrefix: string;
    private readonly subscriber: RedisClientType;
    private versionCounter = 0;

    constructor(
        private readonly client: RedisClientType,
        options: RedisReadExecutionCoordinatorOptions = {},
    ) {
        this.keyPrefix = options.keyPrefix ?? 'read-execution';
        this.subscriber = client.duplicate();
    }

    async connect(): Promise<void> {
        if (!this.subscriber.isOpen) {
            await this.subscriber.connect();
        }
    }

    async close(): Promise<void> {
        if (this.subscriber.isOpen) {
            await this.subscriber.quit();
        }
    }

    async claim(request: ClaimReadExecutionRequest): Promise<ClaimReadExecutionResult> {
        try {
            const lease = this.createLease(request.ownerId);
            const value = this.serializeLease(lease);
            const result = await this.client.set(this.leaseKey(request.key), value, {
                NX: true,
                PX: request.leaseDurationMs,
            });

            if (result !== 'OK') {
                return { status: 'already-in-progress' };
            }

            return { status: 'acquired', lease };
        } catch (error) {
            return this.unavailable(error);
        }
    }

    async wait(request: WaitForReadExecutionRequest): Promise<WaitForReadExecutionResult> {
        try {
            if (request.signal?.aborted === true) {
                return { status: 'cancelled' };
            }

            await this.connect();

            const leaseKey = this.leaseKey(request.key);
            const channel = this.channelKey(request.key);
            const exists = await this.client.exists(leaseKey);

            if (exists === 0) {
                return { status: 'released' };
            }

            return await this.waitForRelease(channel, request);
        } catch (error) {
            return this.unavailable(error);
        }
    }

    async renew(request: RenewReadExecutionRequest): Promise<RenewReadExecutionResult> {
        try {
            const result = await this.client.eval(renewScript, {
                keys: [this.leaseKey(request.key)],
                arguments: [this.serializeLease(request.lease), String(request.leaseDurationMs)],
            });

            if (Number(result) !== 1) {
                return { status: 'ownership-lost' };
            }

            return { status: 'renewed', lease: request.lease };
        } catch (error) {
            return this.unavailable(error);
        }
    }

    async release(request: ReleaseReadExecutionRequest): Promise<ReleaseReadExecutionResult> {
        try {
            const result = await this.client.eval(releaseScript, {
                keys: [this.leaseKey(request.key), this.channelKey(request.key)],
                arguments: [this.serializeLease(request.lease)],
            });

            return Number(result) === 1
                ? { status: 'released' }
                : { status: 'ownership-lost' };
        } catch (error) {
            return this.unavailable(error);
        }
    }

    private async waitForRelease(
        channel: string,
        request: WaitForReadExecutionRequest,
    ): Promise<WaitForReadExecutionResult> {
        return new Promise((resolve) => {
            let settled = false;

            const finish = (result: WaitForReadExecutionResult): void => {
                if (settled) {
                    return;
                }

                settled = true;
                clearTimeout(timer);
                request.signal?.removeEventListener('abort', onAbort);
                void this.subscriber.unsubscribe(channel, onMessage).catch(() => undefined);
                resolve(result);
            };

            const onMessage = (): void => finish({ status: 'released' });
            const onAbort = (): void => finish({ status: 'cancelled' });
            const timer = setTimeout(() => finish({ status: 'timed-out' }), request.timeoutMs);

            request.signal?.addEventListener('abort', onAbort, { once: true });

            void this.subscriber.subscribe(channel, onMessage).catch((error: unknown) => {
                finish(this.unavailable(error));
            });
        });
    }

    private createLease(ownerId: string): ReadExecutionLeaseReference {
        this.versionCounter += 1;
        return { ownerId, version: this.versionCounter };
    }

    private leaseKey(key: ReadCacheKey): string {
        return `${this.keyPrefix}:lease:${this.identity(key)}`;
    }

    private channelKey(key: ReadCacheKey): string {
        return `${this.keyPrefix}:release:${this.identity(key)}`;
    }

    private identity(key: ReadCacheKey): string {
        return JSON.stringify([key.namespace, key.version, key.partition, key.value]);
    }

    private serializeLease(lease: ReadExecutionLeaseReference): string {
        return JSON.stringify([lease.ownerId, lease.version]);
    }

    private unavailable(error: unknown): { readonly status: 'unavailable'; readonly reason: string } {
        return {
            status: 'unavailable',
            reason: error instanceof Error ? error.message : String(error),
        };
    }
}
