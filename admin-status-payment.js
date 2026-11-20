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
  document.querySelectorAll('.tabs button').forEach(button => {
    button.classList.toggle('on', button.id === 't_status');
  });
  document.getElementById('tools').classList.add('hide');
  statusTools.classList.remove('hide');

  const list = document.getElementById('list');
  list.textContent = '';
  const query = (document.getElementById('statusSearch').value || '').trim().toLowerCase();
  const filter = document.getElementById('statusFilter').value;

  const { data, error } = await adminSb
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    list.textContent = 'रूम लोड करता आले नाहीत: ' + error.message;
    return;
  }

  const rooms = (data || []).filter(room => {
    const matchesSearch = !query || `${room.city} ${room.area}`.toLowerCase().includes(query);
    const status = room.status || (room.rented ? 'rented' : room.hidden ? 'inactive' : 'available');
    return matchesSearch && (filter === 'all' || status === filter);
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
    top.append(Object.assign(document.createElement('strong'), {
      textContent: `${room.area}, ${room.city}`,
    }));
    top.append(Object.assign(document.createElement('span'), {
      textContent: `₹${Number(room.rent).toLocaleString('en-IN')}/महिना`,
    }));

    const actions = document.createElement('div');
    actions.className = 'status-actions';
    [
      ['available', 'Available'],
      ['rented', 'Rented'],
      ['inactive', 'Inactive'],
    ].forEach(([value, label]) => {
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
        if (updateError) {
          button.disabled = false;
          alert('Status बदलता आला नाही: ' + updateError.message);
        } else {
          await renderStatusManagement();
        }
      });
      actions.append(button);
    });

    item.append(top, actions);
    list.append(item);
  });
}

async function renderPaymentSettings() {
  document.querySelectorAll('.tabs button').forEach(button => {
    button.classList.toggle('on', button.id === 't_payment');
  });
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
  const heading = document.createElement('strong');
  heading.textContent = 'Payment Settings';
  const description = document.createElement('p');
  description.className = 'mut';
  description.textContent = 'Payment ON/OFF सेटिंग Supabase मध्ये जतन होते.';
  item.append(heading, description);

  const row = document.createElement('div');
  row.className = 'payment-toggle-row';
  const stateWrap = document.createElement('div');
  const stateHeading = document.createElement('strong');
  stateHeading.textContent = 'Online Payment';
  const state = document.createElement('div');
  state.className = 'mut';
  state.id = 'payment-state';
  stateWrap.append(stateHeading, state);

  const label = document.createElement('label');
  label.className = 'payment-toggle';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!data.payment_enabled;
  input.setAttribute('aria-label', 'Online Payment ON/OFF');
  const slider = document.createElement('span');
  label.append(input, slider);

  const updateStateText = () => {
    state.textContent = input.checked ? 'Payment ON आहे' : 'सध्या ऑनलाइन पेमेंट सुविधा बंद आहे.';
  };
  updateStateText();

  input.addEventListener('change', async () => {
    const intendedValue = input.checked;
    input.disabled = true;
    const { error: updateError } = await adminSb
      .from('settings')
      .update({ payment_enabled: intendedValue })
      .eq('id', 1);

    input.disabled = false;
    if (updateError) {
      input.checked = !intendedValue;
      alert('Payment setting बदलता आली नाही: ' + updateError.message);
    }
    updateStateText();
  });

  row.append(stateWrap, label);
  item.append(row);
  list.append(item);
}

statusTab.addEventListener('click', renderStatusManagement);
paymentTab.addEventListener('click', renderPaymentSettings);
document.getElementById('statusSearch').addEventListener('input', renderStatusManagement);
document.getElementById('statusFilter').addEventListener('change', renderStatusManagement);
