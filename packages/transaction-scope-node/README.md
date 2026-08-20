# @event-driven-platform/transaction-scope-node

> **Status: Internal.** This package is not part of the supported public package boundary.

Provides the Node.js implementation of the internal transaction-scope abstraction.

## Responsibility

`AsyncLocalTransactionScope` uses Node.js asynchronous context propagation to keep the active transaction scope available across asynchronous work without threading transaction state through every call explicitly.

## Boundary

This package is a runtime-specific implementation detail. It implements internal transaction scoping and is not the public `ExecutionTransaction` contract consumed by Runner integrations.
