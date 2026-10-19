# Agent Approval

Human-in-the-loop approval gate with pattern-based policies (auto-approve reads, require approval for side effects).

TypeScript package `agent-approval`.

## Install

```sh
npm install github:theAliCanAcar/agent-approval#main
```

## How to use

```ts
import { createApproval, defaultApprovalPolicy } from 'agent-approval';

const approval = createApproval({
  policy: defaultApprovalPolicy,
  prompt: async (req) => ({ approved: req.action.startsWith('draft_'), reason: 'demo' }),
});

console.log(await approval.request({ action: 'send_email', description: 'Email a customer' }));
console.log(await approval.request({ action: 'read_invoice', description: 'Read invoice' }));
```

## Use cases

### 1. Auto-approve reads, gate writes

- **Scenario:** An agent can search and draft freely but must not send email alone.
- **Outcome:** Match send_* against requireApproval and prompt a human before side effects.

### 2. Keep an approval trail

- **Scenario:** Compliance asks why a purchase ran.
- **Outcome:** Inspect the approval log for decision, reason, and timestamp.

## Dependencies

No package dependencies.

## Scripts

```sh
npm install
npm run build
```

## Notes

- Keep API keys in environment variables or a gitignored `.env`. Never commit secrets.
- Side-effecting tools should go through approval when used with `agent-approval`.
- Related packages live in separate repositories under [theAliCanAcar](https://github.com/theAliCanAcar).

## License

MIT
