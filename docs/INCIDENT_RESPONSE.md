# Incident response

## Severity levels

- **Sev 1** — payment path broken / data loss / security breach. Drop everything. Page on-call. Public status update within 1 hour.
- **Sev 2** — feature broken, workaround exists. Fix within 24 hours. Status update if > 4 hours.
- **Sev 3** — cosmetic / edge case. Fix within the sprint.

## On-call

v1: one on-call (Billy). Later: rotation documented here.

## Runbook

1. **Acknowledge** the alert (Slack, PagerDuty, whatever).
2. **Triage**: is this Sev 1 / 2 / 3?
3. **Communicate**: post to `#incidents` Slack channel with "Investigating {symptom}."
4. **Investigate**: Sentry issue, Vercel logs, DB slow queries.
5. **Mitigate**: rollback (see `ROLLBACK.md`), hotfix, or feature flag.
6. **Verify**: confirm symptom is gone + no regressions.
7. **Close**: post "Resolved. Post-mortem to follow."
8. **Post-mortem within 48 hours** using the template below.

## Post-mortem template

```
# Incident 2026-NN — <one-line title>

## Summary
<what happened, duration, impact>

## Timeline (UTC)
- 14:32 Alert fires
- 14:40 Ack + triage
- 14:52 Root cause identified
- 15:05 Fix deployed
- 15:10 Verified resolved

## Root cause
<the actual why>

## What went well
- 3 concrete things

## What didn't
- 3 concrete things

## Action items (owner, ETA)
- [ ] …
- [ ] …
```

## Never in a post-mortem

- No names for blame. Name the decision, not the person.
- No "human error" as root cause — there's always a deeper system reason.
