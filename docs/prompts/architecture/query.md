# Query

Query represents a request to execute a Read.

Query is the read-side execution envelope.

Query transports a Read together with execution context and execution options.

Query contains no business logic.

Query does not obtain data by itself.

## Purpose

Query answers:

```txt
Under which execution context and requirements should this Read be executed?
```

Read answers:

```txt
What business information is required?
```

## Responsibilities

Query is responsible only for carrying:

- Read
- QueryContext
- QueryOptions

Query does not interpret or execute the carried requirements.

## Public API

```ts
export interface Query<TRead extends AnyRead> {
    readonly read: TRead;

    readonly context: QueryContext;

    readonly options?: QueryOptions;
}
```

## QueryContext

QueryContext carries metadata associated with a particular read execution flow.

Initial public API:

```ts
export interface QueryContext {
    readonly correlationId: string;
}
```

QueryContext must contain only execution context currently required by the system.

Additional fields must not be added speculatively.

## Correlation

Every Query carries a correlation identifier through QueryContext.

The correlation identifier associates the Query execution with the wider execution flow that caused it.

Correlation metadata belongs to Query rather than Read because it describes execution context, not requested business information.

The same Read may be transported by different Queries with different correlation identifiers.

## QueryOptions

QueryOptions describe declarative requirements for Read execution.

Query carries these options but does not interpret or execute them.

Each option is described by its own architecture document.

## Query vs Read

Read describes the requested business information.

Query transports the Read through the read execution pipeline.

Example:

```txt
Read:
  GetWallet

Query:
  Execute GetWallet
  within a specific execution context
  using specific execution requirements
```

## Result type

Query does not independently define the result type.

Query preserves the result contract defined by its Read.

The result type must not be supplied independently by the Query creator.

## Allowed

Query may contain:

- Read
- QueryContext
- QueryOptions

## Forbidden

Query must not:

- contain business logic
- contain domain rules
- define requested business information
- access databases
- access external services
- access caches
- resolve Read Handlers
- execute Reads
- execute other Queries
- perform cache traversal
- populate caches
- call Use Cases
- independently define the Read result type

## Design rules

Queries must:

- be immutable
- be serializable
- contain no business logic
- preserve the concrete Read type
- preserve the Read result contract
- keep execution context separate from business intent
- keep execution options separate from Read parameters

## Core principle

Query is only:

```txt
A read-side execution envelope around a Read.
```

Its structure is:

```txt
Query
├── Read
├── QueryContext
└── QueryOptions
```

Query is not:

```txt
Business information request.
Read model.
Read Handler.
Execution engine.
Storage adapter.
```