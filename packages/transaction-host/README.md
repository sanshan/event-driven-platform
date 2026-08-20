# @event-driven-platform/transaction-host

> **Status: Internal.** This package is not part of the supported public package boundary.

Defines the internal host boundary for accessing the transaction associated with the currently active transaction scope.

## Responsibility

`TransactionHost` exposes transaction access to infrastructure code that is already running inside a managed scope. `TransactionNotActiveError` makes attempts to access a missing active transaction explicit.

## Boundary

The host does not start or commit transactions and is not the public execution transaction port. Transaction lifecycle remains owned by the surrounding transaction implementation/orchestration.
