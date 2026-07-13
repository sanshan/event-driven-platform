# Outbox

Outbox is the persistent storage for Events produced by Operations.

Outbox belongs to the execution pipeline.

Outbox exists to guarantee reliable event delivery.

## Responsibilities

Outbox stores:

- event payload
- event metadata
- timestamps
- delivery state

Outbox is written by Runner.

## Event flow

Operation
→ Result
→ Runner
→ Outbox
→ CDC
→ Topic

Operations are unaware of this flow.

## Ownership

Operations create Events.

Runner persists Events.

CDC publishes Events.

Responsibilities must remain separated.

## Reliability

Outbox persistence must occur in the same transaction as business state changes.

Business state and Events must succeed or fail together.

## Event publishing

Outbox does not publish messages.

Publishing is delegated to CDC infrastructure.

Examples:

- Debezium
- CDC pipelines

## Design rules

Outbox should:

- be append-oriented
- support reliable delivery
- support replay
- support observability

Outbox should not contain business logic.
