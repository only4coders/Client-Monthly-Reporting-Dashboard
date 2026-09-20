const D = window.REPORT_DATA;
const clientSelect = document.querySelector('#clientSelect');
const monthSelect = document.querySelector('#monthSelect');
let clientId = D.clients[0].id;
let monthId = D.clients[0].months[0];

const fmt = (v, compact=false) => v == null ? 'Not reported' : new Intl.NumberFormat('en-AU', compact ? {notation:'compact',maximumFractionDigits:1} : {}).format(v);
const money = v => v == null ? 'Not reported' : new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(v);
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
  document.querySelector('#pageTitle').textContent=c.name; document.querySelector('#periodTitle').textContent=r.label; document.querySelector('.avatar').textContent=c.initials;
  const clickDelta=delta(r.clicks,r.previousClicks), impressionDelta=delta(r.impressions,r.previousImpressions);
  document.querySelector('#primaryKpis').innerHTML=[kpi('Organic clicks',fmt(r.clicks,true),clickDelta,'↗'),kpi('Search impressions',fmt(r.impressions,true),impressionDelta,'◉'),noChangeKpi('Website bookings',fmt(r.tableBookings),r.tableBookings==null?'Not included in source PDF':'Organic website bookings','◆'),noChangeKpi('Event revenue',money(r.events.revenue),r.events.revenue?'Reported in Tripleseat':'Not supplied for this month','A$')].join('');
  document.querySelector('#clickChart').innerHTML=lineChart(reportSeries('clicks'));
  document.querySelector('#executiveSummary').innerHTML=`<span class="overline">Executive signal</span><h2>${r.note}</h2><div class="signal-list"><div><span>Search visibility</span><strong>${impressionDelta==null?'—':impressionDelta>=0?'Growing':'Opportunity'}</strong></div><div><span>Local actions</span><strong>${fmt(r.gbp.calls+r.gbp.directions+r.gbp.menu)}</strong></div><div><span>Reported enquiries</span><strong>${fmt(r.events.enquiries)}</strong></div></div>`;
  document.querySelector('#channelHighlights').innerHTML=[['Organic search',fmt(r.clicks)+' clicks',changeText(clickDelta),'purple'],['Google Business',fmt(r.gbp.views)+' views',fmt(r.gbp.directions)+' directions','blue'],['Events',fmt(r.events.enquiries)+' enquiries',fmt(r.events.guests)+' guest count','teal']].map(x=>`<article class="card mini-card ${x[3]}"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join('');

  document.querySelector('#searchKpis').innerHTML=[kpi('Clicks',fmt(r.clicks),clickDelta,'↗'),kpi('Impressions',fmt(r.impressions),impressionDelta,'◉'),noChangeKpi('AI appearances',fmt(r.aiAppearances),r.aiAppearances?'Google AI features':'Not supplied','✦'),noChangeKpi('Keywords moved up',fmt(r.keywordsMoved),r.keywordsMoved?'Tracked keywords':'Not supplied','↑')].join('');
  document.querySelector('#searchChart').innerHTML=lineChart(reportSeries('impressions'),'#168aad');
  document.querySelector('#searchNotes').innerHTML=`<span class="overline">Monthly context</span><h2>${r.label}</h2><p>${r.note}</p><div class="comparison"><span>Previous clicks<strong>${fmt(r.previousClicks)}</strong></span><span>Previous impressions<strong>${fmt(r.previousImpressions)}</strong></span></div>`;

  document.querySelector('#localKpis').innerHTML=[noChangeKpi('Profile views',fmt(r.gbp.views),'Google Business Profile','◉'),noChangeKpi('Menu views',fmt(r.gbp.menu),'High-intent action','≡'),noChangeKpi('Calls',fmt(r.gbp.calls),'Direct enquiries','☎'),noChangeKpi('Directions',fmt(r.gbp.directions),'Location intent','⌖')].join('');
  const gbp=[['Views',r.gbp.views],['Menu',r.gbp.menu],['Calls',r.gbp.calls],['Directions',r.gbp.directions]], max=Math.max(...gbp.map(x=>x[1]));
  document.querySelector('#gbpChart').innerHTML=gbp.map(x=>`<div><div class="bar-label"><span>${x[0]}</span><strong>${fmt(x[1])}</strong></div><div class="bar-track"><i style="width:${x[1]/max*100}%"></i></div></div>`).join('');

  document.querySelector('#eventKpis').innerHTML=[noChangeKpi('Total enquiries',fmt(r.events.enquiries),'Tripleseat report','✉'),noChangeKpi('Guest count',fmt(r.events.guests),'Potential event guests','♙'),noChangeKpi('Reported revenue',money(r.events.revenue),r.events.revenue?'Tripleseat pipeline':'Not supplied','A$'),noChangeKpi('Organic bookings',fmt(r.tableBookings),'Website only','◆')].join('');
  const sources=Object.entries(r.events.sources), sourceMax=Math.max(...sources.map(x=>x[1]));
  document.querySelector('#sourceBars').innerHTML=sources.map(([name,val])=>`<div><div class="bar-label"><span>${name}</span><strong>${val}</strong></div><div class="bar-track"><i style="width:${val/sourceMax*100}%"></i></div></div>`).join('');
  document.querySelector('#eventNotes').innerHTML=`<span class="overline">Attribution note</span><h2>What the numbers include</h2><p>Event enquiry and guest figures come from the supplied Tripleseat report. “Other” and unattributed leads may include search-influenced customers who did not select a source.</p><div class="notice">Google Business Profile calls, directions and Reserve actions are not included in website booking totals.</div>`;
}

clientSelect.addEventListener('change',e=>{clientId=e.target.value;populateMonths();render()}); monthSelect.addEventListener('change',e=>{monthId=e.target.value;render()});
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.dashboard-section').forEach(x=>x.classList.remove('active-section'));document.querySelector(`#${btn.dataset.section}Section`).classList.add('active-section');document.querySelector('#sectionEyebrow').textContent=btn.textContent.trim();document.querySelector('#sidebar').classList.remove('open')}));
document.querySelector('#menuButton').addEventListener('click',()=>document.querySelector('#sidebar').classList.toggle('open'));
render();
