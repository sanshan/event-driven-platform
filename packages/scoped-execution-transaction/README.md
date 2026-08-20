# @event-driven-platform/scoped-execution-transaction

> **Status: Internal.** This package is not part of the supported public package boundary.

Provides the repository's scoped implementation layer for running `ExecutionTransaction` work with an active transaction scope.

## Responsibility

`ScopedExecutionTransaction` bridges the public execution-transaction contract to the repository's transaction-scope abstractions. It executes work inside the scope and translates commit/rollback behavior into the execution transaction outcome model.

`RollbackExecutionTransactionSignal` is an internal control signal used by this implementation.

## Boundary

This package is implementation infrastructure. External consumers should depend on `@event-driven-platform/execution-transaction` and provide/adapt their own implementation rather than treating this package as a supported public API.
