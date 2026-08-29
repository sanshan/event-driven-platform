import type { TenantScopedReadCacheKey } from '@event-driven-platform/query';

export interface ReadExecutionLeaseReference {
    readonly ownerId: string;
    readonly version: number;
}

export interface ClaimReadExecutionRequest {
    readonly key: TenantScopedReadCacheKey;
    readonly ownerId: string;
    readonly leaseDurationMs: number;
}

export type ClaimReadExecutionResult =
    | {
          readonly status: 'acquired';
          readonly lease: ReadExecutionLeaseReference;
      }
    | {
          readonly status: 'already-in-progress';
      }
    | {
          readonly status: 'unavailable';
          readonly reason: string;
      };

export interface WaitForReadExecutionRequest {
    readonly key: TenantScopedReadCacheKey;
    readonly timeoutMs: number;
    readonly signal?: AbortSignal;
}

export type WaitForReadExecutionResult =
    | { readonly status: 'released' }
    | { readonly status: 'timed-out' }
    | { readonly status: 'cancelled' }
    | { readonly status: 'unavailable'; readonly reason: string };

export interface RenewReadExecutionRequest {
    readonly key: TenantScopedReadCacheKey;
    readonly lease: ReadExecutionLeaseReference;
    readonly leaseDurationMs: number;
}

export type RenewReadExecutionResult =
    | {
          readonly status: 'renewed';
          readonly lease: ReadExecutionLeaseReference;
      }
    | { readonly status: 'ownership-lost' }
    | { readonly status: 'unavailable'; readonly reason: string };

export interface ReleaseReadExecutionRequest {
    readonly key: TenantScopedReadCacheKey;
    readonly lease: ReadExecutionLeaseReference;
}

export type ReleaseReadExecutionResult =
    | { readonly status: 'released' }
    | { readonly status: 'ownership-lost' }
    | { readonly status: 'unavailable'; readonly reason: string };

export interface ReadExecutionCoordinator {
    claim(request: ClaimReadExecutionRequest): Promise<ClaimReadExecutionResult>;
    wait(request: WaitForReadExecutionRequest): Promise<WaitForReadExecutionResult>;
    renew(request: RenewReadExecutionRequest): Promise<RenewReadExecutionResult>;
    release(request: ReleaseReadExecutionRequest): Promise<ReleaseReadExecutionResult>;
}
