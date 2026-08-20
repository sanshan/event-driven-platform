# @event-driven-platform/transaction-scope

> **Status: Internal.** This package is not part of the supported public package boundary.

Defines the transaction-scope abstraction used by internal transaction infrastructure to associate work with an active transaction context.

## Responsibility

`TransactionScope` owns the lifecycle boundary for entering and accessing transaction-scoped state. The package also exposes the typed error used when code attempts to activate a scope that is already active.

## Boundary

This is an internal infrastructure abstraction, not the consumer-facing Runner transaction port. Public execution composition depends on `@event-driven-platform/execution-transaction`; this package supports repository implementations behind that boundary.
