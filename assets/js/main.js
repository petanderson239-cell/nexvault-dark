// NexVault Dark — main.js

// ---- Toast ----
const Toast = {
  show(msg, color='var(--teal)', duration=3200) {
    const z = document.getElementById('toast-zone'); if(!z) return;
    const t = document.createElement('div'); t.className='toast';
    t.innerHTML=`<span class="toast-dot" style="background:${color}"></span>${msg}`;
    z.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(20px)'; t.style.transition='all .3s ease'; setTimeout(()=>t.remove(),300); }, duration);
  },
  success(m){ this.show(m,'var(--green)'); },
  error(m)  { this.show(m,'var(--red)'); },
  info(m)   { this.show(m,'var(--blue)'); },
  warn(m)   { this.show(m,'var(--orange)'); },
};

// ---- Modal ----
function openModal(id) { const m=document.getElementById('modal-'+id); if(m){ m.classList.add('open'); document.body.style.overflow='hidden'; } }
function closeModal(id){ const m=document.getElementById('modal-'+id); if(m){ m.classList.remove('open'); document.body.style.overflow=''; } }
document.addEventListener('keydown', e=>{ if(e.key==='Escape') document.querySelectorAll('.overlay.open').forEach(m=>{ m.classList.remove('open'); document.body.style.overflow=''; }); });

// ---- Sidebar ----
function toggleSidebar() {
  const s = document.getElementById('sidebar');
  if(s) s.classList.toggle('open');
}

// ---- Stagger ----
function initStagger() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('visible'); } });
  }, { threshold: 0.05 });
  document.querySelectorAll('.stagger > *').forEach((el,i) => {
    el.style.transitionDelay = (i * 0.06) + 's';
    obs.observe(el);
  });
}

// ---- Number animate ----
const Numbers = {
  animate(el, from, to, duration=1200, prefix='', suffix='', decimals=0) {
    const start = performance.now();
    function step(now) {
      const p = Math.min((now-start)/duration, 1);
      const ease = 1-Math.pow(1-p,4);
      const val = from + (to-from)*ease;
      el.textContent = prefix + (decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()) + suffix;
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  },
  animateAll() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const to = parseFloat(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const decimals = parseInt(el.dataset.decimals || 0);
      this.animate(el, 0, to, 1400, prefix, suffix, decimals);
    });
  }
};

// ---- Clipboard ----
function copyToClipboard(text, label='') {
  navigator.clipboard.writeText(text).then(() => {
    Toast.success(`${label || 'Copied'}: ${text.slice(0,16)}...`);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    Toast.success(label || 'Copied to clipboard!');
  });
}

// ---- CSV Export ----
function exportCSV(data, filename='export.csv') {
  const csv = data.map(row => Object.values(row).map(v=>`"${v}"`).join(',')).join('\n');
  const header = Object.keys(data[0]).join(',');
  const blob = new Blob([header+'\n'+csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  Toast.success('CSV exported!');
}

// ---- App State ----
const App = {
  portfolio: { total: 156420.69, pnl24h: 2.4, pnl7d: 8.7, pnl30d: 12.1 },
  gasPrice: { standard: 18, fast: 24, instant: 35 },
  connected: false,
  wallet: null,
  init() {
    initStagger();
    this.initGas();
  },
  initGas() {
    setInterval(() => {
      this.gasPrice.standard = 15 + Math.floor(Math.random()*10);
      this.gasPrice.fast = this.gasPrice.standard + 6;
      this.gasPrice.instant = this.gasPrice.standard + 16;
    }, 15000);
  },
};

// ---- Ripple effect ----
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn, .nav-item, .tab-btn');
  if(!btn) return;
  const r = document.createElement('span');
  r.className = 'ripple-effect';
  const rect = btn.getBoundingClientRect();
  r.style.left = (e.clientX - rect.left) + 'px';
  r.style.top  = (e.clientY - rect.top) + 'px';
  btn.style.position = btn.style.position || 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(r);
  setTimeout(() => r.remove(), 700);
});

document.addEventListener('DOMContentLoaded', () => App.init());
