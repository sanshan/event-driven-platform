# Architecture Patterns

This directory contains prompts and AI instructions for architectural patterns and domain-driven design concepts used in the project.

**This project is an experimental backend platform and architectural research project.**

The goal is not to build a business application. The goal is to design, validate and implement a reusable execution and read platform for distributed systems.

The architecture is intentionally centered around Operations, Commands, Runner, Reads, Queries and Reader abstractions.

**You must preserve these concepts unless explicitly instructed otherwise.**

## Core Principles

The system consists of two independent pipelines:

**Write Side:**
Operation → Command → Runner

**Read Side:**
Read → Query → Reader

The architecture must maintain strict separation of concerns.

## Architecture Reference

Before implementing patterns or designing new components, read the corresponding file in this directory.

### Write Side Patterns

- Intent identification: `intent.md` - Deterministic execution identity
- Operation handling: `operation.md` - Atomic domain actions
- Command execution: `command.md` - Transport layer for operations
- Operation runner orchestration: `runner.md` - Centralized execution engine
- Result handling: `result.md` - Execution outcomes
- Event description: `event.md` - Business facts from operations
- Execution log tracking: `execution-log.md` - Persistent execution history
- Idempotency: `idempotency.md` - Repeated execution safety
- Outbox pattern: `outbox.md` - Reliable event delivery

### Read Side Patterns

- Read model building: `read.md` - Business information requests
- Query execution: `query.md` - Transport layer for reads
- Query reader interface: `reader.md` - Centralized read execution
- Read handler implementation: `read-handler.md` - Single-source data retrieval
- Cache writer strategy: `cache-writer.md` - Separated cache population
- Read result transformation: `read-result.md` - Read outcomes

### Orchestration

- Use case implementation: `use-case.md` - Business workflow orchestration

## Architectural Constraints

Do not simplify the architecture by:

- merging Operation and Command
- merging Read and Query
- allowing Operations to publish messages
- allowing Operations to execute Operations
- allowing Read Handlers to write caches
- bypassing Runner
- bypassing Reader

Always preserve separation of concerns.

## Design Principles

When proposing implementations:

- prefer explicit abstractions
- prefer composability
- prefer testability
- prefer deterministic behavior
- prefer observability

This project values architectural clarity over framework convenience.

