# Read

Read represents a business request for information.

Read is the fundamental read-side business abstraction.

Read describes what business information is required.

Read does not describe how the information is obtained.

## Purpose

Read answers:

```txt
What business information is required?
```

Read does not answer:

```txt
How is the information obtained?
Where is the information stored?
How is the Read executed?
```

## Responsibilities

Read is responsible for:

* identifying the requested business information
* carrying actor information
* carrying read parameters
* defining the expected result type at the type-system level

Read contains business intent only.

## Name

Every Read has a name.

The name identifies the kind of business information being requested.

Examples:

```txt
user.get
wallet.get
deposit.history.get
player.balance.get
bonus.details.get
```

Read names must use business language.

## Actor

Read carries the Actor on whose behalf the information is requested.

Actor is part of the business context of the Read.

## Parameters

Every Read carries the parameters required to describe the requested information.

Parameters are specific to the concrete Read.

Examples include:

* aggregate identifiers
* filters
* pagination parameters
* date ranges
* sorting criteria
* search terms
* projection parameters

Parameters must not contain execution or infrastructure concerns.

## Result type

Every Read defines the type of data it is expected to return.

The result type is part of the static Read contract.

It is not runtime data carried by the Read.

Examples:

```txt
GetUserRead -> UserView
GetDepositHistoryRead -> DepositHistoryPage
GetPlayerBalanceRead -> PlayerBalanceView
```

## Repeatability

Read must not modify business state.

Read must be safe to execute repeatedly.

Repeated execution is not required to return identical data because the underlying business state may change over time.

## Examples

Examples of Reads:

* Get User
* Get Wallet
* Get Deposit History
* Search Players
* Get Player Balance
* Get Bonus Details
* Get Account Overview

A Read may request:

* one aggregate
* multiple aggregates
* a projection
* a history
* a paginated collection
* a computed view
* data composed from multiple sources

Read is not limited to retrieving a single aggregate.

## Forbidden responsibilities

Read must not:

* access databases
* access external services
* access caches
* contain query logic
* contain cache logic
* contain execution logic
* contain infrastructure logic
* modify business state
* execute other Reads

## Execution

Read is transported through Query and executed by Reader.

Reads are never executed directly.

## Design rules

Reads must:

* use business language
* be immutable
* be reusable
* be serializable
* be deterministic in describing the requested information
* be safe to execute repeatedly
* express business intent only
