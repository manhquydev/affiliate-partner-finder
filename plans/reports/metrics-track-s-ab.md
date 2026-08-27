# DIRECTIONAL — cohort n<200; gate runs but not a production throughput claim.

**Date:** 2026-08-27T02:14:06.128Z
**Cohort n:** 61 (paired 61)

## Wall-clock

- Control: 1098s
- Treatment (--probe-parallel): 685s
- Speedup: 37.6% (need ≥25%)

## Quality checks

| Check | Result |
|-------|--------|
| Throughput ≥25% | PASS |
| Golden FP=0 (treatment) | FAIL (non-blocking directional) |
| none@ok FN (no new path evidence) | PASS |
| same-row blocked→none ethics | PASS |
| true→false regression | PASS |
| cross-domain finalUrl | PASS |
| Both arms complete | PASS |

**Golden note:** Domain                          expected      got           conf     status  match
----------------------------------------------------------------------------------------
vecteezy.com                    affiliate     unknown       blocked  blocked  XX
nordicnest.se                   affiliate     affiliate     high     ok      OK
designbyamor.com                affiliate     affiliate     high     ok      OK
design-bestseller.de            affiliate     affiliate     high     ok      OK
madeindesign.com                partner_trade  unknown       blocked  blocked  XX
williamwoodmirrors.co.uk        partner_trade  partner_trade  medium   ok      OK
ozdesignfurniture.com.au        partner_trade  partner_trade  low      ok      OK
namly.dk                        none          none          high     ok      OK
finnishdesignshop.com           none          unknown       blocked  blocked  XX
thorvalddesign.com              none          (missing)   
mohd.it                         none          partner_trade  low      ok      XX
pazzodesign.it                  none          (missing)   
flinders.nl                     unknown       unknown       blocked  blocked  OK

Acceptance (docs/07 §5):
  golden verdict match : 7/11 present (of 13 golden)
  ❌ FAIL:
     - affiliate-high: 3/4 correct

## Paired verdict diffs

**Count:** 4
**true→false (regression):** 0

| domain | control | treatment |
|--------|---------|-----------|
| 99designs.com | true (affiliate) | unknown (unknown) |
| designkoti.com | unknown (unknown) | false (none) |
| designpple.com | false (none) | unknown (unknown) |
| learn.thedesignforchange.com | false (none) | unknown (unknown) |

**GATE: PASS (directional-throughput)**
