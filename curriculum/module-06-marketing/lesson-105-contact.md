---
number: 105
slug: contact
title: Build /contact with Resend-backed form action
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 14
previous: 104
next: null
estimatedMinutes: 15
filesTouched:
  - src/routes/contact/+page.server.ts
  - src/routes/contact/+page.svelte
---

## Context

Simple contact form. Three fields (name, email, message). Form action validates input, calls Resend's HTTP API, returns `{sent: true}` on success.

When `RESEND_API_KEY` is empty (dev default) we log the submission and return success — lets students test the form-success UI flow without a live Resend account.

## The command

`src/routes/contact/+page.server.ts`:

```ts
export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const name = (form.get('name') ?? '').toString().trim();
    const email = (form.get('email') ?? '').toString().trim();
    const message = (form.get('message') ?? '').toString().trim();
    if (!name || !email || !message) return fail(400, { error: 'All fields are required.', values });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, { error: 'Enter a valid email.', values });

    if (!RESEND_API_KEY) { console.info('[contact] no key; skipping send'); return { sent: true }; }

    const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: {...}, body: JSON.stringify({...}) });
    if (!res.ok) return fail(502, { error: 'Send failed; email support@forgeschool.dev directly.', values });
    return { sent: true };
  }
};
```

`+page.svelte` renders the form + success/error states.

```bash
pnpm check
```

## Why we chose this — the PE7 judgment

**Alt 1: Formspree or similar.** Another vendor dependency. Resend is already in the stack.
**Alt 2: Pure SMTP.** Resend's HTTP API is simpler, faster, and provides deliverability reports.
**Alt 3: Client-side validation only.** Always re-validate server-side — client validation is UX, not security.

## What could go wrong

**Symptom:** Form submits but no email arrives.
**Cause:** `RESEND_FROM_EMAIL` domain not verified with Resend.
**Fix:** Verify the sending domain in the Resend dashboard.

## Verify

`pnpm check`. Submit the form in dev with an empty key → success state renders; check the server console for the log line.

## Mistake log

- Used a plain email regex — too strict (rejects some valid addresses). The used regex is pragmatic, not exhaustive.
- Sent the submission to the user instead of to support. Swapped.

## Commit

```bash
git add src/routes/contact/ curriculum/module-06-marketing/lesson-105-contact.md
git commit -m "feat(routes): /contact with Resend form action + lesson 105"
```
