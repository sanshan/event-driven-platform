## 0.0.5 (2026-08-29)

### 🚀 Features

- **reader:** use tenant-scoped key for distributed coordination ([366a7af](https://github.com/sanshan/event-driven-platform/commit/366a7af))
- **reader:** scope distributed read flights by tenant ([7ffcbb9](https://github.com/sanshan/event-driven-platform/commit/7ffcbb9))
- **reader:** derive tenant-scoped cache identity ([909094c](https://github.com/sanshan/event-driven-platform/commit/909094c))
- **reader:** traverse tenant-scoped cache keys ([358749f](https://github.com/sanshan/event-driven-platform/commit/358749f))
- **reader:** propagate Read tenant to observations ([2632633](https://github.com/sanshan/event-driven-platform/commit/2632633))
- **observability:** add execution pipeline observability ([#145](https://github.com/sanshan/event-driven-platform/pull/145), [#140](https://github.com/sanshan/event-driven-platform/issues/140), [#141](https://github.com/sanshan/event-driven-platform/issues/141), [#144](https://github.com/sanshan/event-driven-platform/issues/144))

### 🩹 Fixes

- sync TypeScript project references ([52901ab](https://github.com/sanshan/event-driven-platform/commit/52901ab))
- **reader:** use scoped key for local inflight ([709b7c5](https://github.com/sanshan/event-driven-platform/commit/709b7c5))
- **reader:** scope local read inflight by tenant ([573e34c](https://github.com/sanshan/event-driven-platform/commit/573e34c))

### 🧱 Updated Dependencies

- Updated @event-driven-platform/read-execution-coordinator-redis to 0.0.5
- Updated @event-driven-platform/read-execution-coordinator to 0.0.5
- Updated @event-driven-platform/read-handler-resolver to 0.0.5
- Updated @event-driven-platform/read-cache-in-memory to 0.0.5
- Updated @event-driven-platform/read-cache-redis to 0.0.5
- Updated @event-driven-platform/observability to 0.0.2
- Updated @event-driven-platform/clock to 0.0.7
- Updated @event-driven-platform/query to 0.0.6
- Updated @event-driven-platform/read to 0.0.6

### ❤️ Thank You

- Aleksandr Lihih @sanshan

## 0.0.4 (2026-08-25)

### 🧱 Updated Dependencies

- Updated @event-driven-platform/read-execution-coordinator-redis to 0.0.4
- Updated @event-driven-platform/read-execution-coordinator to 0.0.4
- Updated @event-driven-platform/read-handler-resolver to 0.0.4
- Updated @event-driven-platform/read-cache-in-memory to 0.0.4
- Updated @event-driven-platform/read-cache-redis to 0.0.4
- Updated @event-driven-platform/query to 0.0.5
- Updated @event-driven-platform/read to 0.0.5

## 0.0.3 (2026-08-22)

### 🧱 Updated Dependencies

- Updated @event-driven-platform/read-execution-coordinator-redis to 0.0.3
- Updated @event-driven-platform/read-execution-coordinator to 0.0.3
- Updated @event-driven-platform/read-handler-resolver to 0.0.3
- Updated @event-driven-platform/read-cache-in-memory to 0.0.3
- Updated @event-driven-platform/read-cache-redis to 0.0.3
- Updated @event-driven-platform/query to 0.0.4
- Updated @event-driven-platform/read to 0.0.4

## 0.0.2 (2026-08-21)

### 🚀 Features

- **read:** integrate distributed shared-cache rendezvous ([5ab6ab0](https://github.com/sanshan/event-driven-platform/commit/5ab6ab0))
- **read:** add Redis read execution coordinator ([#96](https://github.com/sanshan/event-driven-platform/pull/96))
- **reader:** export Reader baseline API ([c2683c1](https://github.com/sanshan/event-driven-platform/commit/c2683c1))

### 🩹 Fixes

- **reader:** update cache spec import after reorg ([e01694b](https://github.com/sanshan/event-driven-platform/commit/e01694b))
- **reader:** declare read dependency ([a1ea6c4](https://github.com/sanshan/event-driven-platform/commit/a1ea6c4))
- **reader:** align tests with current Read contract ([d128b82](https://github.com/sanshan/event-driven-platform/commit/d128b82))

### 🧱 Updated Dependencies

- Updated @event-driven-platform/read-execution-coordinator-redis to 0.0.2
- Updated @event-driven-platform/read-execution-coordinator to 0.0.2
- Updated @event-driven-platform/read-handler-resolver to 0.0.2
- Updated @event-driven-platform/read-cache-in-memory to 0.0.2
- Updated @event-driven-platform/read-cache-redis to 0.0.2
- Updated @event-driven-platform/query to 0.0.3
- Updated @event-driven-platform/read to 0.0.3

### ❤️ Thank You

- Aleksandr Lihih @sanshan
- sasha @aleksandr-cell