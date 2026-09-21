const D = window.REPORT_DATA;
const clientSelect = document.querySelector('#clientSelect');
const monthSelect = document.querySelector('#monthSelect');
let clientId = D.clients[0].id;
let monthId = D.clients[0].months[0];

const fmt = (v, compact=false) => v == null ? 'Not reported' : new Intl.NumberFormat('en-AU', compact ? {notation:'compact',maximumFractionDigits:1} : {}).format(v);
const money = v => v == null ? 'Not reported' : new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(v);
const moneyPrecise = v => v == null ? 'Not reported' : new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
const delta = (a,b) => a != null && b ? ((a-b)/b)*100 : null;
const signClass = v => v == null ? 'neutral' : v >= 0 ? 'positive' : 'negative';
const changeText = v => v == null ? 'No comparison supplied' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}% vs previous month`;

D.clients.forEach(c => clientSelect.add(new Option(c.name,c.id)));
function populateMonths(){ monthSelect.innerHTML=''; D.clients.find(c=>c.id===clientId).months.forEach(m=>monthSelect.add(new Option(D.reports[clientId][m].label,m))); monthId=monthSelect.value; }
populateMonths();

function kpi(label,value,change,icon){return `<article class="kpi card"><div class="kpi-icon">${icon}</div><div><span>${label}</span><strong>${value}</strong><small class="${signClass(change)}">${changeText(change)}</small></div></article>`}
function noChangeKpi(label,value,sub,icon){return `<article class="kpi card"><div class="kpi-icon">${icon}</div><div><span>${label}</span><strong>${value}</strong><small class="neutral">${sub}</small></div></article>`}

function lineChart(series, color='#6d5dfc'){
  const valid=series.filter(x=>x.value!=null); if(!valid.length) return '<div class="empty">No trend data reported</div>';
  const max=Math.max(...valid.map(x=>x.value))*1.12, min=Math.min(...valid.map(x=>x.value))*0.88, w=700,h=230,p=24;
  const pts=valid.map((x,i)=>({x:p+i*(w-p*2)/(valid.length-1||1),y:h-p-((x.value-min)/(max-min||1))*(h-p*2),...x}));
  const path=pts.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Monthly trend"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path class="area" d="${path} L ${pts.at(-1).x} ${h-p} L ${pts[0].x} ${h-p} Z"/><path class="line" style="stroke:${color}" d="${path}"/>${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="5"/><text x="${p.x}" y="${h-3}" text-anchor="middle">${p.label}</text>`).join('')}</svg>`;
}

function reportSeries(field){return D.clients.find(c=>c.id===clientId).months.slice().reverse().map(m=>({label:D.reports[clientId][m].label.slice(0,3),value:D.reports[clientId][m][field]}));}

function render(){
  const c=D.clients.find(x=>x.id===clientId), r=D.reports[clientId][monthId];
  const isMultiLocation=Boolean(r.locations);
  document.querySelector('#pageTitle').textContent=c.name; document.querySelector('#periodTitle').textContent=r.label; document.querySelector('.avatar').textContent=c.initials;
  const clickDelta=delta(r.clicks,r.previousClicks), impressionDelta=delta(r.impressions,r.previousImpressions);
  const fourthPrimary=isMultiLocation?noChangeKpi('Page-one keywords',fmt(r.keywordsPageOne),'Google rankings','↑'):noChangeKpi('Event revenue',money(r.events?.revenue),r.events?.revenue?'Reported in Tripleseat':'Not supplied for this month','A$');
  document.querySelector('#primaryKpis').innerHTML=[kpi('Organic clicks',fmt(r.clicks,true),clickDelta,'↗'),kpi('Search impressions',fmt(r.impressions,true),impressionDelta,'◉'),noChangeKpi('Website bookings',fmt(r.tableBookings),r.tableBookings==null?'Not included in source PDF':'Organic website bookings','◆'),fourthPrimary].join('');
  document.querySelector('#clickChart').innerHTML=lineChart(reportSeries('clicks'));
  const signalRows=isMultiLocation?[['Search visibility',impressionDelta==null?'—':impressionDelta>=0?'Growing':'Opportunity'],['Ranking keywords',fmt(r.keywordsTotal)],['Website bookings',fmt(r.tableBookings)]]:[['Search visibility',impressionDelta==null?'—':impressionDelta>=0?'Growing':'Opportunity'],['Local actions',fmt(r.gbp.calls+r.gbp.directions+r.gbp.menu)],['Reported enquiries',fmt(r.events.enquiries)]];
  document.querySelector('#executiveSummary').innerHTML=`<span class="overline">Executive signal</span><h2>${r.note}</h2><div class="signal-list">${signalRows.map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}</div>`;
  const highlights=isMultiLocation?[['Organic search',fmt(r.clicks)+' visits',changeText(clickDelta),'purple'],['AI visibility',fmt(r.aiAppearances)+' appearances',r.copilotAppearances?fmt(r.copilotAppearances)+' in Copilot':'Reported AI answers','blue'],['Website bookings',fmt(r.tableBookings)+' requests',Object.keys(r.locations).length+' locations','teal']]:[['Organic search',fmt(r.clicks)+' clicks',changeText(clickDelta),'purple'],['Google Business',fmt(r.gbp.views)+' views',fmt(r.gbp.directions)+' directions','blue'],['Events',fmt(r.events.enquiries)+' enquiries',fmt(r.events.guests)+' guest count','teal']];
  document.querySelector('#channelHighlights').innerHTML=highlights.map(x=>`<article class="card mini-card ${x[3]}"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join('');

  const keywordKpi=isMultiLocation?noChangeKpi('Page-one keywords',fmt(r.keywordsPageOne),`${fmt(r.keywordsTotal)} total ranking keywords`,'↑'):noChangeKpi('Keywords moved up',fmt(r.keywordsMoved),r.keywordsMoved?'Tracked keywords':'Not supplied','↑');
  document.querySelector('#searchKpis').innerHTML=[kpi('Clicks',fmt(r.clicks),clickDelta,'↗'),kpi('Impressions',fmt(r.impressions),impressionDelta,'◉'),noChangeKpi('AI appearances',fmt(r.aiAppearances),r.copilotAppearances?`${fmt(r.copilotAppearances)} Copilot appearances`:r.aiAppearances?'Reported AI visibility':'Not supplied','✦'),keywordKpi].join('');
  document.querySelector('#searchChart').innerHTML=lineChart(reportSeries('impressions'),'#168aad');
  document.querySelector('#searchNotes').innerHTML=`<span class="overline">Monthly context</span><h2>${r.label}</h2><p>${r.note}</p><div class="comparison"><span>Previous clicks<strong>${fmt(r.previousClicks)}</strong></span><span>Previous impressions<strong>${fmt(r.previousImpressions)}</strong></span></div>`;

  document.querySelector('#localSection h2').textContent=isMultiLocation?'Website bookings by location':'Google Business Profile activity';
  const gbp=isMultiLocation?Object.entries(r.locations):[['Views',r.gbp.views],['Menu',r.gbp.menu],['Calls',r.gbp.calls],['Directions',r.gbp.directions]];
  document.querySelector('#localKpis').innerHTML=isMultiLocation?gbp.map(([name,val])=>noChangeKpi(name,fmt(val),'Website booking requests','⌖')).join(''):[noChangeKpi('Profile views',fmt(r.gbp.views),'Google Business Profile','◉'),noChangeKpi('Menu views',fmt(r.gbp.menu),'High-intent action','≡'),noChangeKpi('Calls',fmt(r.gbp.calls),'Direct enquiries','☎'),noChangeKpi('Directions',fmt(r.gbp.directions),'Location intent','⌖')].join('');
  const max=Math.max(...gbp.map(x=>x[1]));
  document.querySelector('#gbpChart').innerHTML=gbp.map(x=>`<div><div class="bar-label"><span>${x[0]}</span><strong>${fmt(x[1])}</strong></div><div class="bar-track"><i style="width:${x[1]/max*100}%"></i></div></div>`).join('');

  document.querySelector('#eventsSection h2').textContent=isMultiLocation?'Booking requests by location':'Enquiries by source';
  document.querySelector('#eventKpis').innerHTML=isMultiLocation?[noChangeKpi('Total bookings',fmt(r.tableBookings),'Website requests','◆'),noChangeKpi('Top location',Object.entries(r.locations).sort((a,b)=>b[1]-a[1])[0][0],`${fmt(Math.max(...Object.values(r.locations)))} requests`,'⌖'),noChangeKpi('Bing users',fmt(r.bingUsers),'Additional organic users','B'),noChangeKpi('AI appearances',fmt(r.aiAppearances),'Reported AI visibility','✦')].join(''):[noChangeKpi('Total enquiries',fmt(r.events.enquiries),'Tripleseat report','✉'),noChangeKpi('Guest count',fmt(r.events.guests),'Potential event guests','♙'),noChangeKpi('Reported revenue',money(r.events.revenue),r.events.revenue?'Tripleseat pipeline':'Not supplied','A$'),noChangeKpi('Organic bookings',fmt(r.tableBookings),'Website only','◆')].join('');
  const sources=isMultiLocation?Object.entries(r.locations):Object.entries(r.events.sources), sourceMax=Math.max(...sources.map(x=>x[1]));
  document.querySelector('#sourceBars').innerHTML=sources.map(([name,val])=>`<div><div class="bar-label"><span>${name}</span><strong>${val}</strong></div><div class="bar-track"><i style="width:${val/sourceMax*100}%"></i></div></div>`).join('');
  document.querySelector('#eventNotes').innerHTML=isMultiLocation?`<span class="overline">Booking note</span><h2>Website requests by location</h2><p>These figures represent organic table-booking requests recorded on the website for Melbourne, Springvale, Queen Street and Fairfield.</p><div class="notice">Calls, online bookings and walk-ins from Google Business Profiles are not included.</div>`:`<span class="overline">Attribution note</span><h2>What the numbers include</h2><p>Event enquiry and guest figures come from the supplied Tripleseat report. “Other” and unattributed leads may include search-influenced customers who did not select a source.</p><div class="notice">Google Business Profile calls, directions and Reserve actions are not included in website booking totals.</div>`;

  const ads=r.googleAds;
  document.querySelector('#adsContent').innerHTML=!ads?`<article class="card empty-state"><span class="overline">Google Ads</span><h2>No paid media report supplied</h2><p>Google Ads data is not available for ${r.label}.</p></article>`:`
    <div class="kpi-grid ads-kpis">
      ${noChangeKpi('Ad clicks',fmt(ads.clicks),'Paid search traffic','↗')}
      ${noChangeKpi('Impressions',fmt(ads.impressions),'Google Ads reach','◉')}
      ${noChangeKpi('Conversions',fmt(ads.conversions),'Tracked actions','◆')}
      ${noChangeKpi('Ad spend',money(ads.spend),'Total media cost','A$')}
      ${noChangeKpi('Cost / conversion',moneyPrecise(ads.costPerConversion),'Average CPA','÷')}
      ${noChangeKpi('CTR',ads.ctr.toFixed(2)+'%','Click-through rate','%')}
      ${noChangeKpi('Phone calls',fmt(ads.calls),'Tracked calls','☎')}
      ${noChangeKpi('Quality calls',fmt(ads.qualityCalls),'Calls over 2 minutes','✓')}
    </div>
    <div class="campaign-grid">${ads.campaigns.map(c=>`<article class="card campaign-card"><span class="overline">Search campaign</span><h2>${c.name}</h2><div class="campaign-stats"><span>Clicks<strong>${fmt(c.clicks)}</strong></span><span>Impressions<strong>${fmt(c.impressions)}</strong></span><span>Conversions<strong>${fmt(c.conversions)}</strong></span><span>Cost<strong>${money(c.cost)}</strong></span></div><h3>Business Profile asset</h3><div class="profile-stats"><span>${fmt(c.profile.clicks)} clicks</span><span>${fmt(c.profile.impressions)} impressions</span><span>${c.profile.ctr.toFixed(2)}% CTR</span><span>${moneyPrecise(c.profile.cpc)} avg. CPC</span><span>${moneyPrecise(c.profile.cost)} cost</span></div></article>`).join('')}</div>
    <article class="card ads-note"><span class="overline">July result</span><h2>Strong lead volume across both Search campaigns</h2><p>${fmt(ads.conversions)} tracked actions were generated from ${money(ads.spend)} spend. Café del Mar led impression share for both campaigns, and ${ads.qualityCalls} of ${ads.calls} calls lasted over two minutes.</p></article>`;
}

clientSelect.addEventListener('change',e=>{clientId=e.target.value;populateMonths();render()}); monthSelect.addEventListener('change',e=>{monthId=e.target.value;render()});
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.dashboard-section').forEach(x=>x.classList.remove('active-section'));document.querySelector(`#${btn.dataset.section}Section`).classList.add('active-section');document.querySelector('#sectionEyebrow').textContent=btn.textContent.trim();document.querySelector('#sidebar').classList.remove('open')}));
document.querySelector('#menuButton').addEventListener('click',()=>document.querySelector('#sidebar').classList.toggle('open'));
render();
