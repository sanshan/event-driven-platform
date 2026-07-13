# Query

Query transports a Read through the read pipeline.

Query is the read-side equivalent of Command.

Query is infrastructure-oriented.

## Responsibilities

Query carries:

- Read
- cache strategy
- consistency requirements
- timeout settings
- execution options

Query contains no business logic.

## Execution

Query is executed by Reader.

Query does not perform reads itself.

## Allowed responsibilities

Query may define:

- cache preferences
- consistency requirements
- timeout configuration
- execution metadata

## Forbidden responsibilities

Query must not:

- access storage
- contain business logic
- perform reads
- update caches

## Design rules

Queries should:

- be immutable
- be deterministic
- be serializable
- separate read intent from execution concerns
