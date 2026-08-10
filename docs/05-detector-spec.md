# 05 — Detector Specification

## 0. Nguyên tắc
Detector phải **deterministic** và **evidence-first**: mọi verdict suy ra từ dữ liệu quan sát được, kèm bằng chứng. Không phỏng đoán khi thiếu dữ liệu → trả `unknown`.

## 1. Đầu vào / đầu ra
- Input: chạy trong context của trang website đích đã load.
- Output: object `evidence` + `verdict` + `confidence` (xem 06-data-schema).

## 2. Bộ từ khoá đa ngôn ngữ (config, mở rộng được)
### strong (⇒ affiliate)
`affiliate, affiliates, affiliation, affiliazione, affiliati, afiliado, affiliat`
(+ German `partnerprogramm` xem là strong vì thường = affiliate)
### weak (⇒ partner/trade, cần review)
`partner, partners, partnership, ambassador, referral, reseller, revendeur, wholesale, grossiste, grosshandel, haendler, rivenditore, trade, stockist, b2b, professionnel, zakelijk, samarbejde, samarbete, partnerskab, forhandler, aterforsaljare, jalleenmyyja`

> Ghi chú: `partner` một mình là WEAK (dễ nhầm "our partners"). Chỉ nâng lên strong khi đi kèm "program/programme/programm" hoặc trỏ tới affiliate platform.

## 3. Danh sách affiliate platform (outbound host) — strong
`awin, uppromote, refersion, goaffpro, shareasale, cj.com, impact.com, partnerize, tradedoubler, webgains, tradetracker, daisycon, belboon, financeads, commissionfactory, rakutenadvertising, flexoffers, tapfiliate, firstpromoter, leaddyno, affiliatly, post-affiliate, pepperjam`
(Đã kiểm chứng thật: uppromote, awin.)

## 4. Danh sách path probe (config)
### generic
`/affiliate, /affiliates, /affiliate-program, /affiliate-programme, /partner, /partners, /partner-program, /partnership, /affiliation, /referral, /ambassador`
### shopify-style
`/pages/affiliate, /pages/affiliates, /pages/affiliate-program, /pages/partner, /pages/trade, /pages/wholesale`
### localized
`/affiliazione, /affiliati, /programma-affiliazione (IT); /partenaires, /affiliation (FR); /partnerprogramm, /affiliate-programm (DE); /aterforsaljare, /partnerprogram (SE); /forhandler, /partnerskab (DK); /partnerprogramma (NL)`

## 5. Thuật toán
```
function detect():
  # Lớp 1: link-scan
  links = all <a> {text, href}
  for l in links:
     matchStrong = strong.any(k in text|href)
     matchWeak   = weak.any(k in text|href)
     matchPlat   = platforms.any(p in href)
     if any → push linkHit{text,href,kw,isStrong: matchStrong||matchPlat, platform}

  # Lớp 2: junk baseline (bắt buộc trước path-probe)
  junkStatus = fetch(origin + '/zzq-' + random)  → status

  # Lớp 3: path-probe
  for p in pathList:
     r = fetch(origin + p, redirect:follow)
     if r.status != junkStatus and r.status in [200,301,302]:
        pathHit{path, status, finalUrl, isStrong: 'affiliat' in path}

  return classify(linkHits, platformHits, pathHits, junkStatus, loadStatus)
```

## 6. classify() — bảng quyết định (chống ảo giác)
| Điều kiện | verdict | confidence |
|---|---|---|
| loadStatus != ok | unknown | blocked |
| có linkHit.isStrong HOẶC platformHits | affiliate | high |
| có pathHit.isStrong (path chứa 'affiliat') | affiliate | medium |
| có weak linkHit VÀ có weak pathHit | partner_trade | medium |
| chỉ weak linkHit HOẶC chỉ weak pathHit | partner_trade | low |
| không hit nào & load ok & junkStatus hợp lệ | none | high |
| junkStatus == 200 (soft-404 nghi ngờ) | hạ tin cậy path-probe, chỉ dùng link/platform | — |

## 7. Phát hiện bot-block (trước khi kết luận none)
Đánh dấu `loadStatus=blocked` nếu BẤT KỲ:
- document.title chứa: "Just a moment", "Attention Required", "Verifying", "Access denied", "Cloudflare", "顧客", "잠시".
- `document.querySelectorAll('a').length < 5` sau khi load complete.
- body text chứa "Enable JavaScript and cookies to continue" / "checking your browser".
⇒ KHÔNG bao giờ trả `none` khi `blocked`.

## 8. Edge cases đã gặp (thật)
- **Redirect đổi TLD/ngôn ngữ** (thorvald.com→.co.uk, mohd.it→/en/): ghi finalUrl; path-probe theo origin sau redirect.
- **404 body nặng** (namly 695KB): CHỈ dùng HTTP status, không dùng độ dài.
- **Affiliate nested path** (nordicnest /om-oss/affiliate/): link-scan bắt, path-probe generic không → cần cả hai.
- **Weak-only** (ozdesign trade, williamwood trade+partner): giữ ở partner_trade, đừng nâng affiliate.

## 9. Phiên bản
`detectorVersion` gắn vào mỗi result để so sánh khi nâng bộ config.
