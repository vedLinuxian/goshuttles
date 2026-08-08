---
name: agentic-loop-architecture
description: Guide to implementing autonomous AI Agent Loops (Think-Plan-Act-Observe-Evaluate-Repair) replacing prompt engineering with loop orchestration.
---

# Agentic Loop Architecture Skill

Prompt engineering is legacy single-turn coaxing. Modern AI systems use **Loop Architecture** and **Context Engineering** to achieve autonomous self-correction, continuous verification, and robust multi-step task execution.

## Core Pillars of AI Loop Architecture

### 1. The Autonomous Loop Cycle
Every loop in the engine follows a structured state machine:
```
[ Context Engineering ] -> [ Goal Analysis & Planning ] -> [ Action Execution ] -> [ Observation & Evaluator ] -> [ Self-Correction / Repair ] -> [ Telemetry Log ]
```

- **Context Engineering**: Curate the fresh state (DB models, current system metrics, active locks, telemetry) into the runtime context.
- **Goal Analysis & Planning**: Deconstruct the objective into atomic executable steps.
- **Action Execution**: Execute concrete actions (DB queries, API calls, state updates, event triggers).
- **Observation & Evaluator**: Compare actual output vs expected invariants. Check for errors, edge cases, or broken constraints.
- **Self-Correction / Repair**: If invariant checks fail, automatically calculate repair steps and retry up to max iterations.
- **Telemetry Log**: Record step trajectory, decision reasoning, execution duration, and success metrics.

## Autonomous Loops in GoShuttles

1. **Seat & Lock Self-Healing Loop (`seat-lock-loop`)**:
   - Continuously audits locked seats past expiration.
   - Cancels orphan pending bookings.
   - Restores seat availability and notifies connected clients via Pusher.

2. **Fleet & Dynamic Pricing Loop (`fleet-pricing-loop`)**:
   - Monitors occupancy rate across active scheduled routes.
   - Evaluates surge triggers based on demand spikes.
   - Adjusts seat pricing dynamically and flags under-allocated routes.

3. **Self-Healing Audit Loop (`self-healing-audit-loop`)**:
   - Scans system database for data anomalies (e.g. unverified UTR payments, missing tickets for confirmed bookings, driver wallet imbalances).
   - Automatically executes repair routines or alerts system administrators.

4. **Route Optimizer Loop (`route-optimizer-loop`)**:
   - Analyzes peak hour booking patterns.
   - Suggests and auto-schedules optimal departure slots and shuttle assignments.
