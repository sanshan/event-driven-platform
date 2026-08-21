# @event-driven-platform/read-execution-coordinator-redis

Redis implementation of the technology-neutral `@event-driven-platform/read-execution-coordinator` contract.

## Usage

```ts
import { createClient } from 'redis';
import { RedisReadExecutionCoordinator } from '@event-driven-platform/read-execution-coordinator-redis';

const client = createClient({ url: 'redis://localhost:6379' });
await client.connect();

const coordinator = new RedisReadExecutionCoordinator(client);
await coordinator.connect();

// Pass `coordinator` to DefaultReader as readExecutionCoordinator.
```

The command client is supplied and remains consumer-owned. The coordinator creates one duplicated subscriber connection internally. `connect()` connects that subscriber, `wait()` can connect it lazily, and `close()` closes only the internally owned subscriber.

## Ownership model

Each `ReadCacheKey` maps to TTL-bounded lease state and a release notification channel. One global monotonic generation counter provides ownership fencing without creating immortal sequencing state per read key.

Claim, renew, and release use atomic Redis scripts. Renew/release compare the complete lease reference so a stale owner cannot mutate a later generation.

## Follower waiting

Followers use Redis Pub/Sub rather than busy polling. Waiting checks lease existence before and after subscription to close the lost-wakeup race. Release publishes only after ownership-safe deletion succeeds.

Lease expiry itself does not publish. Bounded wait returns to Reader, which re-checks shared cache and re-contends according to the Reader protocol.

Redis/client/script failures become explicit coordinator `unavailable` outcomes. Reader owns the fail-closed distributed execution policy.

## Integration verification

Real Redis verification is available through:

```bash
READ_COORDINATOR_REDIS_URL=redis://localhost:6379 \
  pnpm nx run @event-driven-platform/read-execution-coordinator-redis:test:integration
```

The ordinary unit-test target excludes integration specs. CI runs the real Redis target only when this adapter is affected directly or through the Nx project graph.

## Related documentation

- [`docs/read-public-api.md`](../../docs/read-public-api.md)
- [`docs/read-release-readiness.md`](../../docs/read-release-readiness.md)
