// NexVault Dark — charts.js

const ChartDefaults = {
  font: { family: "'Inter', sans-serif", size: 11 },
  color: '#9ba3b8',
  grid: 'rgba(255,255,255,0.04)',
  teal: '#00d4aa',
  blue: '#4F8CFF',
  purple: '#7c5cfc',
  orange: '#ff8c42',
  green: '#22c55e',
  red: '#ef4444',
};

function getGradient(ctx, color, alpha1=0.3, alpha2=0.01, height=300) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, color.replace(')', `,${alpha1})`).replace('rgb(', 'rgba(').replace('#', 'rgba(').replace(/(\w{2})(\w{2})(\w{2})/, (m,r,g2,b) => `${parseInt(r,16)},${parseInt(g2,16)},${parseInt(b,16)}`));
  g.addColorStop(1, color.replace(')', `,${alpha2})`).replace('rgb(', 'rgba('));
  return g;
}

function buildGradient(ctx, hexColor, alpha1=0.25, alpha2=0.01) {
  const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  const r = parseInt(hexColor.slice(1,3),16);
  const gv= parseInt(hexColor.slice(3,5),16);
  const b = parseInt(hexColor.slice(5,7),16);
  g.addColorStop(0, `rgba(${r},${gv},${b},${alpha1})`);
  g.addColorStop(1, `rgba(${r},${gv},${b},${alpha2})`);
  return g;
}

const Charts = {
  portfolio: null,
  allocation: null,

  initPortfolio(canvasId='chart-portfolio') {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(this.portfolio) this.portfolio.destroy();
    const labels = ['Nov','Dec','Jan','Feb','Mar','Apr','May'];
    const data = [98200, 112400, 134800, 142100, 148900, 151200, 156420];
    this.portfolio = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Portfolio Value',
          data,
          borderColor: '#00d4aa',
          backgroundColor: buildGradient(ctx, '#00d4aa', 0.2, 0.01),
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#00d4aa',
          pointBorderColor: '#0d0e12',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: '#13151c',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#9ba3b8',
            bodyColor: '#e8eaf0',
            callbacks: { label: ctx => ' $' + ctx.raw.toLocaleString() }
          }
        },
        scales: {
          x: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#5a6177',font:{size:11}} },
          y: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#5a6177',font:{size:11},callback:v=>'$'+v.toLocaleString()} }
        },
        interaction: { mode:'nearest', axis:'x', intersect:false },
      }
    });
  },

  initAllocation(canvasId='chart-allocation') {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(this.allocation) this.allocation.destroy();
    this.allocation = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['ETH','BTC','SOL','MATIC','ARB','Others'],
        datasets: [{
          data: [42,32,9,5,4,8],
          backgroundColor: ['#627EEA','#F7931A','#14F195','#8247E5','#28A0F0','#5a6177'],
          borderWidth: 0,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: {
          legend: { position:'bottom', labels:{ color:'#9ba3b8', font:{size:10}, boxWidth:8, padding:10 }},
          tooltip: { callbacks: { label: ctx=>`${ctx.label}: ${ctx.raw}%` }}
        }
      }
    });
  },

  sparkline(canvas, data, color='#00d4aa', fill=false) {
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const existChart = Chart.getChart(canvas);
    if(existChart) existChart.destroy();
    const isUp = data[data.length-1] >= data[0];
    const c = isUp ? '#22c55e' : '#ef4444';
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_,i)=>i),
        datasets: [{ data, borderColor: c, backgroundColor: fill ? c+'20' : 'transparent',
          borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill }]
      },
      options: {
        responsive: false, animation: false,
        plugins: { legend:{display:false}, tooltip:{enabled:false} },
        scales: { x:{display:false}, y:{display:false} },
        elements: { line:{capBezierPoints:false} }
      }
    });
  },

  initAll() {
    this.initPortfolio();
    this.initAllocation();
  }
};
