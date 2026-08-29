## 0.2.3 (2026-08-29)

### 🧱 Updated Dependencies

- Updated @event-driven-platform/tenant-reference to 0.1.6
- Updated @event-driven-platform/types to 0.1.6

## 0.2.2 (2026-08-29)

### 🧱 Updated Dependencies

- Updated @event-driven-platform/tenant-reference to 0.1.5
- Updated @event-driven-platform/types to 0.1.5

## 0.2.1 (2026-08-25)

### 🧱 Updated Dependencies

- Updated @event-driven-platform/tenant-reference to 0.1.4
- Updated @event-driven-platform/types to 0.1.4

## 0.2.0 (2026-08-24)

### 💥 Breaking Changes

- **intent:** replace the instance-based `DefaultIntentFactory` API with the static `IntentFactory.create(...)` and `IntentFactory.derive(...)` API ([#129](https://github.com/sanshan/event-driven-platform/pull/129))

### Migration

Replace:

```ts
const intentFactory = new DefaultIntentFactory();

intentFactory.create(...);
intentFactory.derive(...);
```

with:

```ts
IntentFactory.create(...);
IntentFactory.derive(...);
```

Intent identity, canonical key generation, UUIDv5 generation, and derivation semantics remain unchanged.

## 0.1.3 (2026-08-22)

### 🚀 Features

- **intent:** add deterministic causal derivation ([#109](https://github.com/sanshan/event-driven-platform/pull/109))

### 🧱 Updated Dependencies

- Updated @event-driven-platform/tenant-reference to 0.1.3
- Updated @event-driven-platform/types to 0.1.3

### ❤️ Thank You

- Aleksandr Lihih @sanshan

## 0.1.2 (2026-08-21)

### 🧱 Updated Dependencies

- Updated @event-driven-platform/tenant-reference to 0.1.2
- Updated @event-driven-platform/types to 0.1.2

## 0.1.1 (2026-08-20)

### 🚀 Features

- add Runner flow ([#8](https://github.com/sanshan/event-driven-platform/pull/8))
- add guard options and retry strategy interfaces with correspond… ([#3](https://github.com/sanshan/event-driven-platform/pull/3))
- add initial implementation of actor, subject, and operation modules with corresponding factories and schemas ([a593740](https://github.com/sanshan/event-driven-platform/commit/a593740))

### 🧱 Updated Dependencies

- Updated @event-driven-platform/tenant-reference to 0.1.1
- Updated @event-driven-platform/types to 0.1.1

### ❤️ Thank You

- Aleksandr Lihih @sanshan
- sasha @aleksandr-cell

## 0.1.0 (2026-08-20)

### 🚀 Features

- add Runner flow ([#8](https://github.com/sanshan/event-driven-platform/pull/8))
- add guard options and retry strategy interfaces with correspond… ([#3](https://github.com/sanshan/event-driven-platform/pull/3))
- add initial implementation of actor, subject, and operation modules with corresponding factories and schemas ([a593740](https://github.com/sanshan/event-driven-platform/commit/a593740))

### ❤️ Thank You

- Aleksandr Lihih @sanshan
- sasha @aleksandr-cell