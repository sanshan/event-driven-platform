---
"@event-driven-platform/observability": major
"@event-driven-platform/use-case": major
"@event-driven-platform/use-case-executor": major
---

Expose the stable UseCase name in execution and observability contracts.

UseCase implementations must now define a `readonly name`, and executor observations include that identity.
