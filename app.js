const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const AM = ['Wi-Fi', 'जेवण', 'AC', 'वॉशिंग मशीन', 'पार्किंग', 'वीज बिल समाविष्ट'];
const S = { req: 0, page: 0, more: false, counts: { total: 0, rented: 0 }, unlocks: {}, settings: { view_fee_paise: 4900, unlock_minutes: 30 }, user: null, admin: false, rooms: [], contacts: {}, favs: new Set(), favOnly: false, view: 'all', me: null, loc: null };

const setStatus = t => { $('status').textContent = t; };
const normPhone = v => { const d = String(v || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };
const photoUrl = p => sb.storage.from('room-photos').getPublicUrl(p).data.publicUrl;
const km = (a, b, c, d) => { const t = Math.PI / 180, x = (c - a) * t, y = (d - b) * t, h = Math.sin(x / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(y / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const locOf = r => { const l = Array.isArray(r.room_locations) ? r.room_locations[0] : r.room_locations; return l || null; };
const getLoc = () => new Promise((ok, bad) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => ok({ lat: p.coords.latitude, lng: p.coords.longitude }), bad, { enableHighAccuracy: true, timeout: 10000 }) : bad());

function mkAm(id, fn) {
  AM.forEach(a => { const l = el('label'), i = el('input'); i.type = 'checkbox'; i.value = a; if (fn) i.addEventListener('input', fn); l.append(i, a); $(id).append(l); });
}
const amVals = id => [...$(id).querySelectorAll('input:checked')].map(i => i.value);

function shrink(file) {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1000 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob(b => b ? res(b) : rej(new Error('फोटो प्रक्रिया अयशस्वी')), 'image/jpeg', 0.8);
    };
    img.onerror = () => rej(new Error('हा फोटो वाचता आला नाही'));
    img.src = u;
  });
}

/* ---------- Auth ---------- */
$('authBtn').addEventListener('click', async () => {
  if (S.user) { await sb.auth.signOut(); return; }
  await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
});
sb.auth.onAuthStateChange((_e, session) => { S.user = session ? session.user : null; setTimeout(afterAuth, 0); });

async function afterAuth() {
  S.admin = false;
  if (S.user) { const { data } = await sb.from('admins').select('user_id').maybeSingle(); S.admin = !!data; }
  $('authBtn').textContent = S.user ? 'Logout' : 'Google ने login';
  $('v_mine').classList.toggle('hide', !S.user); $('adminLink').classList.toggle('hide', !S.admin); $('favBtn').classList.toggle('hide', !S.user);
  if (!S.user) S.view = 'all';
  await load();
}

/* ---------- Data ---------- */
function showCounts() {
  const c = $('counts'); c.textContent = '';
  [['एकूण रूम', S.counts.total], ['भाड्याने गेलेल्या', S.counts.rented], ['रिकाम्या रूम', S.counts.total - S.counts.rented]]
    .forEach(([l, v]) => { const d = el('div'); d.append(el('b', '', v), el('span', '', l)); c.append(d); });
}

const PAGE = 24;
async function loadMeta() {
  const cnt = () => sb.from('rooms').select('id', { count: 'exact', head: true }).eq('hidden', false);
  const [tc, rc, st] = await Promise.all([cnt(), cnt().eq('rented', true), sb.from('settings').select('*').maybeSingle()]);
  S.counts = { total: tc.count || 0, rented: rc.count || 0 }; showCounts();
  if (st.data) S.settings = st.data;
  S.contacts = {}; S.favs = new Set(); S.unlocks = {};
  if (S.user) {
    const [c, f, u] = await Promise.all([sb.from('room_contacts').select('*'), sb.from('favorites').select('room_id'), sb.from('unlocks').select('room_id, expires_at').gt('expires_at', new Date().toISOString())]);
    S.contacts = Object.fromEntries((c.data || []).map(x => [x.room_id, x]));
    S.favs = new Set((f.data || []).map(x => x.room_id));
    S.unlocks = Object.fromEntries((u.data || []).map(x => [x.room_id, x.expires_at]));
  }
}
const clean = s => s.replace(/[,()%*\\]/g, ' ').trim();
async function loadRooms(reset = true) {
  const id = ++S.req; if (reset) S.page = 0;
  const q = clean($('q').value), col = clean($('college').value), ty = $('type').value, g = $('gender').value,
    mx = Number($('max').value) || 0, sam = amVals('s_am'), sort = $('sort').value, near = sort === 'near' && !!S.me;
  let b = sb.from('rooms').select('*, room_locations(lat,lng)');
  b = (S.view === 'mine' && S.user) ? b.eq('owner_id', S.user.id) : b.eq('hidden', false);
  if (q) b = b.or('city.ilike.*' + q + '*,area.ilike.*' + q + '*');
  if (col) b = b.ilike('college', '*' + col + '*');
  if (ty) b = b.eq('room_type', ty);
  if (g) b = b.eq('gender', g);
  if (mx) b = b.lte('rent', mx);
  if (sam.length) b = b.contains('amenities', sam);
  if (S.favOnly) b = b.in('id', S.favs.size ? [...S.favs] : ['00000000-0000-0000-0000-000000000000']);
  b = b.order('rented').order('featured', { ascending: false });
  b = sort === 'low' ? b.order('rent') : sort === 'high' ? b.order('rent', { ascending: false }) : b.order('created_at', { ascending: false });
  const size = near ? 200 : PAGE, from = near ? 0 : S.page * PAGE;
  const { data, error } = await b.range(from, from + size - 1);
  if (id !== S.req) return;
  if (error) { setStatus('डेटा लोड होत नाही: ' + error.message); return; }
  S.rooms = (reset || near) ? (data || []) : S.rooms.concat(data || []);
  S.more = !near && (data || []).length === PAGE;
  render();
}
async function load() { await loadMeta(); await loadRooms(true); }
let tmr; const reloadSoon = () => { clearTimeout(tmr); tmr = setTimeout(() => loadRooms(true), 350); };

/* ---------- Render ---------- */
function render() {
  ['all', 'mine'].forEach(v => { const b = $('v_' + v); b.classList.toggle('on', S.view === v); b.classList.toggle('ghost', S.view !== v); });
  const dd = r => { const l = locOf(r); return (r.featured && l && S.me) ? km(S.me.lat, S.me.lng, l.lat, l.lng) : 1e9; };
  const out = S.rooms.slice();
  if ($('sort').value === 'near' && S.me) out.sort((a, b) => (a.rented - b.rented) || (dd(a) - dd(b)));
  const list = $('list'); list.textContent = '';
  out.forEach(r => list.append(card(r, dd(r))));
  $('moreBtn').classList.toggle('hide', !S.more);
  setStatus(out.length ? out.length + ' रूम दाखवल्या' + (S.more ? ' – आणखी आहेत' : '')
    : (S.view === 'mine' ? 'तुम्ही अजून रूम टाकलेली नाही.' : (S.counts.total === 0 ? 'अजून एकही रूम नाही – पहिली रूम तुम्ही add करा!' : 'या शोधासाठी रूम नाही.')));
}

function card(r, dist) {
  const c = el('div', 'card listing'), top = el('div', 'top'), l = el('div');
  l.append(el('strong', '', r.area + ', ' + r.city));
  const tg = el('div');
  [r.room_type, r.gender].forEach(x => tg.append(el('span', 'tag', x)));
  if (r.featured) tg.append(el('span', 'tag feat', 'Featured'));
  if (r.hidden) tg.append(el('span', 'tag feat', 'लपवलेली'));
  if (r.featured_requested && !r.featured) tg.append(el('span', 'tag', 'Featured विनंती'));
  l.append(tg); top.append(l, el('div', 'price', '₹' + r.rent.toLocaleString('en-IN') + '/महिना')); c.append(top);
  if (r.deposit) c.append(el('div', 'mut', 'डिपॉझिट: ₹' + r.deposit.toLocaleString('en-IN')));
  if (r.college) c.append(el('div', 'mut', r.college + ' जवळ'));
  if (r.featured && dist < 1e9) c.append(el('div', 'mut', 'तुमच्यापासून सुमारे ' + dist.toFixed(1) + ' किमी'));
  if (r.amenities.length) { const d = el('div'); r.amenities.forEach(a => d.append(el('span', 'tag', a))); c.append(d); }
  if (r.photos.length) { const g = el('div', 'gal'); r.photos.forEach(p => { const i = el('img'); i.src = photoUrl(p); i.loading = 'lazy'; i.alt = 'रूमचा फोटो'; g.append(i); }); c.append(g); }
  if (r.description) c.append(el('p', '', r.description));
  const acts = el('div', 'row acts'), add = (t, cls, fn) => { const b = el('button', cls, t); b.addEventListener('click', fn); acts.append(b); return b; };
  const link = (t, cls, href) => { const a = el('a', cls, t); a.href = href; a.target = '_blank'; a.rel = 'noopener'; acts.append(a); };
  const ct = S.contacts[r.id], exp = S.unlocks[r.id], l2 = locOf(r);
  if (r.rented) { c.append(el('span', 'tag feat', 'भाड्याने गेली आहे')); c.style.opacity = '.65'; }
  else if (ct) {
    const box = el('div', 'unlock');
    box.append(el('strong', '', ct.owner_name + ' • ' + ct.phone), el('div', '', ct.address));
    if (exp) { const t = el('div', 'mut'); t.dataset.exp = exp; box.append(t); }
    c.append(box);
    link('WhatsApp', 'btn', 'https://wa.me/' + ct.phone + '?text=' + encodeURIComponent('नमस्कार, Room Finder वरील तुमची रूम पाहिली. अजून उपलब्ध आहे का?'));
    link('Call', 'btn ghost', 'tel:+' + ct.phone);
    if (l2) link('Maps वर पहा', 'btn ghost', 'https://www.google.com/maps?q=' + l2.lat + ',' + l2.lng);
  } else {
    acts.append(el('span', 'mut', 'पैसे भरल्यावर वापराच्या अटी लागू होतात.'));
    const pb = add(S.user ? 'संपर्क आणि पत्ता पहा – ₹' + (S.settings.view_fee_paise / 100) + ' (' + S.settings.unlock_minutes + ' मिनिटे)' : 'संपर्कासाठी login करा', '', () => { if (S.user) pay(r, pb); else $('authBtn').click(); });
  }
  if (S.user) {
    add(S.favs.has(r.id) ? 'Saved' : 'Save', 'ghost', async () => {
      if (S.favs.has(r.id)) { await sb.from('favorites').delete().eq('room_id', r.id).eq('user_id', S.user.id); S.favs.delete(r.id); }
      else { await sb.from('favorites').insert({ room_id: r.id }); S.favs.add(r.id); }
      if (S.favOnly) loadRooms(); else render();
    });
    if (r.owner_id !== S.user.id) add('तक्रार करा', 'ghost', async () => {
      const reason = prompt('काय चुकीचं आहे? (थोडक्यात लिहा)'); if (!reason || reason.trim().length < 3) return;
      const { error } = await sb.from('reports').insert({ room_id: r.id, reason: reason.trim().slice(0, 300) });
      alert(error ? 'तक्रार पाठवता आली नाही' : 'तक्रार नोंदवली, धन्यवाद');
    });
  }
  if (S.user && r.owner_id === S.user.id) {
    add(r.rented ? 'पुन्हा उपलब्ध' : 'भाड्याने गेली', 'ghost', async () => { await sb.from('rooms').update({ rented: !r.rented }).eq('id', r.id); load(); });
    if (!r.featured && !r.featured_requested && r.owner_id === S.user.id)
      add('Featured साठी विनंती', 'ghost', async () => { await sb.from('rooms').update({ featured_requested: true }).eq('id', r.id); load(); });
    const del = add('Delete', 'ghost', async () => {
      if (!del.dataset.s) { del.dataset.s = '1'; del.textContent = 'खात्री? पुन्हा दाबा'; return; }
      if (r.photos.length) await sb.storage.from('room-photos').remove(r.photos);
      await sb.from('rooms').delete().eq('id', r.id); load();
    });
  }
  c.append(acts); return c;
}

/* ---------- Post ---------- */
async function post() {
  if (!S.user) { $('msg').textContent = 'आधी login करा.'; return; }
  const v = id => $(id).value.trim(), phone = normPhone(v('f_phone')), rent = Number(v('f_rent')) || 0;
  if (v('f_city').length < 2 || v('f_area').length < 2 || !rent || v('f_name').length < 2 || v('f_address').length < 5) { $('msg').textContent = 'शहर, एरिया, भाडे, नाव आणि पूर्ण पत्ता आवश्यक आहे.'; return; }
  if (!$('f_terms').checked) { $('msg').textContent = 'अटी मान्य करण्यासाठी बॉक्स टिक करा.'; return; }
  if (!/^91[6-9]\d{9}$/.test(phone)) { $('msg').textContent = 'योग्य 10 अंकी मोबाईल नंबर टाका.'; return; }
  const btn = $('save'); btn.disabled = true; $('msg').textContent = 'Post होत आहे…';
  const up = [];
  try {
    for (const f of [...$('f_photos').files].slice(0, 3)) {
      const p = S.user.id + '/' + crypto.randomUUID() + '.jpg';
      const { error } = await sb.storage.from('room-photos').upload(p, await shrink(f), { contentType: 'image/jpeg' });
      if (error) throw error; up.push(p);
    }
    const { data: room, error } = await sb.from('rooms').insert({
      city: v('f_city'), area: v('f_area'), college: v('f_college') || null, rent, deposit: Number(v('f_dep')) || null,
      room_type: v('f_type'), gender: v('f_gender'), amenities: amVals('f_am'), description: v('f_desc') || null, photos: up
    }).select().single();
    if (error) throw error;
    const c = await sb.from('room_contacts').insert({ room_id: room.id, owner_name: v('f_name'), phone, address: v('f_address') });
    if (c.error) { await sb.from('rooms').delete().eq('id', room.id); throw c.error; }
    if (S.loc) await sb.from('room_locations').insert({ room_id: room.id, lat: S.loc.lat, lng: S.loc.lng });
    $('msg').textContent = 'रूम प्रसिद्ध झाली.';
    ['f_city', 'f_area', 'f_college', 'f_rent', 'f_dep', 'f_desc', 'f_name', 'f_phone', 'f_address', 'f_photos'].forEach(i => { $(i).value = ''; });
    $('f_terms').checked = false;
    $('f_am').querySelectorAll('input').forEach(i => { i.checked = false; }); S.loc = null; $('locMsg').textContent = '';
    await load();
  } catch (e) {
    if (up.length) await sb.storage.from('room-photos').remove(up);
    $('msg').textContent = 'Post करता आले नाही: ' + (e.message || e);
  }
  btn.disabled = false;
}

/* ---------- Events ---------- */
['q', 'college', 'type', 'gender', 'max'].forEach(id => $(id).addEventListener('input', reloadSoon));
$('moreBtn').addEventListener('click', () => { S.page++; loadRooms(false); });
$('sort').addEventListener('input', async () => {
  if ($('sort').value === 'near' && !S.me) { try { S.me = await getLoc(); } catch (e) { setStatus('लोकेशन मिळाली नाही – फोनची location चालू करा / परवानगी द्या.'); return; } }
  loadRooms();
});
$('favBtn').addEventListener('click', () => { S.favOnly = !S.favOnly; $('favBtn').textContent = S.favOnly ? 'Saved (चालू)' : 'Saved'; loadRooms(); });
['all', 'mine'].forEach(v => $('v_' + v).addEventListener('click', () => { S.view = v; loadRooms(); }));
$('addBtn').addEventListener('click', () => {
  if (!S.user) { $('authBtn').click(); return; }
  $('form').classList.toggle('hide');
});
$('locBtn').addEventListener('click', async () => {
  $('locMsg').textContent = 'लोकेशन घेत आहे…';
  try { S.loc = await getLoc(); $('locMsg').textContent = 'लोकेशन मिळाली'; }
  catch (e) { S.loc = null; $('locMsg').textContent = 'लोकेशन मिळाली नाही – फोनची location चालू करा / परवानगी द्या.'; }
});
$('save').addEventListener('click', post);
mkAm('f_am'); mkAm('s_am', reloadSoon);

document.querySelectorAll('[data-brand]').forEach(e => { e.textContent = CONFIG.BRAND || e.textContent; });
if (CONFIG.CONTACT_EMAIL) { const c = $('contactLine'); const m = el('a', '', CONFIG.CONTACT_EMAIL); m.href = 'mailto:' + CONFIG.CONTACT_EMAIL; c.append(m); }

/* ---------- पेमेंट (Razorpay) आणि वेळेचा काउंटडाउन ---------- */
function loadRzp() {
  return new Promise((ok, bad) => {
    if (window.Razorpay) return ok();
    const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = ok; s.onerror = () => bad(new Error('पेमेंट विंडो लोड झाली नाही')); document.head.append(s);
  });
}
async function pay(r, btn) {
  btn.disabled = true;
  try {
    await loadRzp();
    const { data, error } = await sb.functions.invoke('create-order', { body: { room_id: r.id } });
    if (error || !data || data.error) throw new Error((data && data.error) || 'पेमेंट सुरू करता आले नाही');
    await new Promise((ok, bad) => {
      const rz = new Razorpay({
        key: data.key_id, order_id: data.order_id, amount: data.amount, currency: 'INR', name: CONFIG.BRAND || 'Room Finder',
        description: 'घरमालकाचा संपर्क आणि पत्ता (' + S.settings.unlock_minutes + ' मिनिटे)', prefill: { email: S.user.email },
        theme: { color: '#0e5a8a' }, handler: ok, modal: { ondismiss: () => bad(new Error('पेमेंट रद्द झाले')) }
      });
      rz.on('payment.failed', () => bad(new Error('पेमेंट अयशस्वी झाले')));
      rz.open();
    });
    setStatus('पेमेंट मिळाले, माहिती उघडत आहे…');
    for (let i = 0; i < 20; i++) { await new Promise(t => setTimeout(t, 1500)); await load(); if (S.unlocks[r.id]) return; }
    setStatus('पेमेंट झाले आहे, पण माहिती उघडायला उशीर होत आहे. पान refresh करा.');
  } catch (e) { setStatus(e.message || 'पेमेंट झाले नाही'); btn.disabled = false; }
}
setInterval(() => {
  let expired = false;
  document.querySelectorAll('[data-exp]').forEach(t => {
    const s = Math.floor((new Date(t.dataset.exp) - Date.now()) / 1000);
    if (s <= 0) { expired = true; return; }
    t.textContent = 'बाकी वेळ ' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') + ' – नंतर ही माहिती लपेल';
  });
  if (expired && Date.now() - (S.last || 0) > 5000) { S.last = Date.now(); load(); }
}, 1000);
