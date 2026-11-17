document.querySelectorAll('[data-cfg]').forEach(e => {
  const v = (window.CONFIG || {})[e.dataset.cfg];
  if (v) e.textContent = v; else if (e.dataset.cfg !== 'BRAND') e.classList.add('todo');
});
const m = document.getElementById('mail');
if (m && CONFIG.CONTACT_EMAIL) m.href = 'mailto:' + CONFIG.CONTACT_EMAIL;
if (CONFIG.LEGAL_DRAFT !== false) document.getElementById('draft').hidden = false;
