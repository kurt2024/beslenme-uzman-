(() => {
'use strict';
const $ = s => document.querySelector(s);
const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]']);
const RAW = window.__API_BASE__ || '';
const UNRES = RAW.startsWith('__PORT_');
const API = UNRES ? (LOCAL.has(location.hostname) ? 'http://localhost:8000' : null) : RAW;

let SOURCES = [], SMAP = {};
const S = { mode: 'adult', conds: { adult: new Set(), child: new Set() }, history: [], busy: false, ctrl: null };

const ACT = {
  adult: [['1.2', 'Sedanter — masa başı, egzersiz yok'], ['1.375', 'Hafif — haftada 1–3 gün'], ['1.55', 'Orta — haftada 3–5 gün'], ['1.725', 'Yüksek — haftada 6–7 gün'], ['1.9', 'Çok yüksek — ağır iş / çift antrenman']],
  child: [['0', 'Sedanter — çoğunlukla oturarak'], ['1', 'Düşük aktif — günde ~30–60 dk hareket'], ['2', 'Aktif — günde ≥60 dk hareket'], ['3', 'Çok aktif — düzenli spor / antrenman']]
};
const CONDS = {
  adult: ['Tip 2 diyabet', 'Prediyabet', 'Hipertansiyon', 'Yüksek kolesterol', 'Yağlı karaciğer', 'Çölyak', 'Laktoz intoleransı', 'Gıda alerjisi', 'Vejetaryen', 'Vegan', 'Gebelik', 'Emzirme', 'Düzenli spor', '65 yaş üstü'],
  child: ['Seçici yeme', 'Gıda alerjisi', 'Çölyak', 'Kabızlık', 'Fazla kilo endişesi', 'Zayıflık / iştahsızlık', 'Demir eksikliği', 'Vejetaryen aile', 'Sporcu çocuk', 'Tip 1 diyabet']
};
const SUGS = {
  adult: [
    ['Akdeniz tipi haftalık menü', 'Türk mutfağıyla 7 günlük plan', 'Bana Akdeniz diyetine uygun, Türk mutfağından örneklerle 7 günlük bir menü hazırlar mısın? Kanıtlarını da belirt.'],
    ['Sürdürülebilir kilo verme', 'Enerji açığı, protein, lif', 'Sağlıklı ve sürdürülebilir şekilde kilo vermek istiyorum. Profilime göre günlük enerji hedefimi ve örnek bir gün planı çıkarır mısın?'],
    ['Tip 2 diyabette tabak', 'Karbonhidrat kalitesi ve öğün düzeni', 'Tip 2 diyabette tabak modeli nasıl olmalı? Hangi karbonhidratları tercih etmeliyim?'],
    ['Tansiyon için DASH', 'Tuz, potasyum, pratik değişimler', 'Yüksek tansiyon için DASH beslenmesini Türk sofrasına nasıl uyarlarım? Tuzu nasıl azaltırım?'],
    ['Sporcu için protein', 'Miktar, zamanlama, kaynaklar', 'Haftada 4 gün ağırlık antrenmanı yapıyorum. Günde ne kadar protein almalıyım ve nasıl dağıtmalıyım?'],
    ['Akıllı ara öğünler', 'Tok tutan, düşük şekerli fikirler', 'İş yerinde tok tutan, şekeri düşük 10 ara öğün fikri verir misin?']
  ],
  child: [
    ['6. ayda ek gıdaya geçiş', 'İlk besinler, doku, porsiyon', 'Bebeğim 6 aylık oldu. Ek gıdaya nasıl başlamalıyım, ilk hafta neler verebilirim, nelerden kaçınmalıyım?'],
    ['Seçici yiyen çocuk', 'Baskısız, kanıta dayalı stratejiler', '3 yaşındaki çocuğum çok seçici yiyor, sebze yemiyor. Baskı yapmadan ne yapabilirim?'],
    ['Okul beslenme çantası', '5 günlük dengeli fikirler', 'İlkokula giden çocuğum için 5 günlük dengeli beslenme çantası önerir misin?'],
    ['Meyve suyu ve şeker', 'Yaşa göre sınırlar', 'Çocuklarda meyve suyu ve ilave şeker için yaşa göre sınırlar neler?'],
    ['Alerjen tanıtımı', 'Yer fıstığı, yumurta, süt', 'Bebeğime yer fıstığı ve yumurta gibi alerjenleri ne zaman ve nasıl tanıtmalıyım?'],
    ['Ergen sporcu', 'Enerji, demir, kalsiyum', '14 yaşında futbol oynayan oğlum için antrenman günlerinde beslenme nasıl olmalı?']
  ]
};
const COPY = {
  adult: { eyebrow: 'Yetişkin beslenmesi', title: 'Ne yediğinizi bilimle konuşalım.', lede: 'WHO, TÜBER 2022, EFSA ve hakemli kılavuzlara dayanarak kişiye özel öneriler, örnek menüler ve alışkanlık planları hazırlarım. Her öneri atıf numarasıyla kaynağına bağlanır.', ph: 'Beslenme sorunuzu yazın…', p: 'Yetişkin' },
  child: { eyebrow: 'Çocuk ve ergen beslenmesi', title: 'Büyüyen bedenler için sakin, kanıta dayalı rehberlik.', lede: 'Bebeklikten ergenliğe; ek gıda, seçici yeme, okul beslenmesi ve sporcu çocuklar için ebeveyne yönelik öneriler. Kısıtlayıcı diyet yerine aile temelli, WHO, ESPGHAN ve AAP kılavuzlarına dayalı yaklaşım.', ph: 'Çocuğunuzun beslenmesiyle ilgili sorunuzu yazın…', p: 'Çocuk' }
};

/* ---------- profile ---------- */
const form = $('#pform');
function buildMode() {
  const m = S.mode, c = COPY[m];
  document.body.dataset.mode = m;
  document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-selected', b.dataset.mode === m));
  $('#wEyebrow').textContent = c.eyebrow; $('#wTitle').textContent = c.title; $('#wLede').textContent = c.lede;
  $('#input').placeholder = c.ph; form.note.placeholder = m === 'child' ? 'ör. sabahları iştahsız, öğle yemeğini okulda yiyor…' : 'ör. vardiyalı çalışıyorum, akşamları tatlı krizi…'; $('#pTitle').textContent = c.p;
  $('#ageLbl').textContent = m === 'child' ? 'Yaş (ör. 0.5 = 6 ay)' : 'Yaş';
  $('#act').innerHTML = '<option value="">—</option>' + ACT[m].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  $('#conds').innerHTML = CONDS[m].map(x => `<button type="button" class="chip" aria-pressed="${S.conds[m].has(x)}">${x}</button>`).join('');
  $('#sugs').innerHTML = SUGS[m].map(([t, s, q], i) => `<button class="sug" data-i="${i}" data-testid="sug-${i}"><b>${t}</b><span>${s}</span></button>`).join('');
  calc();
}
$('#conds').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  const set = S.conds[S.mode], v = b.textContent;
  set.has(v) ? set.delete(v) : set.add(v);
  b.setAttribute('aria-pressed', set.has(v));
});
form.addEventListener('input', calc);
document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
  if (S.mode === b.dataset.mode) return;
  S.mode = b.dataset.mode; form.reset(); buildMode();
}));

function vals() {
  const f = new FormData(form), n = k => { const v = parseFloat(String(f.get(k) || '').replace(',', '.')); return isFinite(v) ? v : null; };
  return { sex: f.get('sex'), age: n('age'), h: n('h'), w: n('w'), act: f.get('act'), goal: f.get('goal'), note: (f.get('note') || '').trim() };
}
const fmt = (x, d = 0) => x.toLocaleString('tr-TR', { maximumFractionDigits: d, minimumFractionDigits: d });

function compute() {
  const v = vals(), out = { v, m: [], note: '' };
  const hm = v.h ? v.h / 100 : null;
  const bmi = v.w && hm ? v.w / (hm * hm) : null;
  if (S.mode === 'adult') {
    if (v.age != null && v.age < 18) out.note = '18 yaş altı için “Çocuk” modunu kullanın; yetişkin denklemleri ergenlerde geçerli değildir.';
    if (bmi) {
      const cls = bmi < 18.5 ? ['Zayıf', 'warn'] : bmi < 25 ? ['Normal aralık', 'ok'] : bmi < 30 ? ['Fazla kilolu', 'warn'] : ['Obezite', 'bad'];
      out.m.push({ k: 'BKİ', v: fmt(bmi, 1), u: 'kg/m²', s: cls[0] + ' (WHO)' });
      out.bmi = `${fmt(bmi, 1)} kg/m² — ${cls[0]}`;
    }
    if (v.w && v.h && v.age != null && v.age >= 18 && v.sex) {
      const bmr = 10 * v.w + 6.25 * v.h - 5 * v.age + (v.sex === 'm' ? 5 : -161);
      out.m.push({ k: 'Bazal (BMR)', v: fmt(Math.round(bmr / 10) * 10), u: 'kcal', s: 'Mifflin-St Jeor' });
      out.bmr = Math.round(bmr);
      if (v.act) {
        const tdee = bmr * parseFloat(v.act);
        let tgt = tdee, lbl = 'Koruma';
        if (v.goal === 'lose') { tgt = Math.max(tdee - 450, v.sex === 'm' ? 1500 : 1200); lbl = 'Kilo verme hedefi'; }
        if (v.goal === 'gain') { tgt = tdee + 300; lbl = 'Kazanım hedefi'; }
        out.m.push({ k: 'Günlük harcama', v: fmt(Math.round(tdee / 10) * 10), u: 'kcal', s: 'BMR × aktivite' });
        if (v.goal === 'lose' || v.goal === 'gain') out.m.push({ k: lbl, v: fmt(Math.round(tgt / 10) * 10), u: 'kcal', s: v.goal === 'lose' ? '≈ −450 kcal/gün' : '≈ +300 kcal/gün' });
        out.tdee = Math.round(tdee); out.tgt = Math.round(tgt);
      }
    }
    if (v.w) {
      const sport = S.conds.adult.has('Düzenli spor');
      out.m.push({ k: 'Protein', v: sport ? `${fmt(v.w * 1.4)}–${fmt(v.w * 2)}` : fmt(v.w * 0.83), u: 'g/gün', s: sport ? 'ISSN 1,4–2,0 g/kg' : 'EFSA 0,83 g/kg' });
      out.m.push({ k: 'Su (toplam)', v: v.sex === 'm' ? '2,5' : v.sex === 'f' ? '2,0' : '2,0–2,5', u: 'L/gün', s: 'EFSA yeterli alım' });
    }
  } else {
    if (v.age != null && v.age >= 19) out.note = '19 yaş ve üzeri için “Yetişkin” modunu kullanın.';
    if (bmi && v.age != null && v.age >= 2) {
      out.m.push({ k: 'BKİ', v: fmt(bmi, 1), u: 'kg/m²', s: 'Yorum için yaşa göre persentil gerekir' });
      out.bmi = `${fmt(bmi, 1)} kg/m² (çocukta WHO yaşa göre BKİ persentili ile yorumlanmalı)`;
    }
    if (v.w && v.age != null && v.age < 19) {
      let eer = null;
      if (v.age < 3) {
        const mo = v.age * 12;
        eer = 89 * v.w - 100 + (mo <= 3 ? 175 : mo <= 6 ? 56 : mo <= 12 ? 22 : 20);
      } else if (v.h && v.sex && v.act !== '' && v.act != null) {
        const i = +v.act, hm2 = v.h / 100, add = v.age < 9 ? 20 : 25;
        eer = v.sex === 'm'
          ? 88.5 - 61.9 * v.age + [1, 1.13, 1.26, 1.42][i] * (26.7 * v.w + 903 * hm2) + add
          : 135.3 - 30.8 * v.age + [1, 1.16, 1.31, 1.56][i] * (10 * v.w + 934 * hm2) + add;
      }
      if (eer) { out.m.push({ k: 'Tahmini enerji', v: fmt(Math.round(eer / 10) * 10), u: 'kcal', s: 'IOM 2005 EER', wide: true }); out.eer = Math.round(eer); }
    }
    if (v.age != null && v.age < 1) out.m.push({ k: 'Hatırlatma', v: v.age < 0.5 ? 'Yalnızca anne sütü' : 'Anne sütü + ek gıda', u: '', s: 'WHO · 1 yaş altına bal, tuz, şeker yok', wide: true });
    const hasBmi = out.m.length && out.m[0].k === 'BKİ';
    out.m.splice(hasBmi ? 1 : 0, 0, { k: 'Büyüme', v: 'WHO', u: 'eğrisi', s: 'Boy-kilo takibini hekim yapar', wide: !hasBmi });
  }
  return out;
}

function calc() {
  const r = compute();
  $('#metrics').innerHTML = r.m.length && (r.v.w || r.v.age != null)
    ? r.m.map(x => `<div class="metric${x.wide ? ' wide' : ''}"><div class="k">${x.k}</div><div class="v">${x.v}${x.u ? `<small>${x.u}</small>` : ''}</div><div class="s">${x.s}</div></div>`).join('')
    : `<div class="metric empty">Yaş, boy, kilo ve aktiviteyi girdiğinizde ${S.mode === 'adult' ? 'BKİ, bazal metabolizma ve günlük enerji' : 'tahmini enerji ihtiyacı'} burada hesaplanır.</div>`;
  $('#mNote').textContent = r.note || 'Hesaplamalar popülasyon denklemlerine dayalı tahminlerdir; bireysel ihtiyaç farklı olabilir.';
}

function profilePayload() {
  const r = compute(), v = r.v, p = {};
  p['Mod'] = S.mode === 'adult' ? 'Yetişkin (kullanıcının kendisi)' : 'Çocuk / ergen (soruyu ebeveyn soruyor)';
  if (v.sex) p['Cinsiyet'] = v.sex === 'm' ? 'Erkek' : 'Kadın/Kız';
  if (v.age != null) p['Yaş'] = v.age < 2 && S.mode === 'child' ? `${fmt(v.age * 12)} ay` : `${fmt(v.age, 1)} yıl`;
  if (v.h) p['Boy'] = v.h + ' cm';
  if (v.w) p['Kilo'] = v.w + ' kg';
  if (v.act) p['Aktivite'] = ACT[S.mode].find(a => a[0] === v.act)?.[1];
  if (v.goal && S.mode === 'adult') p['Hedef'] = { lose: 'Kilo vermek', keep: 'Kiloyu korumak', gain: 'Kilo/kas kazanmak', health: 'Genel sağlık' }[v.goal];
  const cs = [...S.conds[S.mode]]; if (cs.length) p['Durumlar/tercihler'] = cs.join(', ');
  if (v.note) p['Not'] = v.note.slice(0, 400);
  if (r.bmi) p['BKİ'] = r.bmi;
  if (r.bmr) p['BMR (Mifflin-St Jeor)'] = r.bmr + ' kcal';
  if (r.tdee) p['Tahmini günlük harcama'] = r.tdee + ' kcal';
  if (r.tgt && r.tgt !== r.tdee) p['Hedef enerji'] = r.tgt + ' kcal';
  if (r.eer) p['Tahmini enerji ihtiyacı (IOM EER)'] = r.eer + ' kcal';
  return p;
}

/* ---------- markdown + citations ---------- */
marked.setOptions({ gfm: true, breaks: false });
function render(md) {
  const withCites = md.replace(/\[(K\d{1,2})\]/g, (m, id) => {
    const s = SMAP[id]; if (!s) return '';
    return `<a class="cite" href="${s.url}" target="_blank" rel="noopener" title="${s.org} (${s.year}) — ${s.title.replace(/"/g, '&quot;')}">${id}</a>`;
  });
  return DOMPurify.sanitize(marked.parse(withCites), { ADD_ATTR: ['target'] });
}
function refsHtml(md) {
  const ids = [...new Set([...md.matchAll(/\[(K\d{1,2})\]/g)].map(m => m[1]))].filter(id => SMAP[id]);
  if (!ids.length) return '';
  return `<div class="refs"><h4>Bu yanıttaki kaynaklar</h4><ol>${ids.map(id => { const s = SMAP[id]; return `<li><span class="cite tag">${id}</span><a href="${s.url}" target="_blank" rel="noopener">${esc(s.org)} (${esc(s.year)}). ${esc(s.title)}</a></li>`; }).join('')}</ol></div>`;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- chat ---------- */
const msgs = $('#msgs'), scroller = $('#scroll'), input = $('#input');
const AV = '<div class="av" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 5.5 13.8 12 12 18.5 10.2 12Z" fill="currentColor"/></svg></div>';
const nearBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 140;
const toBottom = (force) => { if (force || nearBottom()) scroller.scrollTop = scroller.scrollHeight; };

function addUser(text) {
  const d = document.createElement('div'); d.className = 'msg user';
  d.innerHTML = `<div class="bubble" data-testid="msg-user"></div>`; d.firstChild.textContent = text;
  msgs.appendChild(d);
}
function addBot() {
  const d = document.createElement('div'); d.className = 'msg bot';
  d.innerHTML = `${AV}<div class="body"><div class="md" data-testid="msg-bot"><span class="typing"><i></i><i></i><i></i></span></div></div>`;
  msgs.appendChild(d); return d;
}
function setBusy(b) {
  S.busy = b; $('#send').hidden = b; $('#stop').hidden = !b; updateSend();
}
function updateSend() { $('#send').disabled = !input.value.trim() || S.busy; }

async function send(text) {
  text = text.trim(); if (!text || S.busy) return;
  $('#welcome').hidden = true;
  addUser(text); S.history.push({ role: 'user', content: text });
  input.value = ''; autosize();
  const node = addBot(), mdEl = node.querySelector('.md');
  toBottom(true); setBusy(true);
  let acc = '', raf = 0;
  const paint = () => { raf = 0; mdEl.innerHTML = render(acc); toBottom(); };
  try {
    if (!API) throw new Error('Sunucu bağlantısı yapılandırılmadı.');
    S.ctrl = new AbortController();
    const res = await fetch(`${API}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: S.history, profile: profilePayload() }), signal: S.ctrl.signal, credentials: 'same-origin' });
    if (!res.ok || !res.body) throw new Error(`Sunucu yanıt vermedi (${res.status}).`);
    const reader = res.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2);
        if (!line.startsWith('data:')) continue;
        const d = JSON.parse(line.slice(5));
        if (d.error) throw new Error('Model hatası: ' + d.error);
        if (d.stop === 'max_tokens') acc += '\n\n> Yanıt uzunluk sınırına ulaştı. Devamı için “devam et” yazabilirsiniz.';
        if (d.t) { acc += d.t; if (!raf) raf = requestAnimationFrame(paint); }
      }
    }
    if (raf) cancelAnimationFrame(raf);
    finish(node, acc);
  } catch (e) {
    if (raf) cancelAnimationFrame(raf);
    if (e.name === 'AbortError') { finish(node, acc + (acc ? '\n\n*(yanıt durduruldu)*' : '_(yanıt durduruldu)_')); }
    else {
      if (acc) finish(node, acc);
      else { node.remove(); S.history.pop(); }
      showErr(e.message, text);
    }
  } finally { setBusy(false); S.ctrl = null; input.focus({ preventScroll: true }); }
}
function finish(node, acc) {
  if (!acc.trim()) { node.remove(); S.history.pop(); return; }
  S.history.push({ role: 'assistant', content: acc });
  node.querySelector('.md').innerHTML = render(acc);
  const body = node.querySelector('.body');
  body.insertAdjacentHTML('beforeend', refsHtml(acc) + `<div class="actions"><button class="ghost" data-act="copy">Kopyala</button></div>`);
  body.querySelector('[data-act="copy"]').onclick = async (ev) => {
    try { await navigator.clipboard.writeText(acc.replace(/\[(K\d+)\]/g, '')); ev.target.textContent = 'Kopyalandı'; } catch { ev.target.textContent = 'Kopyalanamadı'; }
    setTimeout(() => ev.target.textContent = 'Kopyala', 1600);
  };
  toBottom();
}
function showErr(msg, retryText) {
  const d = document.createElement('div'); d.className = 'msg bot';
  d.innerHTML = `${AV}<div class="body"><div class="err">${esc(msg)} <button>Tekrar dene</button></div></div>`;
  d.querySelector('button').onclick = () => { d.remove(); msgs.lastElementChild?.classList.contains('user') && msgs.lastElementChild.remove(); send(retryText); };
  msgs.appendChild(d); toBottom(true);
}

function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 180) + 'px'; updateSend(); }
input.addEventListener('input', autosize);
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia('(min-width:861px)').matches) { e.preventDefault(); send(input.value); } });
$('#composer').addEventListener('submit', e => { e.preventDefault(); send(input.value); });
$('#stop').onclick = () => S.ctrl?.abort();
$('#sugs').addEventListener('click', e => { const b = e.target.closest('.sug'); if (b) send(SUGS[S.mode][+b.dataset.i][2]); });
$('#newChat').onclick = () => { S.ctrl?.abort(); S.history = []; msgs.innerHTML = ''; $('#welcome').hidden = false; scroller.scrollTop = 0; input.focus(); };

/* ---------- drawers ---------- */
const scrim = $('#scrim'), drawer = $('#sources'), prof = $('#profile');
function closeAll() { drawer.hidden = true; prof.classList.remove('open'); scrim.hidden = true; }
$('#openSources').onclick = () => { drawer.hidden = false; scrim.hidden = false; $('#sq').focus(); };
$('#closeSources').onclick = closeAll;
$('#openProfile').onclick = () => { prof.classList.add('open'); scrim.hidden = false; };
$('#closeProfile').onclick = closeAll;
scrim.onclick = closeAll;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

function renderSources(q = '') {
  q = q.toLocaleLowerCase('tr');
  const list = SOURCES.filter(s => !q || `${s.id} ${s.title} ${s.org} ${s.topic} ${s.type} ${s.short}`.toLocaleLowerCase('tr').includes(q));
  $('#slist').innerHTML = list.length ? list.map(s => `<li id="src-${s.id}"><div class="meta"><span class="cite">${s.id}</span><span>${esc(s.org)}</span><span>· ${esc(s.year)}</span><span class="pill">${esc(s.type)}</span><span class="pill">${esc(s.topic)}</span></div><a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')
    : '<li class="muted">Eşleşen kaynak bulunamadı.</li>';
}
$('#sq').addEventListener('input', e => renderSources(e.target.value));

/* ---------- init ---------- */
buildMode(); autosize();
fetch('sources.json').then(r => r.json()).then(d => { SOURCES = d; SMAP = Object.fromEntries(d.map(s => [s.id, s])); renderSources(); })
  .catch(() => { $('#slist').innerHTML = '<li class="muted">Kaynak listesi yüklenemedi.</li>'; });
})();
