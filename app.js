const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const el = (t, c, x) => {
  const e = document.createElement(t);
  if (c) e.className = c;
  if (x != null) e.textContent = x;
  return e;
};
const AM = ['Wi-Fi', 'जेवण', 'AC', 'वॉशिंग मशीन', 'पार्किंग', 'वीज बिल समाविष्ट'];
const S = {
  req: 0,
  page: 0,
  more: false,
  counts: { total: 0, rented: 0 },
  unlocks: {},
  settings: { view_fee_paise: 4900, unlock_minutes: 30 },
  user: null,
  admin: false,
  rooms: [],
  contacts: {},
  favorites: new Set(),
  favOnly: false,
  view: 'all',
  me: null
};

const setStatus = t => { $('status').textContent = t; };
const normPhone = v => {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 10 ? '91' + d : d;
};
const photoUrl = p => sb.storage.from('room-photos').getPublicUrl(p).data.publicUrl;
const km = (a, b, c, d) => {
  const t = Math.PI / 180, x = (c - a) * t, y = (d - b) * t;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(y / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const locOf = r => {
  const l = Array.isArray(r.room_locations) ? r.room_locations[0] : r.room_locations;
  return l || null;
};const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const el = (t, c, x, attrs = {}) => {
  const e = document.createElement(t);
  if (c) e.className = c;
  if (x != null) e.textContent = x;
  Object.assign(e, attrs);
  return e;
};
const AM = ['Wi-Fi', 'जेवण', 'AC', 'वॉशिंग मशीन', 'पार्किंग', 'वीज बिल समाविष्ट'];
const S = {
  req: 0,
  page: 0,
  more: false,
  counts: { total: 0, rented: 0 },
  unlocks: {},
  settings: { view_fee_paise: 4900, unlock_minutes: 30 },
  user: null,
  admin: false,
  rooms: [],
  contacts: {},
  favorites: new Set(),
  favOnly: false,
  view: 'all',
  me: null,
  loc: null
};

function isPaymentOff() {
  const s = S.settings || {};
  if (s.payment_enabled === false) return true;
  if (s.payment_off === true) return true;
  if (s.view_fee_paise != null && Number(s.view_fee_paise) <= 0) return true;
  return false;
}

function roomStatus(r) {
  if (!r) return 'available';
  if (r.hidden || r.status === 'inactive') return 'inactive';
  if (r.status === 'rented' || r.rented === true) return 'rented';
  return 'available';
}

function loadFavs() {
  try {
    const raw = localStorage.getItem('room_favs');
    if (raw) {
      const arr = JSON.parse(raw);
      S.favorites = new Set(arr);
    }
  } catch (e) {}
}

function saveFavs() {
  try {
    localStorage.setItem('room_favs', JSON.stringify([...S.favorites]));
  } catch (e) {}
}

function toggleFav(id) {
  if (S.favorites.has(id)) {
    S.favorites.delete(id);
  } else {
    S.favorites.add(id);
  }
  saveFavs();
  render();
}

function showCounts() {
  const c = $('counts');
  if (!c) return;
  c.textContent = '';
  const total = S.counts.total || 0;
  const rented = S.counts.rented || 0;
  const vacant = Math.max(0, total - rented);
  [
    ['एकूण रूम', total],
    ['भाड्याने गेलेल्या', rented],
    ['रिकाम्या रूम', vacant]
  ].forEach(([l, v]) => {
    const d = el('div');
    d.append(el('b', '', v), el('span', '', l));
    c.append(d);
  });
}

async function loadMeta() {
  const cnt = () => sb
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('hidden', false);

  const [tc, rc, st] = await Promise.all([
    cnt().or('status.is.null,status.neq.inactive'),
    cnt().or('status.eq.rented,and(status.is.null,rented.eq.true)'),
    sb.from('settings').select('*').maybeSingle()
  ]);

  if (!tc.error) S.counts.total = tc.count || 0;
  if (!rc.error) S.counts.rented = rc.count || 0;
  if (!st.error && st.data) S.settings = { ...S.settings, ...st.data };
  showCounts();
}

async function loadContactsFor(rooms) {
  if (!S.user || !rooms.length) return;

  const { data, error } = await sb
    .from('room_contacts')
    .select('room_id, owner_name, phone, address')
    .in('room_id', rooms.map(r => r.id));

  if (error) {
    console.error('Contacts load error:', error);
    return;
  }
  for (const contact of data || []) S.contacts[contact.room_id] = contact;
}
    return;
  }

  if (!S.user) return;
  const { data, error } = await sb
    .from('room_unlocks')
    .select('room_id, expires_at')
    .eq('user_id', S.user.id)
    .gt('expires_at', new Date().toISOString());

  if (error || !data || !data.length) return;

  const unlockedIds = data.map(u => {
    S.unlocks[u.room_id] = u.expires_at;
    return u.room_id;
  });

  if (!unlockedIds.length) return;

  const { data: contactsData } = await sb
    .from('room_contacts')
    .select('room_id, owner_name, phone, address')
    .in('room_id', unlockedIds);

  if (contactsData) {
    contactsData.forEach(c => {
      S.contacts[c.room_id] = c;
    });
  }
}

async function toggleRent(r) {
  const curStatus = roomStatus(r);
  const willBeRented = curStatus !== 'rented';
  const newRented = willBeRented;
  const newStatus = willBeRented ? 'rented' : 'available';

  const { error } = await sb
    .from('rooms')
    .update({ rented: newRented, status: newStatus })
    .eq('id', r.id);

  if (!error) {
    r.rented = newRented;
    r.status = newStatus;
    await loadMeta();
    render();
  } else {
    alert('एरर आला: ' + (error.message || 'स्टेटस अपडेट होऊ शकले नाही'));
  }
}

async function loadRooms(reset = false) {
  if (reset) {
    S.page = 0;
    S.rooms = [];
  }
  const PAGE_SIZE = 12;
  let b = sb.from('rooms').select('*');

  if (S.view === 'mine' && S.user) {
    b = b.eq('owner_id', S.user.id);
  } else {
    b = b.eq('hidden', false).eq('rented', false).or('status.is.null,status.eq.available');
  }

  const queryText = $('q')?.value?.trim();
  if (queryText) {
    b = b.or(`title.ilike.%${queryText}%,address.ilike.%${queryText}%,description.ilike.%${queryText}%`);
  }

  b = b.order('created_at', { ascending: false }).range(S.page * PAGE_SIZE, (S.page + 1) * PAGE_SIZE - 1);

  const { data, error } = await b;
  if (!error && data) {
    S.more = data.length === PAGE_SIZE;
    if (reset) S.rooms = data;
    else S.rooms = S.rooms.concat(data);
    await loadContactsFor(data);
  }
  render();
}

function locOf(r) {
  if (r.lat && r.lng) return { lat: r.lat, lng: r.lng };
  if (r.location && r.location.coordinates) {
    return { lat: r.location.coordinates[1], lng: r.location.coordinates[0] };
  }
  return null;
}

function render() {
  const list = $('list');
  if (!list) return;
  list.textContent = '';

  let out = S.rooms || [];
  if (S.view === 'mine') {
    if (S.user) {
      out = out.filter(r => r.owner_id === S.user.id);
    } else {
      out = [];
    }
  } else {
    out = out.filter(r => roomStatus(r) === 'available' && !r.hidden);
  }

  if (S.favOnly) {
    out = out.filter(r => S.favorites.has(r.id));
  }

  if (!out.length) {
    list.append(el('div', 'empty', S.favOnly ? 'कोणतीही आवडती रूम नाही.' : 'एकही रूम सापडली नाही.'));
    return;
  }

  out.forEach(r => list.append(card(r)));

  const moreBtn = $('moreBtn');
  if (moreBtn) {
    moreBtn.style.display = S.more ? 'block' : 'none';
  }
}

function card(r) {
  const c = el('div', 'card');
  const status = roomStatus(r);
  const isOwner = S.user && r.owner_id === S.user.id;

  const top = el('div', 'card-top');
  const t = el('h3', '', r.title || 'रूम');
  top.append(t);

  const favBtn = el('button', 'fav-btn' + (S.favorites.has(r.id) ? ' active' : ''), S.favorites.has(r.id) ? '❤️' : '🤍');
  favBtn.onclick = (e) => {
    e.stopPropagation();
    toggleFav(r.id);
  };
  top.append(favBtn);
  c.append(top);

  if (r.rent || r.deposit) {
    const meta = el('div', 'meta');
    if (r.rent) meta.append(el('span', 'price', '₹' + r.rent + '/महिना'));
    if (r.deposit) meta.append(el('span', 'deposit', 'डिपॉझिट: ₹' + r.deposit));
    c.append(meta);
  }

  if (r.description) {
    c.append(el('p', 'desc', r.description));
  }

  if (r.amenities && Array.isArray(r.amenities) && r.amenities.length) {
    const am = el('div', 'amenities');
    r.amenities.forEach(a => am.append(el('span', 'tag', a)));
    c.append(am);
  }

  const ct = S.contacts[r.id];
  const exp = S.unlocks[r.id];
  const l2 = locOf(r);
  const paymentDisabled = isPaymentOff();

  if (status === 'rented') {
    c.append(el('span', 'tag feat', 'भाड्याने गेलेली आहे'));
  } else if (status === 'inactive') {
    c.append(el('span', 'mut', 'ही रूम सध्या जाहिरातीत दाखवली जात नाही.'));
  } else if (paymentDisabled || ct) {
    const box = el('div', 'unlock');
    const ownerName = ct?.owner_name || r.owner_name || 'रूम मालक';
    const phone = ct?.phone || r.phone || r.contact_phone || '';
    const addr = ct?.address || r.address || r.full_address || 'पत्ता उपलब्ध आहे';

    box.append(
      el('strong', '', ownerName + (phone ? ' • ' + phone : '')),
      el('div', '', addr)
    );

    if (exp && !paymentDisabled) {
      const expDiv = el('div', 'mut');
      expDiv.dataset.exp = exp;
      box.append(expDiv);
    }
    c.append(box);

    const acts = el('div', 'acts');
    if (phone) {
      const waMsg = encodeURIComponent('नमस्कार, Room Finder वर तुमची रूम पाहिली: ' + (r.title || ''));
      acts.append(
        el('a', 'btn', 'WhatsApp', { href: 'https://wa.me/' + phone.replace(/[^0-9]/g, '') + '?text=' + waMsg, target: '_blank' }),
        el('a', 'btn ghost', 'Call', { href: 'tel:' + phone })
      );
    }
    if (l2) {
      acts.append(el('a', 'btn ghost', 'Maps वर पहा', { href: 'https://www.google.com/maps?q=' + l2.lat + ',' + l2.lng, target: '_blank' }));
    }
    c.append(acts);
  } else {
    const acts = el('div', 'acts');
    acts.append(el('span', 'mut', 'पैसे भरल्यावर वापराच्या अटी लागू होतात.'));
    const feeRs = (S.settings.view_fee_paise || 4900) / 100;
    const pb = el('button', 'btn', S.user
      ? 'संपर्क आणि पत्ता पहा - ₹' + feeRs + ' (' + (S.settings.unlock_minutes || 30) + ' मिनिटे)'
      : 'संपर्कासाठी login करा'
    );
    pb.onclick = () => {
      if (S.user) pay(r, pb);
      else $('authBtn')?.click();
    };
    acts.append(pb);
    c.append(acts);
  }

  if (isOwner) {
    const ownerActs = el('div', 'owner-acts');
    const rentToggleBtn = el('button', 'btn ghost', status === 'rented' ? 'उपलब्ध आहे म्हणून मार्क करा' : 'भाड्याने गेली म्हणून मार्क करा');
    rentToggleBtn.onclick = () => toggleRent(r);
    ownerActs.append(rentToggleBtn);
    c.append(ownerActs);
  }

  return c;
}

async function init() {
  loadFavs();
  await loadMeta();

  sb.auth.onAuthStateChange((evt, sess) => {
    S.user = sess?.user || null;
    updateAuthUI();
    loadRooms(true);
  });

  const { data: { session } } = await sb.auth.getSession();
  S.user = session?.user || null;
  updateAuthUI();
  await loadRooms(true);

  setupEventListeners();
}

function updateAuthUI() {
  const authBtn = $('authBtn');
  if (authBtn) {
    authBtn.textContent = S.user ? 'Logout (' + (S.user.email || 'User') + ')' : 'Login / Sign up';
  }
  const mineTab = $('tabMine');
  if (mineTab) {
    mineTab.style.display = S.user ? 'inline-block' : 'none';
  }
}

function setupEventListeners() {
  $('tabAll')?.addEventListener('click', () => {
    S.view = 'all';
    $('tabAll').classList.add('active');
    $('tabMine')?.classList.remove('active');
    loadRooms(true);
  });

  $('tabMine')?.addEventListener('click', () => {
    S.view = 'mine';
    $('tabMine').classList.add('active');
    $('tabAll')?.classList.remove('active');
    loadRooms(true);
  });

  $('favFilter')?.addEventListener('click', () => {
    S.favOnly = !S.favOnly;
    $('favFilter').classList.toggle('active', S.favOnly);
    render();
  });

  $('searchBtn')?.addEventListener('click', () => loadRooms(true));
  $('moreBtn')?.addEventListener('click', () => {
    S.page++;
    loadRooms(false);
  });

  $('authBtn')?.addEventListener('click', async () => {
    if (S.user) {
      await sb.auth.signOut();
      S.user = null;
      updateAuthUI();
      loadRooms(true);
    } else {
      const email = prompt('ईमेल टाका:');
      if (email) {
        const { error } = await sb.auth.signInWithOtp({ email });
        if (error) alert('एरर: ' + error.message);
        else alert('लॉगिन लिंक ईमेलवर पाठवली आहे.');
      }
    }
  });
}

function loadRzp() {
  return new Promise((ok, bad) => {
    if (window.Razorpay) return ok();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = ok;
    s.onerror = () => bad(new Error('पेमेंट विंडो लोड झाली नाही'));
    document.head.append(s);
  });
}

async function pay(r, btn) {
  if (btn) {
    btn.disabled = true;
    btn.classList.add('busy');
  }
  try {
    await loadRzp();
    const { data, error } = await sb.functions.invoke('create-order', { body: { room_id: r.id } });
    if (error || !data || data.error) throw new Error((data && data.error) || 'पेमेंट सुरू करता आले नाही');

    const rz = new Razorpay({
      key: data.key_id,
      order_id: data.order_id,
      amount: data.amount,
      currency: 'INR',
      name: CONFIG.BRAND || 'Room Finder',
      description: 'घरमालकाचा संपर्क आणि पत्ता (' + S.settings.unlock_minutes + ' मिनिटे)',
      prefill: { email: S.user.email },
      theme: { color: '#0e5a8a' },
      handler: async () => {
        await loadContactsFor([r]);
        render();
      },
      modal: { ondismiss: () => alert('पेमेंट रद्द झाले') }
    });
    rz.on('payment.failed', () => alert('पेमेंट अयशस्वी झाले'));
    rz.open();
  } catch (err) {
    alert(err.message || 'पेमेंट करताना त्रुटी आली');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('busy');
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
const roomStatus = r =>
  ['available', 'rented', 'inactive'].includes(r.status)
    ? r.status
    : (r.rented ? 'rented' : (r.hidden ? 'inactive' : 'available'));

const getLoc = () => new Promise((ok, bad) =>
  navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(
        p => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
        bad,
        { enableHighAccuracy: true, timeout: 10000 }
      )
    : bad(new Error('लोकेशन उपलब्ध नाही'))
);

function mkAm(id, fn) {
  AM.forEach(a => {
    const l = el('label'), i = el('input');
    i.type = 'checkbox';
    i.value = a;
    if (fn) i.addEventListener('input', fn);
    l.append(i, a);
    $(id).append(l);
  });
}
const amVals = id => [...$(id).querySelectorAll('input:checked')].map(i => i.value);

function shrink(file) {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob(b => b ? res(b) : rej(new Error('फोटो प्रक्रिया अयशस्वी')), 'image/jpeg', 0.8);
    };
    img.onerror = () => rej(new Error('हा फोटो वाचता आला नाही'));
    img.src = u;
  });
}

function updateUserName() {
  let nameEl = $('userName');
  if (!nameEl) {
    nameEl = el('span');
    nameEl.id = 'userName';
    nameEl.style.cssText = 'display:inline-block;margin-right:10px;font-weight:600;color:#0e5a8a;font-size:14px;';
    $('authBtn').insertAdjacentElement('beforebegin', nameEl);
  }
  if (S.user) {
    const name = S.user.user_metadata?.full_name || S.user.user_metadata?.name || S.user.email?.split('@')[0] || 'User';
    nameEl.textContent = 'नमस्कार, ' + name;
    nameEl.style.display = 'inline-block';
  } else {
    nameEl.textContent = '';
    nameEl.style.display = 'none';
  }
}

/* ---------- Auth ---------- */
$('authBtn').addEventListener('click', async () => {
  if (S.user) {
    await sb.auth.signOut();
    return;
  }
  await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname }
  });
});

sb.auth.onAuthStateChange((_e, session) => {
  S.user = session ? session.user : null;
  setTimeout(afterAuth, 0);
});

async function afterAuth() {
  S.admin = false;
  if (S.user) {
    const { data } = await sb.from('admins').select('user_id').maybeSingle();
    S.admin = !!data;
  }
  $('authBtn').textContent = S.user ? 'Logout' : 'Google ने login';
  updateUserName();
  $('v_mine').classList.toggle('hide', !S.user);
  $('adminLink').classList.toggle('hide', !S.admin);
  $('favBtn').classList.toggle('hide', !S.user);
  if (!S.user) S.view = 'all';
  await load();
}

/* ---------- Data ---------- */
function showCounts() {
  const c = $('counts');
  c.textContent = '';
  const vacant = Math.max(0, (S.counts.total || 0) - (S.counts.rented || 0));
  [
    ['एकूण रूम', S.counts.total || 0],
    ['भाड्याने गेलेल्या', S.counts.rented || 0],
    ['रिकाम्या रूम', vacant]
  ].forEach(([l, v]) => {
    const d = el('div');
    d.append(el('b', '', v), el('span', '', l));
    c.append(d);
  });
}

const PAGE = 24;

async function refreshUserData() {
  S.favorites = new Set();
  S.unlocks = {};
  if (!S.user) return;
  const now = new Date().toISOString();
  const [f, u] = await Promise.all([
    sb.from('favorites').select('room_id'),
    sb.from('unlocks').select('room_id, expires_at').eq('user_id', S.user.id).gt('expires_at', now)
  ]);
  if (f.error) console.error('Favorites load error:', f.error);
  if (u.error) console.error('Unlocks load error:', u.error);
  S.favorites = new Set((f.data || []).map(x => x.room_id));
  S.unlocks = Object.fromEntries((u.data || []).map(x => [x.room_id, x.expires_at]));
}

async function loadMeta() {
  const cnt = () => sb
    .from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('hidden', false)
    .or('status.is.null,status.neq.inactive');

  const [tc, rc, st] = await Promise.all([
    cnt(),
    cnt().or('status.eq.rented,and(status.is.null,rented.eq.true)'),
    sb.from('settings').select('*').maybeSingle()
  ]);

  if (tc.error) console.error('Room count error:', tc.error);
  if (rc.error) console.error('Rented count error:', rc.error);
  if (st.error) console.error('Settings load error:', st.error);

  S.counts = { total: tc.count || 0, rented: rc.count || 0 };
  showCounts();
  if (st.data) S.settings = { ...S.settings, ...st.data };
  S.contacts = {};
  await refreshUserData();
}

const clean = s => s.replace(/[,()%*\\]/g, ' ').trim();

async function loadContactsFor(rooms) {
  if (!S.user || !rooms.length) return;
  const { data, error } = await sb
    .from('room_contacts')
    .select('room_id, owner_name, phone, address')
    .in('room_id', rooms.map(r => r.id));
  if (error) {
    console.error('Contacts load error:', error);
    return;
  }
  for (const contact of data || []) S.contacts[contact.room_id] = contact;
}

async function loadRooms(reset = true, quiet = false) {
  const id = ++S.req;
  if (reset) {
    S.page = 0;
    if (!quiet) showSkeleton();
  }
  const q = clean($('q').value);
  const col = clean($('college').value);
  const ty = $('type').value;
  const g = $('gender').value;
  const mx = Number($('max').value) || 0;
  const sam = amVals('s_am');
  const sort = $('sort').value;
  const near = sort === 'near' && !!S.me;

  let b = sb.from('rooms').select('*, room_locations(lat,lng)');

  if (S.view === 'mine' && S.user) {
    // 'माझ्या रूम' मध्ये मालकाला स्वतःच्या सर्व रूम (भाड्याने गेलेल्यांसह) दिसतील
    b = b.eq('owner_id', S.user.id);
  } else {
    // होम/सार्वजनिक लिस्टमध्ये फक्त रिकाम्या/उपलब्ध रूम दिसतील; भाड्याने गेलेल्या आणि inactive लपवल्या जातील
    b = b
      .eq('hidden', false)
      .eq('rented', false)
      .or('status.is.null,and(status.neq.inactive,status.neq.rented)');
  }

  if (q) b = b.or('city.ilike.*' + q + '*,area.ilike.*' + q + '*');
  if (col) b = b.ilike('college', '*' + col + '*');
  if (ty) b = b.eq('room_type', ty);
  if (g) b = b.eq('gender', g);
  if (mx) b = b.lte('rent', mx);
  if (sam.length) b = b.contains('amenities', sam);
  if (S.favOnly) {
    b = b.in('id', S.favorites.size ? [...S.favorites] : ['00000000-0000-0000-0000-000000000000']);
  }

  b = b.order('featured', { ascending: false });
  b = sort === 'low'
    ? b.order('rent')
    : sort === 'high'
      ? b.order('rent', { ascending: false })
      : b.order('created_at', { ascending: false });
  b = b.order('id');

  const size = near ? 200 : PAGE;
  const from = near ? 0 : S.page * PAGE;
  const { data, error } = await b.range(from, from + size - 1);
  if (id !== S.req) return;
  if (error) {
    setStatus('डेटा लोड होत नाही: ' + error.message);
    console.error('Rooms load error:', error);
    return;
  }

  const roomsData = (data || []).map(r => ({
    ...r,
    rent: Number(r.rent) || 0,
    deposit: Number(r.deposit) || 0,
    amenities: Array.isArray(r.amenities) ? r.amenities : [],
    photos: Array.isArray(r.photos) ? r.photos : []
  }));

  if (reset || near) S.contacts = {};
  S.rooms = (reset || near) ? roomsData : S.rooms.concat(roomsData);
  S.more = !near && roomsData.length === PAGE;
  await loadContactsFor(roomsData);
  if (id !== S.req) return;
  render();
}

async function load(quiet = false) {
  if (!quiet) showSkeleton();
  await loadMeta();
  await loadRooms(true, true);
}

let tmr;
const reloadSoon = () => {
  clearTimeout(tmr);
  tmr = setTimeout(() => loadRooms(true), 350);
};

/* ---------- Render ---------- */
function render() {
  ['all', 'mine'].forEach(v => {
    const b = $('v_' + v);
    b.classList.toggle('on', S.view === v);
    b.classList.toggle('ghost', S.view !== v);
  });

  const dd = r => {
    const l = locOf(r);
    return (r.featured && l && S.me) ? km(S.me.lat, S.me.lng, l.lat, l.lng) : 1e9;
  };

  const out = S.rooms.slice();
  if ($('sort').value === 'near' && S.me) {
    out.sort((a, b) => dd(a) - dd(b));
  }

  const list = $('list');
  list.textContent = '';
  out.forEach(r => list.append(card(r, dd(r))));
  $('moreBtn').classList.toggle('hide', !S.more);

  setStatus(
    out.length
      ? out.length + ' रूम दाखवल्या' + (S.more ? ' – आणखी आहेत' : '')
      : (S.view === 'mine'
          ? 'तुम्ही अजून रूम टाकलेली नाही.'
          : (S.counts.total === 0 ? 'अजून एकही रूम नाही – पहिली रूम तुम्ही add करा!' : 'या शोधासाठी रिकाम्या रूम नाहीत.'))
  );
}

function card(r, dist) {
  const c = el('div', 'card listing');
  const status = roomStatus(r);
  const top = el('div', 'top');
  const l = el('div');
  l.append(el('strong', '', r.area + ', ' + r.city));

  const tg = el('div');
  [r.room_type, r.gender].filter(Boolean).forEach(x => tg.append(el('span', 'tag', x)));
  if (r.featured) tg.append(el('span', 'tag feat', 'Featured'));
  if (r.hidden) tg.append(el('span', 'tag feat', 'लपवलेली'));
  if (r.featured_requested && !r.featured) tg.append(el('span', 'tag', 'Featured विनंती'));
  l.append(tg);

  top.append(l, el('div', 'price', '₹' + r.rent.toLocaleString('en-IN') + '/महिना'));
  c.append(top);

  const statusText = { available: 'उपलब्ध (रिकामी)', rented: 'भाड्याने गेलेली', inactive: 'निष्क्रिय' };
  c.append(el('span', `room-status-badge room-status-${status}`, statusText[status]));

  if (r.deposit) c.append(el('div', 'mut', 'डिपॉझिट: ₹' + r.deposit.toLocaleString('en-IN')));
  if (r.college) c.append(el('div', 'mut', r.college + ' जवळ'));
  if (r.featured && dist < 1e9) c.append(el('div', 'mut', 'तुमच्यापासून सुमारे ' + dist.toFixed(1) + ' किमी'));
  if (r.amenities.length) {
    const d = el('div');
    r.amenities.forEach(a => d.append(el('span', 'tag', a)));
    c.append(d);
  }
  if (r.photos.length) {
    const urls = r.photos.map(photoUrl);
    const g = el('div', 'gal');
    urls.forEach((u, k) => {
      const i = el('img');
      i.src = u;
      i.loading = 'lazy';
      i.alt = 'रूमचा फोटो ' + (k + 1) + ' (मोठा करायला दाबा)';
      i.tabIndex = 0;
      i.setAttribute('role', 'button');
      i.addEventListener('click', () => openLightbox(urls, k));
      i.addEventListener('keydown', e => { if (e.key === 'Enter') openLightbox(urls, k); });
      g.append(i);
    });
    c.append(g);
  }
  if (r.description) c.append(el('p', '', r.description));

  const acts = el('div', 'row acts');
  const add = (t, cls, fn) => {
    const b = el('button', cls, t);
    b.addEventListener('click', fn);
    acts.append(b);
    return b;
  };
  const link = (t, cls, href) => {
    const a = el('a', cls, t);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    acts.append(a);
  };

  const ct = S.contacts[r.id];
  const exp = S.unlocks[r.id];
  const l2 = locOf(r);

  if (status === 'rented') {
    c.append(el('span', 'tag feat', 'भाड्याने गेली आहे'));
  } else if (status === 'inactive') {
    c.append(el('span', 'mut', 'ही रूम सध्या जाहिरातीत दाखवली जात नाही.'));
  } else if (ct) {
    const box = el('div', 'unlock');
    box.append(el('strong', '', ct.owner_name + ' • ' + ct.phone), el('div', '', ct.address));
    if (exp) {
      const t = el('div', 'mut');
      t.dataset.exp = exp;
      box.append(t);
    }
    c.append(box);
    link('WhatsApp', 'btn', 'https://wa.me/' + ct.phone + '?text=' + encodeURIComponent('नमस्कार, Room Finder वरील तुमची रूम पाहिली. अजून उपलब्ध आहे का?'));
    link('Call', 'btn ghost', 'tel:+' + ct.phone);
    if (r.featured && l2) {
      link('Maps वर पहा', 'btn ghost', 'https://www.google.com/maps?q=' + l2.lat + ',' + l2.lng);
    }
  } else {
    acts.append(el('span', 'mut', 'पैसे भरल्यावर वापराच्या अटी लागू होतात.'));
    const pb = add(
      S.user
        ? 'संपर्क आणि पत्ता पहा – ₹' + (S.settings.view_fee_paise / 100) + ' (' + S.settings.unlock_minutes + ' मिनिटे)'
        : 'संपर्कासाठी login करा',
      '',
      () => { if (S.user) pay(r, pb); else $('authBtn').click(); }
    );
  }

  if (S.user) {
    add(S.favorites.has(r.id) ? 'Saved' : 'Save', 'ghost', async () => {
      if (S.favorites.has(r.id)) {
        await sb.from('favorites').delete().eq('room_id', r.id).eq('user_id', S.user.id);
        S.favorites.delete(r.id);
      } else {
        await sb.from('favorites').insert({ room_id: r.id, user_id: S.user.id });
        S.favorites.add(r.id);
      }
      if (S.favOnly) loadRooms();
      else render();
    });

    if (r.owner_id !== S.user.id) {
      add('तक्रार करा', 'ghost', async () => {
        const reason = prompt('काय चुकीचं आहे? (थोडक्यात लिहा)');
        if (!reason || reason.trim().length < 3) return;
        const { error } = await sb.from('reports').insert({ room_id: r.id, reason: reason.trim().slice(0, 300) });
        alert(error ? 'तक्रार पाठवता आली नाही' : 'तक्रार नोंदवली, धन्यवाद');
      });
    }
  }

  if (S.user && r.owner_id === S.user.id) {
    const isRented = status === 'rented';
    add(isRented ? 'पुन्हा उपलब्ध' : 'भाड्याने गेली', 'ghost', async () => {
      const nextRented = !isRented;
      await sb
        .from('rooms')
        .update({ rented: nextRented, status: nextRented ? 'rented' : 'available' })
        .eq('id', r.id);
      await load();
    });

    if (!r.featured && !r.featured_requested) {
      add('Featured साठी विनंती', 'ghost', async () => {
        await sb.from('rooms').update({ featured_requested: true }).eq('id', r.id);
        await load();
      });
    }

    const del = add('Delete', 'ghost', async () => {
      if (!del.dataset.s) {
        del.dataset.s = '1';
        del.textContent = 'खात्री? पुन्हा दाबा';
        return;
      }
      if (r.photos.length) await sb.storage.from('room-photos').remove(r.photos);
      await sb.from('rooms').delete().eq('id', r.id);
      await load();
    });
  }

  c.append(acts);
  return c;
}

/* ---------- Post ---------- */
async function post() {
  if (!S.user) { $('msg').textContent = 'आधी login करा.'; return; }
  const v = id => $(id).value.trim();
  const phone = normPhone(v('f_phone'));
  const rent = Number(v('f_rent')) || 0;
  if (v('f_city').length < 2 || v('f_area').length < 2 || !rent || v('f_name').length < 2 || v('f_address').length < 5) {
    $('msg').textContent = 'शहर, एरिया, भाडे, नाव आणि पूर्ण पत्ता आवश्यक आहे.';
    return;
  }
  if (!$('f_terms').checked) { $('msg').textContent = 'अटी मान्य करण्यासाठी बॉक्स टिक करा.'; return; }
  if (!/^91[6-9]\d{9}$/.test(phone)) { $('msg').textContent = 'योग्य 10 अंकी मोबाईल नंबर टाका.'; return; }

  const btn = $('save');
  btn.disabled = true;
  btn.classList.add('busy');
  $('msg').textContent = 'Post होत आहे…';
  const up = [];
  try {
    for (const f of [...$('f_photos').files].slice(0, 3)) {
      const p = S.user.id + '/' + crypto.randomUUID() + '.jpg';
      const { error } = await sb.storage.from('room-photos').upload(p, await shrink(f), { contentType: 'image/jpeg' });
      if (error) throw error;
      up.push(p);
    }
    const { data: room, error } = await sb.from('rooms').insert({
      city: v('f_city'),
      area: v('f_area'),
      college: v('f_college') || null,
      rent,
      deposit: Number(v('f_dep')) || null,
      room_type: v('f_type'),
      gender: v('f_gender'),
      amenities: amVals('f_am'),
      description: v('f_desc') || null,
      photos: up,
      rented: false,
      status: 'available',
      owner_id: S.user.id
    }).select().single();
    if (error) throw error;

    const c = await sb.from('room_contacts').insert({
      room_id: room.id,
      owner_name: v('f_name'),
      phone,
      address: v('f_address')
    });
    if (c.error) {
      await sb.from('rooms').delete().eq('id', room.id);
      throw c.error;
    }
    if (S.loc) {
      await sb.from('room_locations').insert({ room_id: room.id, lat: S.loc.lat, lng: S.loc.lng });
    }
    $('msg').textContent = 'रूम प्रसिद्ध झाली.';
    ['f_city', 'f_area', 'f_college', 'f_rent', 'f_dep', 'f_desc', 'f_name', 'f_phone', 'f_address', 'f_photos'].forEach(i => {
      $(i).value = '';
    });
    $('f_terms').checked = false;
    $('f_am').querySelectorAll('input').forEach(i => { i.checked = false; });
    S.loc = null;
    $('locMsg').textContent = '';
    await load();
  } catch (e) {
    if (up.length) await sb.storage.from('room-photos').remove(up);
    $('msg').textContent = 'Post करता आले नाही: ' + (e.message || e);
  }
  btn.disabled = false;
  btn.classList.remove('busy');
}

/* ---------- Events ---------- */
['q', 'college', 'type', 'gender', 'max'].forEach(id => $(id).addEventListener('input', reloadSoon));
$('moreBtn').addEventListener('click', () => { S.page++; loadRooms(false); });
$('sort').addEventListener('input', async () => {
  if ($('sort').value === 'near' && !S.me) {
    try { S.me = await getLoc(); }
    catch (e) { setStatus('लोकेशन मिळाली नाही – फोनची location चालू करा / परवानगी द्या.'); return; }
  }
  loadRooms();
});
$('favBtn').addEventListener('click', () => {
  S.favOnly = !S.favOnly;
  $('favBtn').textContent = S.favOnly ? 'Saved (चालू)' : 'Saved';
  loadRooms();
});
['all', 'mine'].forEach(v => $('v_' + v).addEventListener('click', () => { S.view = v; loadRooms(); }));
$('addBtn').addEventListener('click', () => {
  if (!S.user) { $('authBtn').click(); return; }
  $('form').classList.toggle('hide');
});
$('locBtn').addEventListener('click', async () => {
  $('locMsg').textContent = 'लोकेशन घेत आहे…';
  try {
    S.loc = await getLoc();
    $('locMsg').textContent = 'लोकेशन मिळाली';
  } catch (e) {
    S.loc = null;
    $('locMsg').textContent = 'लोकेशन मिळाली नाही – फोनची location चालू करा / परवानगी द्या.';
  }
});
$('save').addEventListener('click', post);
mkAm('f_am');
mkAm('s_am', reloadSoon);
document.querySelectorAll('[data-brand]').forEach(e => { e.textContent = CONFIG.BRAND || e.textContent; });

/* ---------- Razorpay Payment ---------- */
function loadRzp() {
  return new Promise((ok, bad) => {
    if (window.Razorpay) return ok();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = ok;
    s.onerror = () => bad(new Error('पेमेंट विंडो लोड झाली नाही'));
    document.head.append(s);
  });
}

async function pay(r, btn) {
  btn.disabled = true;
  btn.classList.add('busy');
  try {
    await loadRzp();
    const { data, error } = await sb.functions.invoke('create-order', { body: { room_id: r.id } });
    if (error || !data || data.error) throw new Error((data && data.error) || 'पेमेंट सुरू करता आले नाही');
    await new Promise((ok, bad) => {
      const rz = new Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount,
        currency: 'INR',
        name: CONFIG.BRAND || 'Room Finder',
        description: 'घरमालकाचा संपर्क आणि पत्ता (' + S.settings.unlock_minutes + ' मिनिटे)',
        prefill: { email: S.user.email },
        theme: { color: '#0e5a8a' },
        handler: ok,
        modal: { ondismiss: () => bad(new Error('पेमेंट रद्द झाले')) }
      });
      rz.on('payment.failed', () => bad(new Error('पेमेंट अयशस्वी झाले')));
      rz.open();
    });
    setStatus('पेमेंट मिळाले, माहिती उघडत आहे…');
    for (let i = 0; i < 20; i++) {
      await new Promise(t => setTimeout(t, 1500));
      if (!S.user) throw new Error('Login session संपली आहे. पुन्हा login करा.');
      await refreshUserData();
      if (S.unlocks[r.id]) {
        await loadContactsFor(S.rooms);
        render();
        setStatus('संपर्क माहिती उघडली आहे.');
        return;
      }
    }
    setStatus('पेमेंट झाले आहे, पण माहिती उघडायला उशीर होत आहे. पान refresh करा.');
  } catch (e) {
    setStatus(e.message || 'पेमेंट झाले नाही');
  } finally {
    btn.disabled = false;
    btn.classList.remove('busy');
  }
}

/* ---------- Unlock Countdown ---------- */
setInterval(() => {
  let expired = false;
  document.querySelectorAll('[data-exp]').forEach(t => {
    const s = Math.floor((new Date(t.dataset.exp) - Date.now()) / 1000);
    if (s <= 0) { expired = true; return; }
    t.textContent = 'बाकी वेळ ' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') + ' – नंतर ही माहिती लपेल';
  });
  if (expired && Date.now() - (S.last || 0) > 5000) {
    S.last = Date.now();
    load(true);
  }
}, 1000);

/* ---------- स्केलेटन लोडिंग आणि फोटो लाइटबॉक्स ---------- */
function showSkeleton(n = 3) {
  const l = $('list');
  l.textContent = '';
  $('moreBtn').classList.add('hide');
  setStatus('रूम शोधत आहे…');
  for (let k = 0; k < n; k++) {
    const c = el('div', 'card skel');
    c.setAttribute('aria-hidden', 'true');
    [['100%', 160], ['55%', 18], ['35%', 14], ['80%', 14]].forEach(([w, h]) => {
      const i = el('i');
      i.style.width = w;
      i.style.height = h + 'px';
      c.append(i);
    });
    l.append(c);
  }
}

function openLightbox(urls, start) {
  let i = start, zoom = false, sx = 0;
  const ov = el('div', 'lb'), stage = el('div', 'lb-stage'), img = el('img'), cap = el('div', 'lb-cap');
  const x = el('button', 'lb-x', '✕'), prev = el('button', 'lb-nav lb-p', '‹'), next = el('button', 'lb-nav lb-n', '›');
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-label', 'फोटो पहा');
  x.setAttribute('aria-label', 'बंद करा');
  prev.setAttribute('aria-label', 'मागील फोटो');
  next.setAttribute('aria-label', 'पुढील फोटो');
  const show = n => {
    i = (n + urls.length) % urls.length;
    img.src = urls[i];
    zoom = false;
    stage.classList.remove('zoom');
    cap.textContent = (i + 1) + ' / ' + urls.length + ' • मोठं करायला फोटोवर दाबा';
  };
  const key = e => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(i - 1);
    else if (e.key === 'ArrowRight') show(i + 1);
  };
  const close = () => {
    document.removeEventListener('keydown', key);
    ov.remove();
    document.body.style.overflow = '';
  };
  img.addEventListener('click', () => { zoom = !zoom; stage.classList.toggle('zoom', zoom); });
  ov.addEventListener('click', e => { if (e.target === ov || e.target === stage) close(); });
  x.addEventListener('click', close);
  prev.addEventListener('click', () => show(i - 1));
  next.addEventListener('click', () => show(i + 1));
  stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    const d = e.changedTouches[0].clientX - sx;
    if (!zoom && Math.abs(d) > 60 && urls.length > 1) show(i + (d < 0 ? 1 : -1));
  });
  if (urls.length < 2) { prev.hidden = true; next.hidden = true; }
  stage.append(img);
  ov.append(stage, x, prev, next, cap);
  document.body.append(ov);
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', key);
  show(start);
  x.focus();
}
const ct = S.contacts[r.id];
const exp = S.unlocks[r.id];
const l2 = locOf(r);
const paymentOff = isPaymentOff();

if (status === 'rented') {
  c.append(el('span', 'tag feat', 'भाड्याने गेली आहे'));
} else if (status === 'inactive') {
  c.append(el('span', 'mut', 'ही रूम सध्या जाहिरातीत दाखवली जात नाही.'));
} else if (S.user && ct && (paymentOff || exp)) {
  const box = el('div', 'unlock');
  box.append(
    el('strong', '', ct.owner_name + ' • ' + ct.phone),
    el('div', '', ct.address)
  );

  if (!paymentOff && exp) {
    const t = el('div', 'mut');
    t.dataset.exp = exp;
    box.append(t);
  }

  c.append(box);

  link('WhatsApp', 'btn',
    'https://wa.me/' + ct.phone + '?text=' +
    encodeURIComponent('नमस्कार, Room Finder वरील तुमची रूम पाहिली. अजून उपलब्ध आहे का?'));

  link('Call', 'btn ghost', 'tel:+' + ct.phone);

  if (r.featured && l2) {
    link('Maps वर पहा', 'btn ghost',
      'https://www.google.com/maps?q=' + l2.lat + ',' + l2.lng);
  }
} else {
  if (!paymentOff) {
    acts.append(el('span', 'mut', 'पैसे भरल्यावर वापराच्या अटी लागू होतात.'));
  }

  const pb = add(
    S.user
      ? 'संपर्क आणि पत्ता पहा – ₹' + (S.settings.view_fee_paise / 100) +
        ' (' + S.settings.unlock_minutes + ' मिनिटे)'
      : 'संपर्क आणि पत्ता पाहण्यासाठी login करा',
    '',
    () => {
      if (S.user) pay(r, pb);
      else $('authBtn').click();
    }
  );
}
