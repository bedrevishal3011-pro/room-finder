const adminSb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const statusTab = document.getElementById('t_status');
const paymentTab = document.getElementById('t_payment');
const statusTools = document.getElementById('status-tools');

function statusLabel(status) {
  if (status === 'rented') return 'Rented';
  if (status === 'inactive') return 'Inactive';
  return 'Available';
}

function statusBadge(status) {
  const badge = document.createElement('span');
  badge.className = `room-status-badge room-status-${status || 'available'}`;
  badge.textContent = statusLabel(status);
  return badge;
}

async function renderStatusManagement() {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.id === 't_status'));
  document.getElementById('tools').classList.add('hide');
  statusTools.classList.remove('hide');

  const list = document.getElementById('list');
  list.textContent = '';
  const query = (document.getElementById('statusSearch').value || '').trim().toLower();
  const filter = document.getElementById('statusFilter').value;

  let request = adminSb.from('rooms').select('*').order('created_at', { ascending: false }).limit(1000);
  const { data, error } = await request;
  if (error) {
    list.textContent = 'रूम लोड करता आले नाहीत: ' + error.message;
    return;
  }

  const rooms = (data || []).filter(room => {
    const matchesSearch = !query || `${room.city} ${room.area}`.toLowerCase().includes(query);
    const status = room.status || (room.rented ? 'rented' : room.hidden ? 'inactive' : 'available');
    const matchesFilter = filter === 'all' || status === filter;
    return matchesSearch && matchesFilter;
  });

  if (!rooms.length) {
    const empty = document.createElement('p');
    empty.className = 'mut';
    empty.textContent = 'या फिल्टरमध्ये रूम नाही.';
    list.append(empty);
    return;
  }

  rooms.forEach(room => {
    const status = room.status || (room.rented ? 'rented' : room.hidden ? 'inactive' : 'available');
    const item = document.createElement('div');
    item.className = 'item';

    const top = document.createElement('div');
    top.className = 'top';
    top.append(statusBadge(status));
    top.append(Object.assign(document.createElement('strong'), { textContent: `${room.area}, ${room.city}` }));
    top.append(Object.assign(document.createElement('span'), { textContent: `₹${room.rent}/महिना` }));

    const actions = document.createElement('div');
    actions.className = 'status-actions';

    const options = [
      ['available', 'Available'],
      ['rented', 'Rented'],
      ['inactive', 'Inactive'],
    ];

    options.forEach(([value, label]) => {
      if (value === status) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = value === 'available' ? '' : 'ghost';
      button.textContent = `${label} करा`;
      button.addEventListener('click', async () => {
        button.disabled = true;
        const { error: updateError } = await adminSb
          .from('rooms')
          .update({ status: value })
          .eq('id', room.id);
        if (updateError) alert('Status बदलता आला नाही: ' + updateError.message);
        else await renderStatusManagement();
      });
      actions.append(button);
    });

    item.append(top, actions);
    list.append(item);
  });
}

async function renderPaymentSettings() {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.id === 't_payment'));
  document.getElementById('tools').classList.add('hide');
  statusTools.classList.add('hide');

  const list = document.getElementById('list');
  list.textContent = '';
  const { data, error } = await adminSb
    .from('settings')
    .select('payment_enabled, view_fee_paise, unlock_minutes')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    list.textContent = 'Payment settings लोड करता आले नाहीत.';
    return;
  }

  const item = document.createElement('div');
  item.className = 'item';
  item.innerHTML = '<strong>Payment Settings</strong><p class="mut">हे ON/OFF settings Supabase मध्ये सुरक्षितपणे जतन होते.</p>';

  const row = document.createElement('div');
  row.className = 'payment-toggle-row';
  row.innerHTML = '<div><strong>Online Payment</strong><div class="mut" id="payment-state"></div></div>';

  const label = document.createElement('label');
  label.className = 'payment-toggle';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = data.payment_enabled;
  const slider = document.createElement('span');
  label.append(input, slider);

  const state = () => {
    document.getElementById('payment-state').textContent = input.checked
      ? 'Payment ON आहे'
      : 'सध्या ऑनलाइन पेमेंट सुविधा बंद आहे.';
  };
  state();

  input.addEventListener('change', async () => {
    input.disabled = true;
    const { error: updateError } = await adminSb
      .from('settings')
      .update({ payment_enabled: input.checked })
      .eq('id', 1);

    input.disabled = false;
    if (updateError) {
      input.checked = !input.checked;
      alert('Payment setting बदलता आली नाही: ' + updateError.message);
    } else {
      state();
    }
  });

  row.append(label);
  item.append(row);
  list.append(item);
}

statusTab.addEventListener('click', renderStatusManagement);
paymentTab.addEventListener('click', renderPaymentSettings);
document.getElementById('statusSearch').addEventListener('input', renderStatusManagement);
document.getElementById('statusFilter').addEventListener('change', renderStatusManagement);
