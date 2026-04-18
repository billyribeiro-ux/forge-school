---
number: 1
slug: spec-the-product
title: Spec the product before writing a single line of code
module: 1
moduleSlug: foundation
moduleTitle: Foundation
phase: 1
step: 1
previous: null
next: 2
estimatedMinutes: 15
filesTouched:
  - docs/SPEC.md
---

## Context

Every production codebase that survives longer than six months started with a decision about what it is and what it is not. ForgeSchool is a fullstack learning platform that teaches students how to build a production-grade membership platform with WooCommerce-equivalent functionality. The platform itself is the worked example — you are reading this lesson on the very site it describes how to build.

Before we touch a terminal, we write the product specification. SPEC.md defines every functional requirement, every non-functional constraint, the database schema at a high level, the route architecture, and the success criteria the finished product must meet. This document is the contract between your past self (who understood the full picture) and your future self (who is deep in a Stripe webhook handler at 2am and needs to know what "done" looks like).

If you skip this step, you will build features that contradict each other. You will wire up payment flows that don't match the membership tiers. You will design a database schema that can't support the cart system you need. The spec prevents all of this by forcing every decision into one document before any code exists.

This lesson produces `docs/SPEC.md` — the single source of truth for everything ForgeSchool must do.

## The command

Create the docs directory and write the spec:

```bash
mkdir -p docs
```

Create `docs/SPEC.md` with the following content:

```markdown
# ForgeSchool — Product Specification

**Version:** 1.0.0
**Author:** Billy Ribeiro
**Date:** 2026-04-17
**Status:** Active

---

## 1. Product Overview

ForgeSchool is a fullstack learning platform that teaches students how to build
a production-grade membership platform with WooCommerce-equivalent functionality
at PE7 Distinguished standard.

### 1.1 Core Value Proposition

Most coding courses teach toy projects with toy patterns. ForgeSchool teaches
real engineering judgment: why one approach survives 10 years and another
collapses under its own weight.

### 1.2 Target Audience

Intermediate-to-advanced developers who can write code but want to learn
enterprise-grade decision-making.

### 1.3 Business Model

- Free tier: Browse all lessons without authentication (v1)
- Pro tier: Future — gated content, private Discord, office hours
- Lifetime tier: Future — one-time payment, permanent access

v1 ships auth-free. Stripe integration is fully wired in test mode.
```

The full spec continues for 7 sections covering functional requirements (content system, product catalog, cart, payments, memberships, marketing site, developer experience), non-functional requirements (performance, accessibility, security, reliability, maintainability), technical architecture (stack, database schema, route map), content architecture (curriculum structure, lesson format), deployment environments, and success criteria.

What just happened: we created a single document that captures the entire scope of ForgeSchool. Every route, every database table, every Stripe webhook event, every accessibility requirement — all written down before a single `npm init` or `pnpm create`. This document will be referenced in every future lesson when we need to justify why a particular design decision was made.

## Why we chose this — the PE7 judgment

**Alternative 1: Start coding immediately, spec as you go**
This is what 90% of side projects do. You open a terminal, scaffold a project, and start building. The problem reveals itself around lesson 30: you realize your database schema doesn't support the cart system you need, your route architecture conflicts with your membership tiers, and your Stripe integration assumptions were wrong from the start. You either refactor everything (wasting 20 hours) or live with architectural debt that compounds for the life of the project. A spec takes 15 minutes and prevents weeks of rework.

**Alternative 2: Use a project management tool (Linear, Notion, Jira) instead of a markdown file**
Project management tools are for tracking work in progress across a team. A spec is a reference document. It needs to live in the repo, be versioned with git, be readable without a login, and be diffable in pull requests. The moment your spec lives outside the repo, it drifts from reality. Markdown in `docs/` is the only format that meets all four criteria.

**Alternative 3: Write user stories instead of a specification**
User stories ("As a student, I want to browse lessons so that I can learn") are a communication format for product managers talking to engineers. They are not an engineering artifact. They don't capture non-functional requirements, they don't define the database schema, they don't specify the route architecture. A PE7 spec does all of this in one document. User stories are a subset of what we need, not a replacement.

The PE7 choice — a comprehensive markdown spec in the repo — wins because it is versionable, diffable, portable, and complete. No external tool dependency, no format translation, no information loss.

## What could go wrong

**Symptom:** You write a spec that's too vague ("the app should handle payments")
**Cause:** Fear of committing to specifics before you've built anything.
**Fix:** Be concrete. Name the Stripe events you'll handle. List the database tables. Specify the routes. Vagueness in a spec is a bug, not a feature. You can always update the spec — that's why it's in git.

**Symptom:** The spec becomes outdated within a week
**Cause:** You changed your mind about a feature but didn't update the spec.
**Fix:** Treat the spec like code. When you change behavior, update the spec in the same commit. The spec is not a historical document — it is the current contract.

**Symptom:** You spend three days perfecting the spec before writing any code
**Cause:** Analysis paralysis. The spec should capture decisions, not explore possibilities.
**Fix:** Time-box the spec to one session (under an hour). It will be wrong in places. That's fine — you'll update it as you build. The goal is a starting point, not a final answer.

## Verify

```bash
# Confirm the file exists and has meaningful content
cat docs/SPEC.md | head -5
```

Expected output:
```
# ForgeSchool — Product Specification

**Version:** 1.0.0
**Author:** Billy Ribeiro
**Date:** 2026-04-17
```

```bash
# Confirm all 7 major sections are present
grep -c "^## " docs/SPEC.md
```

Expected output: `7` (Product Overview, Functional Requirements, Non-Functional Requirements, Technical Architecture, Content Architecture, Deployment, Success Criteria)

## Mistake log — things that went wrong the first time I did this

- **Forgot non-functional requirements.** First draft only covered features. Had to go back and add performance targets (Lighthouse 95+), accessibility (WCAG 2.1 AA), and security (webhook signature verification). A spec without non-functionals is a feature list, not a specification.
- **Listed technologies without justifying them.** First draft said "PostgreSQL" without explaining why not SQLite or MySQL. Added the stack table but the real justifications come in later lessons where each tool is installed.
- **Made the database schema too detailed too early.** First draft had full column definitions. Pulled it back to entity-level descriptions because the detailed schema belongs in lesson 020 when we write the actual Drizzle schema. The spec should describe *what* exists, not *how* it's implemented.

## Commit this change

```bash
git add docs/SPEC.md
git add curriculum/module-01-foundation/lesson-001-spec-the-product.md
git commit -m "docs: write product specification + lesson 001

- Adds docs/SPEC.md with full ForgeSchool product specification
- Authors curriculum/module-01-foundation/lesson-001-spec-the-product.md
- Covers functional requirements, non-functional constraints, tech stack,
  route architecture, database schema overview, and success criteria"
```

With the spec in place, we have a contract for every decision that follows. Lesson 002 creates the project folder and initializes git — the first real engineering step.
