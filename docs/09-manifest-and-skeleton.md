# 09 — Manifest + Code Skeleton

## manifest.json (MV3)
```json
{
  "manifest_version": 3,
  "name": "Affiliate/Partner Finder (Trustpilot)",
  "version": "1.0.0",
  "description": "Rà soát công ty trên Trustpilot và phát hiện chương trình affiliate/partner, kèm bằng chứng.",
  "permissions": ["tabs", "scripting", "storage", "alarms"],
  "host_permissions": ["*://*.trustpilot.com/*", "<all_urls>"],
  "background": { "service_worker": "background.js", "type": "module" },
  "action": { "default_popup": "popup.html" }
}
```

## detector.js (inject vào site đích) — rút gọn từ bản đã kiểm chứng thật
```js
function runDetector(CONFIG){
  const {strong, weak, platforms, paths} = CONFIG;
  // bot-block heuristic
  const t = (document.title||'').toLowerCase();
  const blockedTitle = ['just a moment','attention required','verifying','access denied','cloudflare']
    .some(s=>t.includes(s));
  const links = Array.from(document.querySelectorAll('a'))
    .map(a=>({t:(a.innerText||a.getAttribute('aria-label')||'').trim(), h:a.href||''}));
  if(blockedTitle || links.length < 5){
    return {loadStatus:'blocked', totalLinks:links.length};
  }
  const linkHits=[]; const seen=new Set();
  for(const l of links){
    const lt=l.t.toLowerCase(), lh=l.h.toLowerCase();
    const ks=strong.filter(k=>lt.includes(k)||lh.includes(k));
    const kw=weak.filter(k=>lt.includes(k)||lh.includes(k));
    const plat=platforms.filter(p=>lh.includes(p));
    if(ks.length||kw.length||plat.length){
      if(!seen.has(l.h)){ seen.add(l.h);
        linkHits.push({text:l.t.slice(0,80), href:l.h, kw:[...ks,...kw], platform:plat, isStrong: ks.length>0||plat.length>0});
      }
    }
  }
  return {loadStatus:'ok', totalLinks:links.length, linkHits, _needPathProbe:true};
}
```

## path-probe.js (chạy same-origin trong content, async)
```js
async function pathProbe(origin, paths){
  let junk; 
  try{ junk=(await fetch(origin+'/zzq-'+Date.now(),{redirect:'follow'})).status; }
  catch(e){ junk='err'; }
  const hits=[];
  for(const p of paths){
    try{
      const r = await fetch(origin+p,{redirect:'follow'});
      if(r.status!==junk && [200,301,302].includes(r.status)){
        hits.push({path:p, status:r.status, finalUrl:r.url, isStrong:/affiliat/.test(p)});
      }
    }catch(e){}
  }
  return {junkBaselineStatus:junk, pathHits: junk===200 ? [] : hits}; // soft-404 guard
}
```

## classify.js (deterministic)
```js
function classify({loadStatus, linkHits=[], pathHits=[], junkBaselineStatus}){
  if(loadStatus!=='ok') return {verdict:'unknown', confidence:'blocked'};
  const strongLink = linkHits.some(h=>h.isStrong);
  const strongPath = pathHits.some(h=>h.isStrong);
  const weakLink = linkHits.some(h=>!h.isStrong);
  const weakPath = pathHits.length>0;
  if(strongLink) return {verdict:'affiliate', confidence:'high'};
  if(strongPath) return {verdict:'affiliate', confidence:'medium'};
  if(weakLink && weakPath) return {verdict:'partner_trade', confidence:'medium'};
  if(weakLink || weakPath) return {verdict:'partner_trade', confidence:'low'};
  return {verdict:'none', confidence:'high'};
}
```

## background.js (khung orchestrator)
```js
import {CONFIG} from './lib/config.js';
async function collect(query, maxPages){ /* fetch /search?page=n, parse __NEXT_DATA__ */ }
async function scanOne(company){
  const url = 'https://'+company.domain;
  const tab = await chrome.tabs.create({url, active:false});
  await waitForComplete(tab.id, 20000);
  const [{result:base}] = await chrome.scripting.executeScript({target:{tabId:tab.id}, func:runDetector, args:[CONFIG]});
  let probe={};
  if(base.loadStatus==='ok'){
    const [{result:p}] = await chrome.scripting.executeScript({target:{tabId:tab.id}, func:pathProbe, args:[new URL(url).origin, CONFIG.paths]});
    probe=p;
  }
  await chrome.tabs.remove(tab.id);
  const evidence={...base, ...probe};
  const verdict=classify(evidence);
  return {domain:company.domain, websiteUrl:url, ...verdict, evidence, scannedAt:new Date().toISOString(), detectorVersion:'1.0.0'};
}
```

> Lưu ý: khi `executeScript` gọi async func (pathProbe), dùng `{func}` trả Promise — MV3 hỗ trợ. Nếu môi trường không, gộp probe vào detector async duy nhất.
