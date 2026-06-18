# Read Result

Read Result is the outcome returned by a Read Handler.

Read Result describes what was found and what Reader should do next.

Read Result is the contract between Read Handlers and Reader.

## Responsibilities

Read Result is responsible for:

* describing hit or miss status
* returning data
* returning cache population instructions
* returning read metadata

Read Result contains no execution logic.

## Hit

A hit means data was successfully found.

A hit may contain:

* data
* cache population instructions
* metadata

A hit does not automatically stop execution.

Reader decides how to continue.

## Miss

A miss means data was not found in the current source.

Examples:

* cache miss
* Redis miss
* database miss

A miss is a valid outcome.

A miss is not an error.

## Data

Read Result may contain:

* entity
* collection
* projection
* snapshot

The shape depends on the Read being executed.

## Cache population instructions

Read Result may indicate:

* populate L1 cache
* populate Redis
* populate additional cache layers

Read Result does not perform cache updates.

Reader interprets these instructions.

## Reader interaction

Reader evaluates Read Results.

Based on Read Result, Reader may:

* stop execution
* continue traversal
* invoke Cache Writers
* return data

Read Handlers do not make orchestration decisions.

## Forbidden responsibilities

Read Result must not:

* update caches
* call Cache Writers
* call Readers
* execute handlers
* contain infrastructure logic

Read Result is a data structure only.

## Design rules

Read Results should:

* be immutable
* be deterministic
* be serializable
* clearly describe read outcomes
* support cache population orchestration
