# Subject

Subject represents the business entity affected by a domain action.

Subject identifies whose state, data, rights or business interests are affected.

Subject is part of the business context.

## Purpose

Subject answers:

```txt
Who or what business entity is affected?
```

## Responsibilities

Subject is responsible only for identifying the affected business entity.

Subject may represent:

* user
* tenant
* organization
* merchant
* account owner
* player

## Identity

Subject must contain enough information to identify the affected business entity.

Subject identity must be stable and serializable.

## Design rules

Subject must:

* use business language
* be immutable
* be serializable
* represent one affected business entity
* contain no execution logic
* contain no infrastructure logic
