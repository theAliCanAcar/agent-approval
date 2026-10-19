/**
 * Approval policy: glob-ish patterns matched against the action name.
 *
 *   const policy = {
 *     autoApprove: ["read_*", "search_*", "draft_*"],
 *     requireApproval: ["send_*", "delete_*", "purchase_*", "publish_*"],
 *   };
 *
 * requireApproval wins over autoApprove. Unmatched actions default to
 * `defaultRequireApproval` (false = auto-approved).
 */
export type ApprovalPolicy = {
  autoApprove?: string[];
  requireApproval?: string[];
  defaultRequireApproval?: boolean;
};

export type ApprovalDecision = "auto_approved" | "required" | "denied" | "approved";

export type ApprovalRequest = {
  action: string;
  description: string;
  payload?: unknown;
};

export type ApprovalResponse = {
  approved: boolean;
  reason?: string;
  decision?: ApprovalDecision;
};

/** Asks a human (UI, Slack, CLI prompt, ...) and resolves to a decision. */
export type ApprovalPrompt = (
  req: ApprovalRequest
) => Promise<ApprovalResponse> | ApprovalResponse;

export type ApprovalLogEntry = {
  request: ApprovalRequest;
  decision: ApprovalDecision;
  reason?: string;
  at: string;
};

export type ApprovalGate = {
  policy: ApprovalPolicy;
  /** Ask for approval on one action (runs the policy first). */
  request(req: ApprovalRequest): Promise<ApprovalResponse>;
  /** Policy-only check, no prompting. */
  evaluate(action: string): ApprovalDecision;
  /** Everything that happened, for audit/debugging. */
  log(): ApprovalLogEntry[];
};

export function createApproval(options: {
  policy?: ApprovalPolicy;
  prompt?: ApprovalPrompt;
}): ApprovalGate {
  const policy = options.policy ?? {};
  const entries: ApprovalLogEntry[] = [];

  function evaluate(action: string): ApprovalDecision {
    if (matchesAny(policy.requireApproval, action)) return "required";
    if (matchesAny(policy.autoApprove, action)) return "auto_approved";
    return policy.defaultRequireApproval ? "required" : "auto_approved";
  }

  return {
    policy,
    evaluate,
    async request(req: ApprovalRequest): Promise<ApprovalResponse> {
      const decision = evaluate(req.action);
      if (decision === "auto_approved") {
        record({ request: req, decision: "auto_approved", at: now() });
        return { approved: true, decision: "auto_approved", reason: "Policy auto-approved." };
      }
      if (!options.prompt) {
        record({ request: req, decision: "denied", reason: "No approval prompt configured.", at: now() });
        return {
          approved: false,
          decision: "denied",
          reason: "Approval required but no approval prompt is configured.",
        };
      }
      const response = await options.prompt(req);
      const finalDecision: ApprovalDecision = response.approved ? "approved" : "denied";
      record({ request: req, decision: finalDecision, reason: response.reason, at: now() });
      return { ...response, decision: finalDecision };
    },
    log: () => [...entries],
  };

  function record(entry: ApprovalLogEntry) {
    entries.push(entry);
  }
}

/** Default policy from the spec: reads/searches/drafts flow, side effects pause. */
export const defaultApprovalPolicy: ApprovalPolicy = {
  autoApprove: ["read_*", "search_*", "draft_*", "list_*", "get_*", "query_*"],
  requireApproval: ["send_*", "delete_*", "purchase_*", "publish_*", "update_*", "create_*"],
  defaultRequireApproval: true,
};

function matchesAny(patterns: string[] | undefined, action: string): boolean {
  return (patterns ?? []).some((pattern) => globMatch(pattern, action));
}

/** Supports `*` wildcards only — intentionally tiny. */
function globMatch(pattern: string, value: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

function now(): string {
  return new Date().toISOString();
}