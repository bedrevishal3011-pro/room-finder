const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const A = { user: null, rooms: [], contacts: {}, reports: [], tab: 'req', busy: false };
document.querySelectorAll('[data-brand]').forEach(e => { e.textContent = CONFIG.BRAND || e.textContent; });

const show = name => ['loading', 'login', 'denied', 'app'].forEach(s => $('s_' + s).classList.toggle('hide', s !== name));
let noteTimer;
const note = t => { const n = $('note'); n.textContent = t; n.classList.remove('hide'); clearTimeout(noteTimer); noteTimer = setTimeout(() => n.classList.add('hide'), 4000); };
const logout = () => sb.auth.signOut();
$('loginBtn').addEventListener('click', () => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }));
$('logoutBtn').addEventListener('click', logout); $('logoutBtn2').addEventListener('click', logout);
sb.auth.onAuthStateChange(() => setTimeout(init, 0));

async function init() {
  if (A.busy) return; A.busy = true;
  try {
    const { data: { session } } = await sb.auth.getSession(); A.user = session ? session.user : null;
    if (!A.user) { show('login'); return; }
    const { data } = await sb.from('admins').select('user_id').maybeSingle();
    if (!data) { $('deniedWho').textContent = A.user.email || 'या'; show('denied'); return; }
    $('who').textContent = A.user.email; show('app'); await loadAll();
  } catch (e) { show('login'); note('login तपासता आले नाही: ' + (e.message || e)); }
  finally { A.busy = false; }
}

async function loadAll() {
  const [r, c, p, st, un] = await Promise.all([
    sb.from('rooms').select('*').order('created_at', { ascending: false }).limit(1000),
    sb.from('room_contacts').select('*'),
    sb.from('reports').select('id, reason, created_at, room_id, rooms(area, city, hidden)').order('created_at', { ascending: false }),
    sb.from('settings').select('*').maybeSingle(),
    sb.from('unlocks').select('amount_paise')
  ]);
  if (r.error) { note('डेटा लोड होत नाही: ' + r.error.message); return; }
  A.rooms = r.data || []; A.reports = p.data || []; A.settings = st.data; A.unlocks = un.data || [];
  A.contacts = Object.fromEntries((c.data || []).map(x => [x.room_id, x]));
  render();
}

function stats() {
  const n = (f) => A.rooms.filter(f).length, s = $('stats'); s.textContent = '';
  [['एकूण रूम', A.rooms.length], ['Featured', n(r => r.featured)], ['Featured विनंत्या', n(r => r.featured_requested && !r.featured)],
   ['उघड्या तक्रारी', A.reports.length], ['लपवलेल्या', n(r => r.hidden)], ['भाड्याने गेलेल्या', n(r => r.rented)],
   ['पेमेंट (unlock)', A.unlocks.length], ['एकूण कमाई', '₹' + (A.unlocks.reduce((t, x) => t + x.amount_paise, 0) / 100).toLocaleString('en-IN')]]
    .forEach(([l, v]) => { const d = el('div', 'stat'); d.append(el('b', '', v), el('span', '', l)); s.append(d); });
}

async function act(fn, ok) { const { error } = await fn(); if (error) { note('अयशस्वी: ' + error.message); return; } if (ok) note(ok); await loadAll(); }
const upd = (id, patch) => sb.from('rooms').update(patch).eq('id', id);

function btn(parent, text, cls, fn) {
  const b = el('button', cls, text); b.addEventListener('click', () => fn(b)); parent.append(b); return b;
}
function delBtn(parent, r) {
  btn(parent, 'Delete', 'danger', async b => {
    if (!b.dataset.s) { b.dataset.s = '1'; b.textContent = 'खात्री? पुन्हा दाबा'; return; }
    if (r.photos.length) await sb.storage.from('room-photos').remove(r.photos);
    act(() => sb.from('rooms').delete().eq('id', r.id), 'रूम delete केली');
  });
}

function roomItem(r, mode) {
  const d = el('div', 'item'), top = el('div', 'top'), l = el('div'), ct = A.contacts[r.id];
  l.append(el('strong', '', r.area + ', ' + r.city), el('div', 'mut', ct ? ct.owner_name + ' • ' + ct.phone : 'संपर्क माहिती नाही'));
  const tg = el('div');
  [r.room_type, r.gender, r.photos.length + ' फोटो'].forEach(x => tg.append(el('span', 'tag', x)));
  if (r.featured) tg.append(el('span', 'tag feat', 'Featured'));
  if (r.hidden) tg.append(el('span', 'tag feat', 'लपवलेली'));
  if (r.rented) tg.append(el('span', 'tag', 'भाड्याने गेली'));
  l.append(tg);
  top.append(l, el('div', 'mut', '₹' + r.rent.toLocaleString('en-IN') + '/महिना • ' + new Date(r.created_at).toLocaleDateString('en-IN'))); d.append(top);
  if (r.description) d.append(el('div', 'mut', r.description.slice(0, 160)));
  const acts = el('div', 'acts');
  if (mode === 'req') {
    btn(acts, 'Featured मंजूर करा', '', () => act(() => upd(r.id, { featured: true, featured_requested: false }), 'Featured केली'));
    btn(acts, 'विनंती नाकारा', 'ghost', () => act(() => upd(r.id, { featured_requested: false }), 'विनंती नाकारली'));
  } else {
    btn(acts, r.featured ? 'Featured काढा' : 'Featured करा', 'ghost', () => act(() => upd(r.id, { featured: !r.featured, featured_requested: false })));
    btn(acts, r.hidden ? 'पुन्हा दाखवा' : 'लपवा', 'ghost', () => act(() => upd(r.id, { hidden: !r.hidden })));
    delBtn(acts, r);
  }
  d.append(acts); return d;
}

function render() {
  stats();
  ['req', 'rooms', 'rep', 'fee'].forEach(t => $('t_' + t).classList.toggle('on', A.tab === t));
  $('tools').classList.toggle('hide', A.tab !== 'rooms');
  const list = $('list'); list.textContent = '';
  if (A.tab === 'req') {
    const rs = A.rooms.filter(r => r.featured_requested && !r.featured);
    rs.forEach(r => list.append(roomItem(r, 'req')));
    if (!rs.length) list.append(el('p', 'mut', 'सध्या कोणतीही Featured विनंती नाही.'));
  } else if (A.tab === 'rooms') {
    const q = $('aq').value.trim().toLowerCase(), f = $('af').value;
    const rs = A.rooms.filter(r => {
      const ct = A.contacts[r.id] || {};
      const hay = [r.city, r.area, ct.owner_name, ct.phone].join(' ').toLowerCase();
      return (!q || hay.includes(q)) && (f === 'all' || (f === 'featured' && r.featured) || (f === 'hidden' && r.hidden) || (f === 'rented' && r.rented));
    });
    rs.forEach(r => list.append(roomItem(r, 'all')));
    if (!rs.length) list.append(el('p', 'mut', 'या शोधासाठी रूम नाही.'));
  } else if (A.tab === 'fee') {
    feeForm(list);
  } else {
    A.reports.forEach(x => {
      const d = el('div', 'item'), room = A.rooms.find(r => r.id === x.room_id);
      d.append(el('strong', '', x.rooms ? x.rooms.area + ', ' + x.rooms.city : 'रूम सापडली नाही'),
        el('div', '', x.reason), el('div', 'mut', new Date(x.created_at).toLocaleDateString('en-IN')));
      const acts = el('div', 'acts');
      if (room) { btn(acts, room.hidden ? 'पुन्हा दाखवा' : 'रूम लपवा', 'ghost', () => act(() => upd(room.id, { hidden: !room.hidden }))); delBtn(acts, room); }
      btn(acts, 'तक्रार बंद करा', '', () => act(() => sb.from('reports').delete().eq('id', x.id), 'तक्रार बंद केली'));
      d.append(acts); list.append(d);
    });
    if (!A.reports.length) list.append(el('p', 'mut', 'कोणतीही उघडी तक्रार नाही.'));
  }
}
[['req', 't_req'], ['rooms', 't_rooms'], ['rep', 't_rep'], ['fee', 't_fee']].forEach(([t, id]) => $(id).addEventListener('click', () => { A.tab = t; render(); }));
$('aq').addEventListener('input', render); $('af').addEventListener('change', render);

function feeForm(list) {
  const s = A.settings || { view_fee_paise: 4900, unlock_minutes: 30 }, d = el('div', 'item');
  d.append(el('strong', '', 'संपर्क पाहण्याचं शुल्क'),
    el('p', 'mut', 'विद्यार्थ्याने पैसे भरल्यावर घरमालकाचा नंबर आणि पत्ता इतका वेळ दिसतो, नंतर लपतो आणि पुन्हा पैसे भरावे लागतात. बदल फक्त नवीन पेमेंटसाठी लागू होतो.'));
  const f = el('input'), m = el('input'); f.type = 'number'; m.type = 'number'; f.min = 1; f.max = 5000; m.min = 5; m.max = 1440;
  f.value = s.view_fee_paise / 100; m.value = s.unlock_minutes;
  const l1 = el('label', '', 'शुल्क (₹, प्रति रूम)'), l2 = el('label', '', 'माहिती दिसण्याचा वेळ (मिनिटे)'); l1.append(f); l2.append(m);
  const acts = el('div', 'acts');
  btn(acts, 'जतन करा', '', () => {
    const fee = Number(f.value), mins = Number(m.value);
    if (!(fee >= 1 && fee <= 5000) || !(mins >= 5 && mins <= 1440)) { note('शुल्क ₹1–5000 आणि वेळ 5–1440 मिनिटे असावी.'); return; }
    act(() => sb.from('settings').update({ view_fee_paise: Math.round(fee * 100), unlock_minutes: Math.round(mins) }).eq('id', 1), 'शुल्क जतन केलं');
  });
  d.append(l1, l2, acts); list.append(d);
}
