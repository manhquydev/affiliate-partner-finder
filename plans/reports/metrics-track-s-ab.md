# Track S A/B gate

**Date:** 2026-08-28T12:16:09.409Z
**Cohort n:** 200 (paired 200)

## Wall-clock

- Control: 459s
- Treatment (--probe-parallel): 5312s
- Speedup: -1057.3% (need ≥25%)

## Quality checks

| Check | Result |
|-------|--------|
| Throughput ≥25% | FAIL |
| Golden FP=0 (treatment) | FAIL |
| none@ok FN (no new path evidence) | PASS |
| same-row blocked→none ethics | PASS |
| true→false regression | PASS |
| cross-domain finalUrl | FAIL (1) |
| Both arms complete | PASS |

**Golden note:** Domain                          expected      got           conf     status  match
----------------------------------------------------------------------------------------
vecteezy.com                    affiliate     unknown       blocked  timeout  XX
nordicnest.se                   affiliate     unknown       blocked  timeout  XX
designbyamor.com                affiliate     unknown       blocked  timeout  XX
design-bestseller.de            affiliate     unknown       blocked  timeout  XX
madeindesign.com                partner_trade  unknown       blocked  timeout  XX
williamwoodmirrors.co.uk        partner_trade  unknown       blocked  timeout  XX
ozdesignfurniture.com.au        partner_trade  unknown       blocked  timeout  XX
namly.dk                        none          unknown       blocked  timeout  XX
finnishdesignshop.com           none          unknown       blocked  timeout  XX
thorvalddesign.com              none          unknown       blocked  timeout  XX
mohd.it                         partner_trade  unknown       blocked  timeout  XX
pazzodesign.it                  none          unknown       blocked  timeout  XX
flinders.nl                     unknown       unknown       blocked  timeout  OK

Acceptance (docs/07 §5):
  golden verdict match : 1/13 present (of 13 golden)
  ❌ FAIL:
     - affiliate-high: 0/4 correct

## Paired verdict diffs

**Count:** 121
**true→false (regression):** 0

## Cross-domain rows (treatment)

- quin.design → https://www.quinwithin.com/

| domain | control | treatment |
|--------|---------|-----------|
| amoredesign.it | true (partner_trade) | unknown (unknown) |
| artelia.de | true (partner_trade) | unknown (unknown) |
| bespokeglazingdesign.co.uk | false (none) | unknown (unknown) |
| boxifydesign.com | false (none) | unknown (unknown) |
| brisach.com | true (partner_trade) | unknown (unknown) |
| chicinterior.co.uk | false (none) | unknown (unknown) |
| closetsbydesign.com | false (none) | unknown (unknown) |
| customdesigngenius.com | false (none) | unknown (unknown) |
| deirdresdesign.com | false (none) | unknown (unknown) |
| delijn.be | true (partner_trade) | unknown (unknown) |
| denneheydesign.com | true (partner_trade) | unknown (unknown) |
| dentaldesignturkey.com | false (none) | unknown (unknown) |
| design-market.eu | false (none) | unknown (unknown) |
| design-mode.com | false (none) | unknown (unknown) |
| design-prodigy.com | false (none) | unknown (unknown) |
| designadvisors.io | false (none) | unknown (unknown) |
| designaglow.com | true (affiliate) | unknown (unknown) |
| designastero.com | false (none) | unknown (unknown) |
| designbundles.net | true (affiliate) | unknown (unknown) |
| designbyamor.com | true (affiliate) | unknown (unknown) |
| designbysi.dk | false (none) | unknown (unknown) |
| designcosmics.com | false (none) | unknown (unknown) |
| designcreatic.com | true (partner_trade) | unknown (unknown) |
| designeroptics.com | true (affiliate) | unknown (unknown) |
| designersofas.com | false (none) | unknown (unknown) |
| designessentials.com | true (affiliate) | unknown (unknown) |
| designfabrikhamburg.de | true (partner_trade) | unknown (unknown) |
| designforce.co | true (partner_trade) | unknown (unknown) |
| designginie.com | false (none) | unknown (unknown) |
| designhandel.no | true (partner_trade) | unknown (unknown) |

_…91 more_

**GATE: FAIL**
