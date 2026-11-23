/* Room Finder Maharashtra - clean app.js
   Uses the existing index.html element IDs and Supabase tables.
   Keep Supabase secrets in config.js / Edge Functions, never in this file.
*/
'use strict';

const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const el = (tag, cls = '', text = '') => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== null && text !== undefined) node.textContent = String(text);
  return node;
};

const AM = ['Wi-Fi', 'जेवण', 'AC', 'वॉशिंग मशीन', 'पार्किंग', 'वीज बिल समाविष्ट'];
const PAGE_SIZE = 24;

const S = {
  req: 0,
  page: 0,
  more: false,
  counts: { total: 0, rented: 0 },
  settings: { view_fee_paise: 4900, unlock_minutes: 30, payment_enabled: true },
  user: null,
  admin: false,
  rooms: [],
  contacts: {},
  unlocks: {},
  favorites: new Set(),
  favOnly: false,
  view: 'all',
  me: null,
  loc: null,
  last: 0
};

const setStatus = message => { if ($('status')) $('status').textContent = message; };
const normPhone = value => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 10 ? '91' + digits : digits;
};
const clean = value => String(value || '').replace(/[,()%*\\]/g, ' ').trim();
const photoUrl = path => sb.storage.from('room-photos').getPublicUrl(path).data.publicUrl;

function isPaymentOff() {
  const settings = S.settings || {};
  return settings.payment_enabled === false ||
    settings.payment_off === true ||
    Number(settings.view_fee_paise) <= 0;
}

function roomStatus(room) {
  if (!room) return 'available';
  if (room.hidden || room.status === 'inactive') return 'inactive';
  if (room.status === 'rented' || room.rented === true) return 'rented';
  return 'available';
}

function locOf(room) {
  const row = Array.isArray(room.room_locations)
    ? room.room_locations[0]
    : room.room_locations;
  if (row && row.lat != null && row.lng != null) {
    return { lat: Number(row.lat), lng: Number(row.lng) };
  }
  if (room.lat != null && room.lng != null) {
    return { lat: Number(room.lat), lng: Number(room.lng) };
  }
  if (room.location && room.location.coordinates) {
    return {
      lat: Number(room.location.coordinates[1]),
      lng: Number(room.location.coordinates[0])
    };
  }
  return null;
}

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function loadFavs() {
  try {
    const values = JSON.parse(localStorage.getItem('room_favs') || '[]');
    S.favorites = new Set(Array.isArray(values) ? values : []);
  } catch (_) {
    S.favorites = new Set();
  }
}

function saveFavs() {
  try { localStorage.setItem('room_favs', JSON.stringify([...S.favorites])); }
  catch (_) {}
}

function showCounts() {
  const container = $('counts');
  if (!container) return;
  container.textContent = '';
  const total = Number(S.counts.total) || 0;
  const rented = Number(S.counts.rented) || 0;
  [
    ['एकूण रूम', total],
    ['भाड्याने गेलेल्या', rented],
    ['रिकाम्या रूम', Math.max(0, total - rented)]
  ].forEach(([label, value]) => {
    const item = el('div');
    item.append(el('b', '', value), el('span', '', label));
    container.append(item);
  });
}

async function loadMeta() {
  const baseCount = () => sb.from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('hidden', false)
    .or('status.is.null,status.neq.inactive');

  const [totalResult, rentedResult, settingsResult] = await Promise.all([
    baseCount(),
    baseCount().or('status.eq.rented,and(status.is.null,rented.eq.true)'),
    sb.from('settings').select('*').maybeSingle()
  ]);

  if (totalResult.error) console.error('Room count error:', totalResult.error);
  if (rentedResult.error) console.error('Rented count error:', rentedResult.error);
  if (settingsResult.error) console.error('Settings error:', settingsResult.error);

  S.counts = {
    total: totalResult.count || 0,
    rented: rentedResult.count || 0
  };
  if (settingsResult.data) S.settings = { ...S.settings, ...settingsResult.data };
  showCounts();
}

async function refreshUserData() {
  S.unlocks = {};
  if (!S.user) {
    S.favorites = new Set();
    return;
  }

  const now = new Date().toISOString();
  const [favResult, unlockResult] = await Promise.all([
    sb.from('favorites').select('room_id').eq('user_id', S.user.id),
    sb.from('unlocks').select('room_id, expires_at')
      .eq('user_id', S.user.id)
      .gt('expires_at', now)
  ]);

  if (favResult.error) console.error('Favorites error:', favResult.error);
  if (unlockResult.error) console.error('Unlocks error:', unlockResult.error);

  S.favorites = new Set((favResult.data || []).map(row => row.room_id));
  S.unlocks = Object.fromEntries(
    (unlockResult.data || []).map(row => [row.room_id, row.expires_at])
  );
}

async function loadContactsFor(rooms) {
  if (!S.user || !rooms.length) return;

  // Fetch contact rows only for rooms the current user owns or has unlocked.
  const allowed = rooms.filter(room =>
    room.owner_id === S.user.id ||
    isPaymentOff() ||
    Boolean(S.unlocks[room.id])
  );
  if (!allowed.length) return;

  const { data, error } = await sb.from('room_contacts')
    .select('room_id, owner_name, phone, address')
    .in('room_id', allowed.map(room => room.id));

  if (error) {
    console.error('Contacts load error:', error);
    return;
  }
  (data || []).forEach(contact => { S.contacts[contact.room_id] = contact; });
}

function updateUserName() {
  let nameNode = $('userName');
  if (!nameNode && $('authBtn')) {
    nameNode = el('span');
    nameNode.id = 'userName';
    nameNode.style.cssText =
      'display:inline-block;margin-right:10px;font-weight:600;color:#0e5a8a;font-size:14px;';
    $('authBtn').insertAdjacentElement('beforebegin', nameNode);
  }
  if (!nameNode) return;

  if (S.user) {
    const name = S.user.user_metadata?.full_name ||
      S.user.user_metadata?.name ||
      S.user.email?.split('@')[0] || 'User';
    nameNode.textContent = 'नमस्कार, ' + name;
    nameNode.style.display = 'inline-block';
  } else {
    nameNode.textContent = '';
    nameNode.style.display = 'none';
  }
}

async function updateAuthUI() {
  const authButton = $('authBtn');
  if (authButton) authButton.textContent = S.user ? 'Logout' : 'Google ने login';
  updateUserName();

  $('v_mine')?.classList.toggle('hide', !S.user);
  $('favBtn')?.classList.toggle('hide', !S.user);
  $('adminLink')?.classList.toggle('hide', !S.admin);

  if (!S.user) {
    S.admin = false;
    S.view = 'all';
    S.favOnly = false;
    S.contacts = {};
  }
}

async function afterAuth() {
  S.admin = false;
  if (S.user) {
    // Admin visibility is a UI convenience only; protect admin.html with database/RLS checks too.
    const { data, error } = await sb.from('admins')
      .select('user_id')
      .eq('user_id', S.user.id)
      .maybeSingle();
    if (error) console.warn('Admin check:', error.message);
    S.admin = Boolean(data);
  }
  await updateAuthUI();
  await load();
}

function showSkeleton(count = 3) {
  const list = $('list');
  if (!list) return;
  list.textContent = '';
  $('moreBtn')?.classList.add('hide');
  setStatus('रूम शोधत आहे…');

  for (let index = 0; index < count; index++) {
    const card = el('div', 'card skel');
    card.setAttribute('aria-hidden', 'true');
    [['100%', 160], ['55%', 18], ['35%', 14], ['80%', 14]].forEach(([width, height]) => {
      const line = el('i');
      line.style.width = width;
      line.style.height = height + 'px';
      card.append(line);
    });
    list.append(card);
  }
}

function getAmenityValues(id) {
  return [...($(id)?.querySelectorAll('input:checked') || [])].map(input => input.value);
}

function buildAmenityChecks(id, onChange) {
  const host = $(id);
  if (!host) return;
  host.textContent = '';
  AM.forEach(value => {
    const label = el('label');
    const input = el('input');
    input.type = 'checkbox';
    input.value = value;
    if (onChange) input.addEventListener('change', onChange);
    label.append(input, document.createTextNode(value));
    host.append(label);
  });
}

let reloadTimer;
function reloadSoon() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => loadRooms(true), 350);
}

async function loadRooms(reset = true, quiet = false) {
  const requestId = ++S.req;
  if (reset) {
    S.page = 0;
    if (!quiet) showSkeleton();
  }

  const cityArea = clean($('q')?.value);
  const college = clean($('college')?.value);
  const type = $('type')?.value || '';
  const gender = $('gender')?.value || '';
  const maxRent = Number($('max')?.value) || 0;
    const amenities = getAmenityValues('s_am');
  const sort = $('sort')?.value || 'new';
  const near = sort === 'near' && Boolean(S.me);

  let query = sb.from('rooms').select('*, room_locations(lat,lng)');

  if (S.view === 'mine' && S.user) {
    query = query.eq('owner_id', S.user.id);
  } else {
    query = query.eq('hidden', false)
      .eq('rented', false)
      .or('status.is.null,and(status.neq.inactive,status.neq.rented)');
  }

  if (cityArea) {
    query = query.or('city.ilike.*' + cityArea + '*,area.ilike.*' + cityArea + '*');
  }
  if (college) query = query.ilike('college', '*' + college + '*');
  if (type) query = query.eq('room_type', type);
  if (gender) query = query.eq('gender', gender);
  if (maxRent > 0) query = query.lte('rent', maxRent);
  if (amenities.length) query = query.contains('amenities', amenities);

  if (S.favOnly) {
    query = query.in('id', S.favorites.size
      ? [...S.favorites]
      : ['00000000-0000-0000-0000-000000000000']);
  }

  query = query.order('featured', { ascending: false });
  if (sort === 'low') query = query.order('rent', { ascending: true });
  else if (sort === 'high') query = query.order('rent', { ascending: false });
  else query = query.order('created_at', { ascending: false });
  query = query.order('id');

  const pageSize = near ? 200 : PAGE_SIZE;
  const start = near ? 0 : S.page * PAGE_SIZE;
  const { data, error } = await query.range(start, start + pageSize - 1);

  if (requestId !== S.req) return;
  if (error) {
    console.error('Rooms load error:', error);
    setStatus('डेटा लोड होत नाही: ' + error.message);
    return;
  }

  const rows = (data || []).map(room => ({
    ...room,
    rent: Number(room.rent) || 0,
    deposit: Number(room.deposit) || 0,
    amenities: Array.isArray(room.amenities) ? room.amenities : [],
    photos: Array.isArray(room.photos) ? room.photos : []
  }));

  if (reset) S.contacts = {};
  S.rooms = reset ? rows : S.rooms.concat(rows);
  S.more = !near && rows.length === PAGE_SIZE;

  await loadContactsFor(rows);
  if (requestId !== S.req) return;
  render();
}

async function load(quiet = false) {
  if (!quiet) showSkeleton();
  await loadMeta();
  await refreshUserData();
  await loadRooms(true, true);
}

function makeLink(label, className, href) {
  const anchor = el('a', className, label);
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  return anchor;
}

function render() {
  const list = $('list');
  if (!list) return;

  ['all', 'mine'].forEach(view => {
    const button = $('v_' + view);
    if (!button) return;
    button.classList.toggle('on', S.view === view);
    button.classList.toggle('ghost', S.view !== view);
  });

  let rooms = S.rooms.slice();
  if (S.view === 'mine') {
    rooms = rooms.filter(room => S.user && room.owner_id === S.user.id);
  } else {
    rooms = rooms.filter(room => roomStatus(room) === 'available' && !room.hidden);
  }
  if (S.favOnly) rooms = rooms.filter(room => S.favorites.has(room.id));

  const distance = room => {
    const location = locOf(room);
    return room.featured && location && S.me
      ? distanceKm(S.me, location)
      : Number.POSITIVE_INFINITY;
  };
  if ($('sort')?.value === 'near' && S.me) {
    rooms.sort((a, b) => distance(a) - distance(b));
  }

  list.textContent = '';
  rooms.forEach(room => list.append(card(room, distance(room))));
  $('moreBtn')?.classList.toggle('hide', !S.more);

  setStatus(
    rooms.length
      ? rooms.length + ' रूम दाखवल्या' + (S.more ? ' – आणखी आहेत' : '')
      : S.view === 'mine'
        ? 'तुम्ही अजून रूम टाकलेली नाही.'
        : S.favOnly
          ? 'कोणतीही आवडती उपलब्ध रूम नाही.'
          : S.counts.total === 0
            ? 'अजून एकही रूम नाही – पहिली रूम तुम्ही add करा!'
            : 'या शोधासाठी रिकाम्या रूम नाहीत.'
  );
}

function card(room, distance) {
  const container = el('div', 'card listing');
  const status = roomStatus(room);
  const top = el('div', 'top');
  const details = el('div');

  details.append(el('strong', '', [room.area, room.city].filter(Boolean).join(', ') || 'रूम'));
  const tags = el('div');
  [room.room_type, room.gender].filter(Boolean)
    .forEach(value => tags.append(el('span', 'tag', value)));
  if (room.featured) tags.append(el('span', 'tag feat', 'Featured'));
  if (room.hidden) tags.append(el('span', 'tag feat', 'लपवलेली'));
  if (room.featured_requested && !room.featured) {
    tags.append(el('span', 'tag', 'Featured विनंती'));
  }
  details.append(tags);
  top.append(details, el('div', 'price', '₹' + room.rent.toLocaleString('en-IN') + '/महिना'));
  container.append(top);

  const statusLabels = {
    available: 'उपलब्ध (रिकामी)',
    rented: 'भाड्याने गेलेली',
    inactive: 'निष्क्रिय'
  };
  container.append(el('span', 'room-status-badge room-status-' + status, statusLabels[status]));

  if (room.deposit) {
    container.append(el('div', 'mut', 'डिपॉझिट: ₹' + room.deposit.toLocaleString('en-IN')));
  }
  if (room.college) container.append(el('div', 'mut', room.college + ' जवळ'));
  if (room.featured && Number.isFinite(distance)) {
    container.append(el('div', 'mut', 'तुमच्यापासून सुमारे ' + distance.toFixed(1) + ' किमी'));
  }

  if (room.amenities.length) {
    const amenityRow = el('div');
    room.amenities.forEach(value => amenityRow.append(el('span', 'tag', value)));
    container.append(amenityRow);
  }

  if (room.photos.length) {
    const urls = room.photos.map(photoUrl);
    const gallery = el('div', 'gal');
    urls.forEach((url, index) => {
      const image = el('img');
      image.src = url;
      image.loading = 'lazy';
      image.alt = 'रूमचा फोटो ' + (index + 1) + ' (मोठा करायला दाबा)';
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      image.addEventListener('click', () => openLightbox(urls, index));
      image.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLightbox(urls, index);
        }
      });
      gallery.append(image);
    });
    container.append(gallery);
  }

  if (room.description) container.append(el('p', '', room.description));

  const actions = el('div', 'row acts');
  const addButton = (label, className, handler) => {
    const button = el('button', className, label);
    button.type = 'button';
    button.addEventListener('click', handler);
    actions.append(button);
    return button;
  };
  const addLink = (label, className, href) => {
    const link = makeLink(label, className, href);
    actions.append(link);
    return link;
  };

  const contact = S.contacts[room.id];
  const expiresAt = S.unlocks[room.id];
  const location = locOf(room);
  const paymentOff = isPaymentOff();
  const isOwner = Boolean(S.user && room.owner_id === S.user.id);
  const canSeeContact = Boolean(contact && (isOwner || (S.user && (paymentOff || expiresAt))));

  if (status === 'rented') {
    container.append(el('span', 'tag feat', 'भाड्याने गेली आहे'));
  } else if (status === 'inactive') {
    container.append(el('span', 'mut', 'ही रूम सध्या जाहिरातीत दाखवली जात नाही.'));
  } else if (canSeeContact) {
    const revealButton = addButton(
      'संपर्क आणि पत्ता पहा',
      'btn',
      () => {
        revealButton.remove();

        const box = el('div', 'unlock');
        box.append(
          el('strong', '', (contact.owner_name || 'रूम मालक') + (contact.phone ? ' • ' + contact.phone : '')),
          el('div', '', contact.address || 'पत्ता उपलब्ध नाही')
        );

        if (!paymentOff && expiresAt && !isOwner) {
          const countdown = el('div', 'mut');
          countdown.dataset.exp = expiresAt;
          box.append(countdown);
        }

        container.insertBefore(box, actions);

        if (contact.phone) {
          const phoneDigits = String(contact.phone).replace(/\D/g, '');

          addLink(
            'WhatsApp',
            'btn',
            'https://wa.me/' + phoneDigits + '?text=' +
            encodeURIComponent('नमस्कार, Room Finder वरील तुमची रूम पाहिली. अजून उपलब्ध आहे का?')
          );

          addLink('Call', 'btn ghost', 'tel:+' + phoneDigits);
        }

        if (room.featured && location) {
          addLink(
            'Maps वर पहा',
            'btn ghost',
            'https://www.google.com/maps?q=' + location.lat + ',' + location.lng
          );
        }
      }
    );
  } else if (!isOwner) {
    if (!paymentOff) {
      actions.append(el('span', 'mut', 'पैसे भरल्यावर वापराच्या अटी लागू होतात.'));
    }

    const fee = (Number(S.settings.view_fee_paise) || 0) / 100;
    const minutes = Number(S.settings.unlock_minutes) || 30;

    const paymentButton = addButton(
      S.user
        ? (paymentOff ? 'संपर्क आणि पत्ता पहा' : 'संपर्क आणि पत्ता पहा – ₹' + fee + ' (' + minutes + ' मिनिटे)')
        : 'संपर्क आणि पत्ता पाहण्यासाठी login करा',
      'btn',
      () => {
        if (!S.user) {
          $('authBtn')?.click();
        } else if (!paymentOff) {
          pay(room, paymentButton);
        } else {
          setStatus('संपर्क माहिती लोड होत आहे...');
          loadContactsFor([room]).then(render);
        }
      }
    );
  }

  if (S.user) {
    addButton(S.favorites.has(room.id) ? 'Saved' : 'Save', 'ghost', async () => {
      if (S.favorites.has(room.id)) {
        const { error } = await sb.from('favorites').delete()
          .eq('room_id', room.id).eq('user_id', S.user.id);
        if (error) return alert('Saved काढता आले नाही: ' + error.message);
        S.favorites.delete(room.id);
      } else {
        const { error } = await sb.from('favorites').insert({
          room_id: room.id,
          user_id: S.user.id
        });
        if (error) return alert('Save करता आले नाही: ' + error.message);
        S.favorites.add(room.id);
      }
      if (S.favOnly) await loadRooms(true);
      else render();
    });
        if (!isOwner) {
      addButton('तक्रार करा', 'ghost', async () => {
        const reason = prompt('काय चुकीचं आहे? (थोडक्यात लिहा)');
        if (!reason || reason.trim().length < 3) return;
        const { error } = await sb.from('reports').insert({
          room_id: room.id,
          reason: reason.trim().slice(0, 300),
          user_id: S.user.id
        });
        alert(error ? 'तक्रार पाठवता आली नाही: ' + error.message : 'तक्रार नोंदवली, धन्यवाद');
      });
    }
  }

  if (isOwner) {
    const rented = status === 'rented';
    addButton(rented ? 'पुन्हा उपलब्ध' : 'भाड्याने गेली', 'ghost', async () => {
      const { error } = await sb.from('rooms')
        .update({ rented: !rented, status: rented ? 'available' : 'rented' })
        .eq('id', room.id).eq('owner_id', S.user.id);
      if (error) alert('स्टेटस बदलता आला नाही: ' + error.message);
      else await load();
    });

    if (!room.featured && !room.featured_requested) {
      addButton('Featured साठी विनंती', 'ghost', async () => {
        const { error } = await sb.from('rooms')
          .update({ featured_requested: true })
          .eq('id', room.id).eq('owner_id', S.user.id);
        if (error) alert('विनंती पाठवता आली नाही: ' + error.message);
        else await load();
      });
    }

    let deleteConfirm = false;
    addButton('Delete', 'ghost', async event => {
      // Two-step confirmation avoids accidental deletion.
      if (!deleteConfirm) {
        deleteConfirm = true;
        event.currentTarget.textContent = 'खात्री? पुन्हा दाबा';
        return;
      }
      if (!confirm('ही रूम कायमची delete करायची आहे का?')) return;
      if (room.photos.length) {
        const storageResult = await sb.storage.from('room-photos').remove(room.photos);
        if (storageResult.error) console.warn('Photo cleanup:', storageResult.error);
      }
      const { error } = await sb.from('rooms').delete()
        .eq('id', room.id).eq('owner_id', S.user.id);
      if (error) alert('रूम delete झाली नाही: ' + error.message);
      else await load();
    });
  }

  container.append(actions);
  return container;
}

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('लोकेशन उपलब्ध नाही'));
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }),
      reject,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        return reject(new Error('फोटो प्रक्रिया करता आली नाही'));
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(blob => blob
        ? resolve(blob)
        : reject(new Error('फोटो प्रक्रिया अयशस्वी')), 'image/jpeg', 0.8);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('हा फोटो वाचता आला नाही'));
    };
    image.src = objectUrl;
  });
}

async function postRoom() {
  if (!S.user) {
    $('msg').textContent = 'आधी Google ने login करा.';
    return;
  }

  const value = id => $(id)?.value?.trim() || '';
  const phone = normPhone(value('f_phone'));
  const rent = Number(value('f_rent')) || 0;

  if (value('f_city').length < 2 || value('f_area').length < 2 ||
      rent <= 0 || value('f_name').length < 2 || value('f_address').length < 5) {
    $('msg').textContent = 'शहर, एरिया, भाडे, नाव आणि पूर्ण पत्ता आवश्यक आहे.';
    return;
  }
  if (!$('f_terms').checked) {
    $('msg').textContent = 'अटी मान्य करण्यासाठी बॉक्स टिक करा.';
    return;
  }
  if (!/^91[6-9]\d{9}$/.test(phone)) {
    $('msg').textContent = 'योग्य 10 अंकी मोबाईल नंबर टाका.';
    return;
  }

  const button = $('save');
  button.disabled = true;
  button.classList.add('busy');
  $('msg').textContent = 'रूम प्रसिद्ध होत आहे…';
  const uploaded = [];

  try {
    const files = [...($('f_photos').files || [])].slice(0, 3);
    for (const file of files) {
      if (!file.type.startsWith('image/')) throw new Error('फक्त image फोटो निवडा.');
      const path = S.user.id + '/' + crypto.randomUUID() + '.jpg';
      const { error } = await sb.storage.from('room-photos')
        .upload(path, await shrinkImage(file), { contentType: 'image/jpeg' });
      if (error) throw error;
      uploaded.push(path);
    }

    const { data: room, error: roomError } = await sb.from('rooms').insert({
      city: value('f_city'),
      area: value('f_area'),
      college: value('f_college') || null,
      rent,
      deposit: Number(value('f_dep')) || null,
      room_type: value('f_type'),
      gender: value('f_gender'),
      amenities: getAmenityValues('f_am'),
      description: value('f_desc') || null,
      photos: uploaded,
      rented: false,
      hidden: false,
      status: 'available',
      owner_id: S.user.id
    }).select().single();
    if (roomError) throw roomError;

    const { error: contactError } = await sb.from('room_contacts').insert({
      room_id: room.id,
      owner_name: value('f_name'),
      phone,
      address: value('f_address')
    });
    if (contactError) {
      await sb.from('rooms').delete().eq('id', room.id);
      throw contactError;
    }

    if (S.loc) {
      const { error: locationError } = await sb.from('room_locations').insert({
        room_id: room.id,
        lat: S.loc.lat,
        lng: S.loc.lng
      });
      if (locationError) console.warn('Location save failed:', locationError);
    }

    $('msg').textContent = 'रूम प्रसिद्ध झाली.';
    ['f_city', 'f_area', 'f_college', 'f_rent', 'f_dep', 'f_desc',
      'f_name', 'f_phone', 'f_address', 'f_photos'].forEach(id => {
      if ($(id)) $(id).value = '';
    });
    $('f_terms').checked = false;
    $('f_am').querySelectorAll('input').forEach(input => { input.checked = false; });
    S.loc = null;
    $('locMsg').textContent = '';
    await load();
  } catch (error) {
    if (uploaded.length) {
      await sb.storage.from('room-photos').remove(uploaded);
    }
    $('msg').textContent = 'Post करता आली नाही: ' + (error.message || error);
  } finally {
    button.disabled = false;
    button.classList.remove('busy');
  }
}

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('पेमेंट विंडो लोड झाली नाही'));
    document.head.append(script);
  });
}

async function pay(room, button) {
  button.disabled = true;
  button.classList.add('busy');

  try {
    // Always read the current Supabase session immediately before creating an order.
    // S.user can be stale after a tab has been idle or an auth refresh has failed.
    let sessionResult = await sb.auth.getSession();
    let session = sessionResult.data?.session || null;

    if (sessionResult.error) {
      console.warn('Get session before payment:', sessionResult.error);
    }

    // Try refreshing once when the browser no longer has a usable access token.
    if (!session?.access_token) {
      const refreshed = await sb.auth.refreshSession();
      if (refreshed.error) throw new Error('Login session संपली आहे. पुन्हा Google ने login करा.');
      session = refreshed.data?.session || null;
    }

    if (!session?.access_token || !session.user?.id) {
      S.user = null;
      await updateAuthUI();
      throw new Error('पेमेंट करण्यापूर्वी Google ने पुन्हा login करा.');
    }

    // Keep the in-memory user synchronized with the actual persisted session.
    S.user = session.user;
    await updateAuthUI();

    await loadRazorpay();

    // Explicitly pass the current access token. This prevents create-order
    // from receiving a request without the user's Authorization bearer token.
    const { data, error } = await sb.functions.invoke('create-order', {
      body: { room_id: room.id },
      headers: {
        Authorization: 'Bearer ' + session.access_token
      }
    });

    if (error || !data || data.error) {
      console.error('create-order error:', error || data);
      throw new Error(
        data?.error ||
        error?.message ||
        'पेमेंट सुरू करता आले नाही. Login session तपासा.'
      );
    }

    if (!data.key_id || !data.order_id || !data.amount) {
      throw new Error('पेमेंट ऑर्डरची माहिती अपूर्ण आहे. कृपया Admin शी संपर्क करा.');
    }

    await new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: CONFIG.BRAND || 'Room Finder',
        description: 'घरमालकाचा संपर्क आणि पत्ता (' +
          (Number(S.settings.unlock_minutes) || 30) + ' मिनिटे)',
        prefill: { email: session.user.email || '' },
        theme: { color: '#0e5a8a' },
        handler: resolve,
        modal: { ondismiss: () => reject(new Error('पेमेंट रद्द झाले')) }
      });

      checkout.on('payment.failed', response => {
        console.error('Razorpay payment failed:', response?.error);
        reject(new Error('पेमेंट अयशस्वी झाले. पुन्हा प्रयत्न करा.'));
      });
      checkout.open();
    });

    setStatus('पेमेंट मिळाले, माहिती उघडत आहे…');

    // Webhook verifies the payment and creates the unlock record.
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const current = await sb.auth.getSession();
      session = current.data?.session || null;
      if (!session?.access_token) {
        throw new Error('Login session संपली आहे. पुन्हा login करा.');
      }
            S.user = session.user;
      await refreshUserData();

      if (S.unlocks[room.id]) {
        await loadContactsFor([room]);
        render();
        setStatus('संपर्क माहिती उघडली आहे.');
        return;
      }
    }

    setStatus('पेमेंट झाले आहे, पण माहिती उघडायला उशीर होत आहे. थोड्या वेळाने refresh करा.');
  } catch (error) {
    console.error('Payment flow error:', error);
    setStatus(error.message || 'पेमेंट करताना त्रुटी आली');
  } finally {
    button.disabled = false;
    button.classList.remove('busy');
  }
}

function openLightbox(urls, startIndex) {
  if (!urls.length) return;
  let index = startIndex;
  let zoomed = false;
  let touchStartX = 0;

  const overlay = el('div', 'lb');
  const stage = el('div', 'lb-stage');
  const image = el('img');
  const caption = el('div', 'lb-cap');
  const closeButton = el('button', 'lb-x', '✕');
  const previousButton = el('button', 'lb-nav lb-p', '‹');
  const nextButton = el('button', 'lb-nav lb-n', '›');

  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'फोटो पहा');
  closeButton.setAttribute('aria-label', 'बंद करा');
  previousButton.setAttribute('aria-label', 'मागील फोटो');
  nextButton.setAttribute('aria-label', 'पुढील फोटो');

  const show = nextIndex => {
    index = (nextIndex + urls.length) % urls.length;
    image.src = urls[index];
    zoomed = false;
    stage.classList.remove('zoom');
    caption.textContent = (index + 1) + ' / ' + urls.length +
      ' • मोठं करायला फोटोवर दाबा';
  };
  const close = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    document.body.style.overflow = '';
  };
  const onKey = event => {
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowLeft') show(index - 1);
    else if (event.key === 'ArrowRight') show(index + 1);
  };

  image.addEventListener('click', () => {
    zoomed = !zoomed;
    stage.classList.toggle('zoom', zoomed);
  });
  overlay.addEventListener('click', event => {
    if (event.target === overlay || event.target === stage) close();
  });
  closeButton.addEventListener('click', close);
  previousButton.addEventListener('click', () => show(index - 1));
  nextButton.addEventListener('click', () => show(index + 1));
  stage.addEventListener('touchstart', event => {
    touchStartX = event.touches[0].clientX;
  }, { passive: true });
  stage.addEventListener('touchend', event => {
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (!zoomed && Math.abs(delta) > 60 && urls.length > 1) {
      show(index + (delta < 0 ? 1 : -1));
    }
  });
  if (urls.length < 2) {
    previousButton.hidden = true;
    nextButton.hidden = true;
  }

  stage.append(image);
  overlay.append(stage, closeButton, previousButton, nextButton, caption);
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
  show(startIndex);
  closeButton.focus();
}

function startCountdown() {
  setInterval(() => {
    let hasExpired = false;
    document.querySelectorAll('[data-exp]').forEach(node => {
      const seconds = Math.floor((new Date(node.dataset.exp).getTime() - Date.now()) / 1000);
      if (seconds <= 0) {
        hasExpired = true;
        return;
      }
      node.textContent = 'बाकी वेळ ' +
        String(Math.floor(seconds / 60)).padStart(2, '0') + ':' +
        String(seconds % 60).padStart(2, '0') +
        ' – नंतर ही माहिती लपेल';
    });
    if (hasExpired && Date.now() - S.last > 5000) {
      S.last = Date.now();
      load(true);
    }
  }, 1000);
}

function bindEvents() {
  ['q', 'college', 'type', 'gender', 'max'].forEach(id => {
    $(id)?.addEventListener('input', reloadSoon);
    $(id)?.addEventListener('change', reloadSoon);
  });

  $('sort')?.addEventListener('change', async () => {
    if ($('sort').value === 'near' && !S.me) {
      try {
        S.me = await getLocation();
      } catch (_) {
        setStatus('लोकेशन मिळाली नाही – फोनची location चालू करा / परवानगी द्या.');
        return;
      }
    }
    await loadRooms(true);
  });

  $('moreBtn')?.addEventListener('click', () => {
    if (!S.more) return;
    S.page += 1;
    loadRooms(false);
  });

  $('v_all')?.addEventListener('click', () => {
    S.view = 'all';
    S.favOnly = false;
    loadRooms(true);
  });
  $('v_mine')?.addEventListener('click', () => {
    if (!S.user) return;
    S.view = 'mine';
    S.favOnly = false;
    loadRooms(true);
  });

  $('favBtn')?.addEventListener('click', () => {
    S.favOnly = !S.favOnly;
    $('favBtn').textContent = S.favOnly ? 'Saved (चालू)' : 'Saved';
    loadRooms(true);
  });

  const openForm = () => {
    if (!S.user) {
      $('authBtn')?.click();
      return;
    }
    $('form')?.classList.toggle('hide');
    if (!$('form')?.classList.contains('hide')) {
      $('form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  $('addBtn')?.addEventListener('click', openForm);
  $('addBtn2')?.addEventListener('click', openForm);

  $('locBtn')?.addEventListener('click', async () => {
    $('locMsg').textContent = 'लोकेशन घेत आहे…';

    try {
      S.loc = await getLocation();
      $('locMsg').textContent =
        'लोकेशन मिळाली: ' + S.loc.lat.toFixed(6) + ', ' + S.loc.lng.toFixed(6);
    } catch (error) {
      S.loc = null;
      $('locMsg').textContent = error.message ||
        'लोकेशन मिळाली नाही – फोनची location चालू करा / परवानगी द्या.';
    }
  });

  $('save')?.addEventListener('click', postRoom);

  $('authBtn')?.addEventListener('click', async () => {
    if (S.user) {
      const { error } = await sb.auth.signOut();
      if (error) alert('Logout करता आले नाही: ' + error.message);
      return;
    }
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname }
    });
    if (error) alert('Google login सुरू झाले नाही: ' + error.message);
  });
}

async function init() {
  loadFavs();
  buildAmenityChecks('f_am');
  buildAmenityChecks('s_am', reloadSoon);
  document.querySelectorAll('[data-brand]').forEach(node => {
    node.textContent = CONFIG.BRAND || node.textContent;
  });

  bindEvents();

  const { data, error } = await sb.auth.getSession();
  if (error) console.warn('Session error:', error);
  S.user = data?.session?.user || null;
  await afterAuth();

  sb.auth.onAuthStateChange((_event, session) => {
    S.user = session?.user || null;
    // Defer database work until Supabase finishes its auth event callback.
    setTimeout(() => afterAuth(), 0);
  });

  startCountdown();
}

document.addEventListener('DOMContentLoaded', init);
