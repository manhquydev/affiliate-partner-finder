# 06 — Data Schema & Export Format

## 1. Company (sau Collect)
```json
{
  "name": "Made In Design",
  "domain": "www.madeindesign.com",
  "trustScore": 4.2,
  "reviews": 13719,
  "trustpilotUrl": "https://www.trustpilot.com/review/www.madeindesign.com"
}
```

## 2. ScanResult (sau Scan)
```json
{
  "domain": "design-bestseller.de",
  "websiteUrl": "https://www.design-bestseller.de",
  "finalUrl": "https://www.design-bestseller.de/",
  "loadStatus": "ok",            // ok | blocked | timeout | error
  "verdict": "affiliate",         // affiliate | partner_trade | none | unknown
  "confidence": "high",           // high | medium | low | blocked
  "evidence": {
    "linkHits": [
      {"text":"Partnerprogramm","href":"https://ui.awin.com/merchant-profile/14674","kw":["partner","partnerprogramm"],"isStrong":true}
    ],
    "platformHits": ["awin"],
    "pathHits": [],
    "junkBaselineStatus": 404
  },
  "scannedAt": "2026-08-10T00:00:00Z",
  "detectorVersion": "1.0.0"
}
```

`timingsMs` (optional, CLI `--profile-timing`): `{ goto, settle, detector, probe, total }` milliseconds. Absent when the flag is off. Omitted from end-user CSV (`toSimpleCSV`).

## 3. Quy tắc verdict (deterministic — chống ảo giác)
```
if loadStatus != ok            → verdict=unknown, confidence=blocked
elif có linkHit.isStrong || platformHits không rỗng
                               → verdict=affiliate, confidence=high
elif pathHit strong (path chứa 'affiliat')  → verdict=affiliate, confidence=medium
elif có weak linkHit || weak pathHit (partner/trade/b2b/reseller)
                               → verdict=partner_trade, confidence=(pathHit?medium:low)
else                           → verdict=none, confidence=high
```

## 4. Export CSV (cột)
`domain, website, finalUrl, verdict, confidence, loadStatus, evidenceUrl, evidenceText, method, trustScore, reviews, scannedAt`

- `evidenceUrl`/`evidenceText`/`method`: lấy hit mạnh nhất; nếu nhiều, cột phụ hoặc JSON đính kèm.
- Mỗi dòng `confirmed` PHẢI có `evidenceUrl` mở được.

## 5. Export JSON
Mảng `ScanResult` đầy đủ để tái xử lý / audit.
