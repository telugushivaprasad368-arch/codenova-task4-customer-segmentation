const fs = require('fs');
const path = require('path');

const root = __dirname;
const dataDir = path.join(root, 'data');
const outputDir = path.join(root, 'outputs');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

let seed = 20261029;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const normal = () => { const u = Math.max(rand(), 1e-9), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const money = n => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const round = n => Math.round(n * 100) / 100;

const archetypes = [
  { name: 'VIP loyalists', recency: 13, frequency: 20, monetary: 3900, aov: 208, discount: 0.07, support: 1.2 },
  { name: 'Steady regulars', recency: 29, frequency: 11, monetary: 1450, aov: 132, discount: 0.13, support: 1.7 },
  { name: 'Deal seekers', recency: 41, frequency: 7, monetary: 730, aov: 98, discount: 0.29, support: 2.0 },
  { name: 'At-risk occasional', recency: 113, frequency: 3, monetary: 280, aov: 90, discount: 0.17, support: 2.8 }
];

const customers = Array.from({ length: 900 }, (_, i) => {
  const a = archetypes[i % archetypes.length];
  const frequency = Math.max(1, Math.round(a.frequency + normal() * Math.max(1.3, a.frequency * .25)));
  const aov = clamp(a.aov + normal() * a.aov * .16, 25, 480);
  const discount = clamp(a.discount + normal() * .055, 0, .45);
  const recency = Math.round(clamp(a.recency + normal() * Math.max(8, a.recency * .38), 1, 220));
  const monetary = clamp((frequency * aov * (1 - discount * .22)) + normal() * a.monetary * .12, 45, 9000);
  return {
    customer_id: `CUST-${String(i + 1).padStart(4, '0')}`,
    recency_days: recency,
    orders_12m: frequency,
    spend_12m: round(monetary),
    avg_order_value: round(aov),
    discount_share: round(discount),
    support_contacts: Math.max(0, Math.round(a.support + normal() * 1.1)),
    seed_group: a.name
  };
});

const featureNames = ['recency_days', 'orders_12m', 'spend_12m', 'avg_order_value', 'discount_share', 'support_contacts'];
const means = Object.fromEntries(featureNames.map(f => [f, customers.reduce((s, c) => s + c[f], 0) / customers.length]));
const sds = Object.fromEntries(featureNames.map(f => [f, Math.sqrt(customers.reduce((s, c) => s + (c[f] - means[f]) ** 2, 0) / customers.length) || 1]));
const vector = c => featureNames.map(f => (c[f] - means[f]) / sds[f]);
const distance = (a, b) => a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0);
let centroids = [customers[0], customers[225], customers[450], customers[675]].map(vector);
let assignment = [];
for (let iteration = 0; iteration < 60; iteration++) {
  assignment = customers.map(c => {
    const v = vector(c); let best = 0, bestDistance = Infinity;
    centroids.forEach((centroid, i) => { const d = distance(v, centroid); if (d < bestDistance) { best = i; bestDistance = d; } });
    return best;
  });
  const next = centroids.map((_, cluster) => featureNames.map((__, j) => {
    const values = customers.filter((_, i) => assignment[i] === cluster).map(vector).map(v => v[j]);
    return values.length ? values.reduce((s, n) => s + n, 0) / values.length : centroids[cluster][j];
  }));
  if (next.every((c, i) => distance(c, centroids[i]) < 1e-8)) break;
  centroids = next;
}

const rawProfiles = centroids.map((_, cluster) => {
  const members = customers.filter((_, i) => assignment[i] === cluster);
  const avg = f => members.reduce((s, c) => s + c[f], 0) / members.length;
  return { cluster, members, count: members.length, recency: avg('recency_days'), frequency: avg('orders_12m'), spend: avg('spend_12m'), aov: avg('avg_order_value'), discount: avg('discount_share'), support: avg('support_contacts') };
});
const ranking = [...rawProfiles].sort((a, b) => b.spend - a.spend);
const labelByCluster = {};
labelByCluster[ranking[0].cluster] = ['Champions', 'Protect and reward: early access, premium service, and referral offers.'];
labelByCluster[ranking[1].cluster] = ['Core shoppers', 'Grow carefully: personalised cross-sell bundles and loyalty milestones.'];
labelByCluster[ranking[2].cluster] = ['Value explorers', 'Convert with value: targeted bundles, threshold offers, and category discovery.'];
labelByCluster[ranking[3].cluster] = ['Reactivation candidates', 'Win back: time-limited reactivation offers and preference refresh campaigns.'];

const enriched = customers.map((c, i) => ({ ...c, cluster: assignment[i], segment: labelByCluster[assignment[i]][0] }));
const profiles = rawProfiles.map(p => ({
  segment: labelByCluster[p.cluster][0], customers: p.count, share_pct: round(p.count / customers.length * 100),
  avg_recency_days: round(p.recency), avg_orders_12m: round(p.frequency), avg_spend_12m: round(p.spend),
  avg_order_value: round(p.aov), avg_discount_share: round(p.discount * 100), avg_support_contacts: round(p.support),
  recommended_action: labelByCluster[p.cluster][1]
})).sort((a, b) => b.avg_spend_12m - a.avg_spend_12m);

const csv = [Object.keys(enriched[0]).join(','), ...enriched.map(c => Object.values(c).join(','))].join('\n') + '\n';
fs.writeFileSync(path.join(dataDir, 'synthetic_customer_profiles.csv'), csv);
const summary = { title: 'Customer Segmentation Study', method: 'Deterministic K-means clustering on standardized behavioural features', customer_count: customers.length, cluster_count: 4, features: featureNames, generated_on: '2026-10-29', segments: profiles };
fs.writeFileSync(path.join(outputDir, 'segmentation_summary.json'), JSON.stringify(summary, null, 2));

const colors = ['#3559e0', '#0e9384', '#d97910', '#8b5cf6'];
const cards = profiles.map((p, i) => `<article class="segment"><div class="dot" style="background:${colors[i]}"></div><h3>${p.segment}</h3><p>${p.customers} customers · ${p.share_pct}% of portfolio</p><div class="metrics"><span>Spend <b>${money(p.avg_spend_12m)}</b></span><span>Orders <b>${p.avg_orders_12m}</b></span><span>Recency <b>${p.avg_recency_days}d</b></span><span>Discount use <b>${p.avg_discount_share}%</b></span></div><p class="action"><b>Recommended action</b><br>${p.recommended_action}</p></article>`).join('');
const bars = profiles.map((p, i) => `<div class="barrow"><span>${p.segment}</span><div class="track"><i style="width:${Math.max(8, p.avg_spend_12m / profiles[0].avg_spend_12m * 100)}%;background:${colors[i]}"></i></div><b>${money(p.avg_spend_12m)}</b></div>`).join('');
const report = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Customer Segmentation | CodeNova Task 4</title><style>:root{--ink:#142033;--muted:#607088;--paper:#f4f7fb;--line:#e2e8f1}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:1120px;margin:auto;padding:30px 20px 55px}.hero{padding:42px;border-radius:24px;background:linear-gradient(120deg,#14244b,#3559e0);color:#fff;box-shadow:0 18px 44px #17255433}.eyebrow{color:#b9d1ff;font-size:12px;font-weight:800;letter-spacing:.12em}.hero h1{font-size:clamp(30px,5vw,47px);margin:11px 0}.hero p{max-width:720px;color:#dbeafe;font-size:17px;line-height:1.55}.notice{margin:18px 0;background:#fff7e5;border-left:4px solid #d97910;padding:14px 16px;border-radius:10px;color:#694400}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:20px 0}.kpi,.segment,.panel{background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 7px 20px #12233d0a}.kpi{padding:19px}.kpi span{display:block;color:var(--muted);font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.kpi b{display:block;font-size:27px;margin-top:9px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.segment{position:relative;padding:23px}.dot{position:absolute;top:25px;right:24px;width:12px;height:12px;border-radius:50%}.segment h3{margin:0;font-size:20px}.segment p{color:var(--muted);line-height:1.45}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0}.metrics span{padding:9px;border-radius:8px;background:#f5f7fb;color:var(--muted);font-size:12px}.metrics b{display:block;color:var(--ink);font-size:16px;margin-top:3px}.action{border-top:1px solid var(--line);padding-top:15px}.panel{margin-top:18px;padding:25px}.panel h2{margin:0 0 8px}.sub{color:var(--muted);margin-top:0}.barrow{display:grid;grid-template-columns:165px 1fr 85px;align-items:center;gap:14px;margin:17px 0}.track{height:14px;background:#eef2f7;border-radius:10px;overflow:hidden}.track i{display:block;height:100%;border-radius:10px}.barrow b{text-align:right}footer{color:var(--muted);text-align:center;margin-top:28px;font-size:12px}@media(max-width:700px){.hero{padding:29px}.kpis,.grid{grid-template-columns:1fr}.barrow{grid-template-columns:100px 1fr 70px;font-size:12px}}</style></head><body><main class="wrap"><header class="hero"><div class="eyebrow">CODENOVA · DATA SCIENCE · TASK 4</div><h1>Customer Segmentation Study</h1><p>Four actionable customer groups, built from transaction behaviour and translated into focused growth and retention moves.</p></header><div class="notice"><b>Dataset transparency:</b> No source data was supplied with the brief. This report uses a deterministic synthetic retail dataset for a reproducible portfolio demonstration.</div><section class="kpis"><article class="kpi"><span>Customers analysed</span><b>900</b></article><article class="kpi"><span>Behavioural features</span><b>6</b></article><article class="kpi"><span>Clusters selected</span><b>4</b></article></section><section class="grid">${cards}</section><section class="panel"><h2>Average annual spend by segment</h2><p class="sub">A clear value gradient supports differentiated investment rather than one campaign for every customer.</p>${bars}</section><section class="panel"><h2>How to use these segments</h2><p class="sub">Start with small controlled campaigns, measure incremental lift against a holdout group, and refresh the clustering when customer behaviour changes. Segment labels are interpretations, not ground truth.</p></section><footer>CodeNova Data Science Internship · Customer segmentation study · No paid tools or APIs</footer></main></body></html>`;
fs.writeFileSync(path.join(root, 'segmentation_report.html'), report);
console.log(`Segmented ${customers.length} customers into ${profiles.length} actionable groups.`);

