## 0.1.0 (2026-09-02)

### ⚠️  Breaking Changes

- Expose the stable UseCase name in execution and observability contracts. ([#198](https://github.com/sanshan/event-driven-platform/issues/198))

  UseCase implementations must now define a `readonly name`, and executor observations include that identity.

### ❤️ Thank You

- Aleksandr Lihih @sanshan

## 0.0.5 (2026-08-30)

### 🚀 Features

- **reader,observability:** add read.attempt.* and read.retry.scheduled events ([#180](https://github.com/sanshan/event-driven-platform/issues/180), [#178](https://github.com/sanshan/event-driven-platform/issues/178), [#181](https://github.com/sanshan/event-driven-platform/issues/181))

### 🧱 Updated Dependencies

- Updated @event-driven-platform/tenant-reference to 0.1.7

### ❤️ Thank You

- Claude Sonnet 5
- sasha @aleksandr-cell

## 0.0.4 (2026-08-29)

### 🧱 Updated Dependencies

- Updated @event-driven-platform/tenant-reference to 0.1.6

## 0.0.3 (2026-08-29)

This was a version bump only for @event-driven-platform/observability to align it with other projects, there were no code changes.

## 0.0.2 (2026-08-29)

### 🚀 Features

- **observability:** include tenant in Reader context ([cfdead3](https://github.com/sanshan/event-driven-platform/commit/cfdead3))
- **observability:** add execution pipeline observability ([#145](https://github.com/sanshan/event-driven-platform/pull/145), [#140](https://github.com/sanshan/event-driven-platform/issues/140), [#141](https://github.com/sanshan/event-driven-platform/issues/141), [#144](https://github.com/sanshan/event-driven-platform/issues/144))

### 🩹 Fixes

- sync TypeScript project references ([52901ab](https://github.com/sanshan/event-driven-platform/commit/52901ab))

### 🧱 Updated Dependencies

- Updated @event-driven-platform/tenant-reference to 0.1.5

### ❤️ Thank You

- Aleksandr Lihih @sanshan