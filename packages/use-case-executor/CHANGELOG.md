## 0.1.0 (2026-09-02)

### ⚠️  Breaking Changes

- Expose the stable UseCase name in execution and observability contracts. ([#198](https://github.com/sanshan/event-driven-platform/issues/198))

  UseCase implementations must now define a `readonly name`, and executor observations include that identity.

### 🧱 Updated Dependencies

- Updated @event-driven-platform/observability to 0.1.0
- Updated @event-driven-platform/use-case to 0.1.0

### ❤️ Thank You

- Aleksandr Lihih @sanshan

## 0.0.8 (2026-08-30)

### 🚀 Features

- **use-case-executor:** adopt ExecutionFailureError ([#170](https://github.com/sanshan/event-driven-platform/issues/170), [#171](https://github.com/sanshan/event-driven-platform/issues/171), [#172](https://github.com/sanshan/event-driven-platform/issues/172), [#175](https://github.com/sanshan/event-driven-platform/issues/175), [#173](https://github.com/sanshan/event-driven-platform/issues/173))

### 🧱 Updated Dependencies

- Updated @event-driven-platform/operation-event-envelope-factory to 0.0.10
- Updated @event-driven-platform/use-case-execution-store to 0.0.7
- Updated @event-driven-platform/observability to 0.0.5
- Updated @event-driven-platform/execution to 0.0.8
- Updated @event-driven-platform/operation to 0.1.8
- Updated @event-driven-platform/use-case to 0.0.7
- Updated @event-driven-platform/command to 0.0.9
- Updated @event-driven-platform/intent to 0.2.4
- Updated @event-driven-platform/clock to 0.0.9
- Updated @event-driven-platform/event to 0.1.7
- Updated @event-driven-platform/query to 0.0.8

### ❤️ Thank You

- Claude Sonnet 5
- sasha @aleksandr-cell

## 0.0.7 (2026-08-29)

### 🧱 Updated Dependencies

- Updated @event-driven-platform/operation-event-envelope-factory to 0.0.9
- Updated @event-driven-platform/use-case-execution-store to 0.0.6
- Updated @event-driven-platform/observability to 0.0.4
- Updated @event-driven-platform/execution to 0.0.7
- Updated @event-driven-platform/operation to 0.1.7
- Updated @event-driven-platform/use-case to 0.0.6
- Updated @event-driven-platform/command to 0.0.8
- Updated @event-driven-platform/intent to 0.2.3
- Updated @event-driven-platform/clock to 0.0.8
- Updated @event-driven-platform/event to 0.1.6
- Updated @event-driven-platform/query to 0.0.7

## 0.0.6 (2026-08-29)

### 🧱 Updated Dependencies

- Updated @event-driven-platform/observability to 0.0.3

## 0.0.5 (2026-08-29)

### 🚀 Features

- **observability:** add execution pipeline observability ([#145](https://github.com/sanshan/event-driven-platform/pull/145), [#140](https://github.com/sanshan/event-driven-platform/issues/140), [#141](https://github.com/sanshan/event-driven-platform/issues/141), [#144](https://github.com/sanshan/event-driven-platform/issues/144))

### 🩹 Fixes

- sync TypeScript project references ([52901ab](https://github.com/sanshan/event-driven-platform/commit/52901ab))

### 🧱 Updated Dependencies

- Updated @event-driven-platform/operation-event-envelope-factory to 0.0.8
- Updated @event-driven-platform/use-case-execution-store to 0.0.5
- Updated @event-driven-platform/observability to 0.0.2
- Updated @event-driven-platform/execution to 0.0.6
- Updated @event-driven-platform/operation to 0.1.6
- Updated @event-driven-platform/use-case to 0.0.5
- Updated @event-driven-platform/command to 0.0.7
- Updated @event-driven-platform/intent to 0.2.2
- Updated @event-driven-platform/clock to 0.0.7
- Updated @event-driven-platform/event to 0.1.5
- Updated @event-driven-platform/query to 0.0.6

### ❤️ Thank You

- Aleksandr Lihih @sanshan

## 0.0.4 (2026-08-25)

### 🚀 Features

- **use-case-executor:** forward invocation context ([b9d9675](https://github.com/sanshan/event-driven-platform/commit/b9d9675))
- **use-case-executor:** preserve context type ([88a05c3](https://github.com/sanshan/event-driven-platform/commit/88a05c3))
- **use-case-executor:** carry invocation context ([88591d4](https://github.com/sanshan/event-driven-platform/commit/88591d4))

### 🩹 Fixes

- **use-case-executor:** keep intent as test dependency ([fa44e31](https://github.com/sanshan/event-driven-platform/commit/fa44e31))
- **use-case-executor:** remove unused intent dependency ([da41633](https://github.com/sanshan/event-driven-platform/commit/da41633))

### 🧱 Updated Dependencies

- Updated @event-driven-platform/operation-event-envelope-factory to 0.0.7
- Updated @event-driven-platform/use-case-execution-store to 0.0.4
- Updated @event-driven-platform/execution to 0.0.5
- Updated @event-driven-platform/operation to 0.1.5
- Updated @event-driven-platform/use-case to 0.0.4
- Updated @event-driven-platform/command to 0.0.6
- Updated @event-driven-platform/intent to 0.2.1
- Updated @event-driven-platform/clock to 0.0.6
- Updated @event-driven-platform/event to 0.1.4
- Updated @event-driven-platform/query to 0.0.5

### ❤️ Thank You

- Aleksandr Lihih @sanshan

## 0.0.3 (2026-08-24)

### 🧱 Updated Dependencies

- Updated @event-driven-platform/operation-event-envelope-factory to 0.0.6
- Updated @event-driven-platform/use-case-execution-store to 0.0.3
- Updated @event-driven-platform/operation to 0.1.4
- Updated @event-driven-platform/use-case to 0.0.3
- Updated @event-driven-platform/command to 0.0.5
- Updated @event-driven-platform/intent to 0.2.0

## 0.0.2 (2026-08-22)

### 🚀 Features

- **use-case-executor:** export lease renewal contracts ([9655463](https://github.com/sanshan/event-driven-platform/commit/9655463))
- **use-case:** implement baseline executor flow ([#111](https://github.com/sanshan/event-driven-platform/pull/111))
- **use-case:** add use-case executor library ([6a8a382](https://github.com/sanshan/event-driven-platform/commit/6a8a382))

### 🧱 Updated Dependencies

- Updated @event-driven-platform/operation-event-envelope-factory to 0.0.5
- Updated @event-driven-platform/use-case-execution-store to 0.0.2
- Updated @event-driven-platform/execution to 0.0.4
- Updated @event-driven-platform/operation to 0.1.3
- Updated @event-driven-platform/use-case to 0.0.2
- Updated @event-driven-platform/command to 0.0.4
- Updated @event-driven-platform/intent to 0.1.3
- Updated @event-driven-platform/clock to 0.0.5
- Updated @event-driven-platform/event to 0.1.3
- Updated @event-driven-platform/query to 0.0.4

### ❤️ Thank You

- Aleksandr Lihih @sanshan
- sasha @aleksandr-cell