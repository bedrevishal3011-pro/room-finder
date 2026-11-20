const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function loadPublicPaymentControl() {
  const { data, error } = await sb
    .from('settings')
    .select('payment_enabled, view_fee_paise, unlock_minutes')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) return;

  let banner = document.getElementById('payment-off-banner');
  if (!data.payment_enabled) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'payment-off-banner';
      banner.className = 'payment-off-banner';
      banner.textContent = 'सध्या ऑनलाइन पेमेंट सुविधा बंद आहे.';
      document.querySelector('#rooms .wrap').insertBefore(banner, document.getElementById('list'));
    }
  } else if (banner) {
    banner.remove();
  }

  const apply = () => {
    document.querySelectorAll('#list button').forEach(button => {
      const text = (button.textContent || '').trim();
      if (/संपर्क.*पाहा|संपर्कासाठी login करा/i.test(text)) {
        if (!data.payment_enabled) {
          button.hidden = true;
          button.disabled = true;
        } else {
          button.hidden = false;
          button.disabled = false;
        }
      }
    });
  };

  apply();
  new MutationObserver(apply).observe(document.getElementById('list'), { childList: true, subtree: true });
}

loadPublicPaymentControl();
