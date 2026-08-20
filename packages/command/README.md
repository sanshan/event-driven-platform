# @event-driven-platform/command

Defines the transport envelope that carries an Operation and execution policy to Runner.

## Installation

```bash
pnpm add @event-driven-platform/command
```

## Role

`Command` is the middle boundary of the write pipeline:

```text
Operation -> Command -> Runner
```

It carries an Operation plus execution options/context. It contains no business logic.

## API

- `Command` — Operation execution envelope.
- `CommandOptions` — execution policy options, including supported guard, rate-limit, timeout, and retry configuration.
- `CommandContext` — execution context associated with the Command.

Construct Commands at the application boundary and pass them to `Runner.execute()`. Do not execute Operation handlers directly to reproduce Runner behavior.

## Related documentation

See [`docs/architecture/README.md`](../../docs/architecture/README.md) and [`docs/execution-public-api.md`](../../docs/execution-public-api.md).
