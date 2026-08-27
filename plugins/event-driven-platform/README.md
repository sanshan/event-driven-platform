# Event Driven Platform Claude Code plugin

This plugin provides the `using-event-driven-platform` skill for repositories that consume `@event-driven-platform/*` packages.

The skill is procedural guidance. Event Driven Platform repository documentation and the exact package versions installed by the consumer remain authoritative for architecture and public APIs.

## Install

In Claude Code, add this repository as a marketplace:

```text
/plugin marketplace add sanshan/event-driven-platform
```

Then install the plugin:

```text
/plugin install event-driven-platform@event-driven-platform
```

## Use

The skill is model-invoked when a task involves designing, implementing, reviewing, or debugging code that consumes Event Driven Platform packages.

It can also be invoked explicitly when needed:

```text
/using-event-driven-platform
```

The plugin intentionally contains no hooks, commands, agents, MCP servers, generators, or runtime code.
