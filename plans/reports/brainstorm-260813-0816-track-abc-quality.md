# Brainstorm: Track priority for APF quality upgrade

**Timestamp:** 2026-08-13 08:16 +07  
**Inputs:** R1 red-team + validate; research-260813-0802; live CSV (~3659 rows)

## Contract

| Field | Content |
|-------|---------|
| **Outcome** | Delivery sequence locked: **Track A shipped first** (network evidence + MutationObserver settle) with measurable FN↓ on `loadStatus=ok`; **Track B** (blocked/timeout/HITL) runs as **parallel ops**, not same code sprint. |
| **Constraints** | TS+Playwright; concurrency≤3; no CF bypass; don't kill 10k scan; CLI-first; golden FP=0; settle budgeted so ETA doesn't explode. |
| **Non-goals** | Port Crawl4AI/browser-use; LLM-on-unknown; raising concurrency; claiming unknown%↓ from network/MO alone. |
| **Acceptance** | Plan phases for Track A only (cookable); Track B = ops checklist + optional follow-up plan; metrics tables in plan. |

## Answer to A / B / C

**Chọn C — A trước, B song song ops.**

| Option | Why not / why |
|--------|----------------|
| **A only** | Correct code focus but ignores 31.3% unknown = access failures hurting product + ETA. |
| **B only** | Highest unknown lever, but leaves platformHits 12/160 and false-`none` pool (1739) unaddressed — research/xia work wasted. |
| **C (chosen)** | Matches evidence: **two different root causes**. Code sprint = Track A. Ops/monitor sprint = Track B without ethics drift. |

### Track A (implement via plan → cook)

1. Network host listener (`page.on` request/response) + platform/CDN table → `method=network`  
2. MutationObserver + short scroll settle (flag + budget)  
3. Metrics: ↑ platformHits on ok; lift `none→affiliate|partner_trade` on sample; golden FP=0  

### Track B (ops parallel — not blocked on A)

1. Watch shard age / relaunch; investigate ~21/h cool-down  
2. HITL CF on virtual display when blocked spike  
3. Timeout/budget tuning only with measured before/after — separate mini-plan later  

## Approaches compared

1. **Big-bang A+B in one plan** — mixes KPIs; red-team will fail clarity.  
2. **A-only product plan** — clean but abandons unknown.  
3. **C split planes** — recommended: product plan = A; ops runbook = B.

## Recommendation

Proceed **`ak:plan` Track A** immediately; spawn Herdr pane for **Track B ops monitor notes** (no product code). After plan red-team+validate PASS → implement panes → cook → test → review → ship.

## Risks

- Settling every page slows 10k further while rate already cooling.  
- Network FP hosts → must reuse `isPlatformHost` rules + golden.  
- Extension parity deferred (CLI-first) — document gap.

## Handoff

→ `ak:plan` slug: `network-lazy-settle-quality-track-a`  
→ Parallel Herdr: plan-rt / plan-vd after scaffold  
→ Track B: ops note only in this session unless user opens separate plan
