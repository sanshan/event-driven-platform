---
"@event-driven-platform/observability": major
"@event-driven-platform/reader": patch
---

Propagate Query correlation IDs through Reader observability.

Reader observations now carry the Query correlation ID across lifecycle, source, cache, retry, inflight, and distributed coordination events for trace and structured-log correlation without changing Read or handler contracts.
