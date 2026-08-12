# Agent Tools Architecture

This project currently supports public web search and public page extraction. Browser automation, computer control, and terminal execution must be introduced behind explicit server-side connectors and approval checkpoints rather than running arbitrary actions in the web process.

## Tool boundaries

| Tool | Initial scope | Required safeguard |
|---|---|---|
| `web_search` | Search public web results | Query length limit, timeout, source URLs |
| `open_public_page` | Read public HTTP(S) pages | HTTP(S)-only validation, response limit, timeout, no private sessions |
| `browser_operator` | Navigate an isolated browser session | Allowlisted domains, screenshot/log stream, approval before submit/download/delete |
| `computer_operator` | Mouse/keyboard in an isolated desktop | Ephemeral VM, visible action plan, emergency stop, time limit |
| `terminal_exec` | Run approved commands in a sandbox | Command allowlist, workspace-only filesystem, CPU/memory/time limits |
| `request_approval` | Pause before sensitive actions | Persistent decision record, single-use scope, audit event |

## Run state model

Each agent run should have a server-owned `runId` and append-only events: `run.created`, `plan.ready`, `tool.started`, `tool.output`, `approval.required`, `approval.resolved`, `artifact.created`, `run.paused`, `run.failed`, and `run.completed`. The client should render these events in the TaskPanel and support pause, stop, retry, and resume without relying on local UI state alone.

## Browser operator contract

The browser connector should accept `{ runId, url, action, selector?, value? }` and return `{ screenshotUrl?, title?, url, text?, blockedReason? }`. Read-only navigation may execute automatically. Form submission, file upload, account changes, deletion, publishing, messaging, payments, and downloads that leave the workspace must return `approval.required` before execution.

## Computer and terminal contract

Computer and terminal tools must run in an isolated environment, never in the production web server. The sandbox should mount only a temporary project workspace, redact environment secrets from output, reject shell chaining and destructive commands by default, and terminate processes on timeout. Every action must emit an event and be visible in the run inspector.

## Connector permissions

Connectors should declare scopes such as `read:web`, `write:github`, `read:drive`, or `send:email`. A project can grant a connector only the scopes it needs. Tokens must remain server-side, never be sent to the browser, and be revocable from a Settings > Connectors screen.

## Implementation order

1. Move approval records and run events from localStorage into a server-backed store.
2. Add a connector registry and scoped permission checks.
3. Add an isolated terminal service with allowlisted commands and streamed logs.
4. Add an isolated browser service with read-only navigation first.
5. Add computer actions only after browser sessions, approvals, stop controls, and audit events are reliable.
