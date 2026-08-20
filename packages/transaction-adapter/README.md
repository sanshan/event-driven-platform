# @event-driven-platform/transaction-adapter

> **Status: Internal.** This package is not part of the supported public package boundary.

Defines the internal adapter contract used to connect transaction-scope infrastructure to a concrete transaction implementation.

## Responsibility

`TransactionAdapter` provides the operations required by the internal transaction layer to begin and control a concrete transaction while keeping higher-level execution code independent of a database client or ORM.

## Boundary

This is repository infrastructure, not a supported consumer API. External applications integrate Runner through the public `@event-driven-platform/execution-transaction` contract rather than depending on this adapter package.
