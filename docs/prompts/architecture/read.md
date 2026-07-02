# Read

Read represents a business request for information.

Read is the fundamental read-side abstraction.

Read describes what information is needed.

Read does not describe how information is obtained.

## Responsibilities

Read is responsible for:

* expressing read intent
* carrying read parameters
* carrying actor information
* carrying subject information

Read contains no infrastructure concerns.

## Examples

Examples:

* Get User
* Get Wallet
* Get Deposit History
* Get Player Balance
* Get Bonus Details

Reads should use business language.

## Required fields

A Read may contain:

* actor
* subject
* read parameters

## Forbidden responsibilities

Read must not:

* access databases
* access caches
* contain query logic
* contain infrastructure logic
* contain cache logic

## Execution

Reads are executed through Reader.

Reads are never executed directly.

## Design rules

Reads should:

* be reusable
* be deterministic
* be serializable
* express business intent only
