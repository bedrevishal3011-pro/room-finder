window.I18N = {
  mr: {},
  hi: {
    skip:'मुख्य सामग्री पर जाएं',navRooms:'रूम खोजें',navHow:'कैसे काम करता है',navOwners:'मकान मालिकों के लिए',adminPage:'Admin पेज',loginGoogle:'Google से login',eyebrow:'छात्रों के लिए रूम खोज',heroTitle:'कॉलेज के पास रूम, सीधे मकान मालिक से',heroLead:'कोई दलाल या कमीशन नहीं। शहर और कॉलेज चुनें, फोटो देखें और मकान मालिक से सीधे संपर्क करें।',citySearch:'शहर या एरिया',collegeSearch:'कॉलेज',rentSearch:'अधिकतम किराया',moreFilters:'और फिल्टर',allTypes:'सभी प्रकार',allGender:'लड़के और लड़कियां',boys:'लड़कों के लिए',girls:'लड़कियों के लिए',anyGender:'दोनों के लिए',newFirst:'नए पहले',cheapFirst:'सस्ते पहले',expensiveFirst:'महंगे पहले',nearMe:'मेरे पास',chip1:'कोई कमीशन नहीं',chip2:'फोटो बड़ा करके देखें',chip3:'गलत जानकारी बताएं',availableRooms:'उपलब्ध रूम',allRooms:'सभी रूम',myRooms:'मेरे रूम',saved:'Saved',listRoom:'रूम किराए पर दें',roomInfo:'रूम की जानकारी',requiredInfo:'* वाली जानकारी आवश्यक है।',location:'स्थान',city:'शहर *',area:'एरिया *',nearCollege:'कॉलेज / संस्था के पास',roomDetails:'रूम विवरण',rent:'किराया (₹/महीना) *',deposit:'डिपॉज़िट (₹)',type:'प्रकार',forWhom:'किसके लिए',amenities:'सुविधाएं',description:'विवरण',photos:'फोटो',photoHint:'अधिकतम 3 स्पष्ट और असली फोटो डालें',contact:'संपर्क',fullAddress:'पूरा पता *',yourName:'आपका नाम *',phone:'WhatsApp / फोन नंबर *',useLocation:'मेरी वर्तमान लोकेशन उपयोग करें',acceptTerms:'मैं उपयोग की शर्तें स्वीकार करता/करती हूं',publishRoom:'रूम प्रकाशित करें',showMore:'और रूम दिखाएं',loading:'लोड हो रहा है…',howTitle:'कैसे काम करता है',howLead:'तीन आसान चरणों में अपना रूम खोजें।',step1Title:'खोजें',step1Text:'शहर, कॉलेज, किराया और सुविधाओं से फिल्टर करें।',step2Title:'देखें',step2Text:'फोटो बड़ा करें और पसंदीदा रूम सेव करें।',step3Title:'संपर्क करें',step3Text:'शुल्क भरने के बाद मकान मालिक का नंबर और पता देखें।',ownersTitle:'आपका रूम खाली है?',ownersText:'Google से login करें, फोटो और जानकारी भरें और छात्रों तक पहुंचें।',faqTitle:'अक्सर पूछे गए प्रश्न',faq1Q:'संपर्क देखने के लिए पैसे क्यों देने होते हैं?',faq1A:'यह शुल्क मकान मालिक का नंबर और पता सुरक्षित रखने के लिए लिया जाता है।',faq2Q:'रूम डालना मुफ्त है?',faq2A:'हां, फिलहाल रूम डालने का कोई शुल्क नहीं है।',footerText:'छात्रों को कॉलेज के पास रूम खोजने में मदद करने वाला मंच।',information:'जानकारी',terms:'उपयोग की शर्तें',privacy:'गोपनीयता नीति',refunds:'रिफंड नीति'
  },
  en: {
    skip:'Go to main content',navRooms:'Find rooms',navHow:'How it works',navOwners:'For owners',adminPage:'Admin page',loginGoogle:'Login with Google',eyebrow:'Room search for students',heroTitle:'Rooms near college, directly from owners',heroLead:'No brokers, no commission. Choose a city and college, view photos, and contact owners directly.',citySearch:'City or area',collegeSearch:'College',rentSearch:'Maximum rent',moreFilters:'More filters',allTypes:'All types',allGender:'Men and women',boys:'For men',girls:'For women',anyGender:'For everyone',newFirst:'Newest first',cheapFirst:'Lowest rent',expensiveFirst:'Highest rent',nearMe:'Near me',chip1:'No commission',chip2:'View photos larger',chip3:'Report incorrect information',availableRooms:'Available rooms',allRooms:'All rooms',myRooms:'My rooms',saved:'Saved',listRoom:'List a room',roomInfo:'Room information',requiredInfo:'Fields marked * are required.',location:'Location',city:'City *',area:'Area *',nearCollege:'Near college / institution',roomDetails:'Room details',rent:'Rent (₹/month) *',deposit:'Deposit (₹)',type:'Type',forWhom:'Suitable for',amenities:'Amenities',description:'Description',photos:'Photos',photoHint:'Add up to 3 clear, genuine photos',contact:'Contact',fullAddress:'Full address *',yourName:'Your name *',phone:'WhatsApp / phone number *',useLocation:'Use my current location',acceptTerms:'I accept the terms of use',publishRoom:'Publish room',showMore:'Show more rooms',loading:'Loading…',howTitle:'How it works',howLead:'Find your room in three simple steps.',step1Title:'Search',step1Text:'Filter by city, college, rent, and amenities.',step2Title:'View',step2Text:'Enlarge photos and save rooms you like.',step3Title:'Contact',step3Text:'After payment, view the owner’s number and address.',ownersTitle:'Is your room vacant?',ownersText:'Login with Google, add photos and details, and reach students.',faqTitle:'Frequently asked questions',faq1Q:'Why pay to view contact details?',faq1A:'The fee helps keep owner phone numbers and addresses protected.',faq2Q:'Is listing a room free?',faq2A:'Yes, listing a room is currently free.',footerText:'A platform that helps students find rooms near their colleges.',information:'Information',terms:'Terms of use',privacy:'Privacy policy',refunds:'Refund policy'
  }
};

(function () {
  const LANG_KEY = 'roomFinderLanguage';
  function applyLanguage(lang) {
    if (!window.I18N[lang]) lang = 'mr';
    const strings = window.I18N[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      if (strings[el.dataset.i18n] !== undefined) el.textContent = strings[el.dataset.i18n];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      if (strings[el.dataset.i18nPlaceholder] !== undefined) el.placeholder = strings[el.dataset.i18nPlaceholder];
    });
    const switcher = document.getElementById('langSwitch');
    if (switcher) switcher.value = lang;
    localStorage.setItem(LANG_KEY, lang);
  }
  window.applyLanguage = applyLanguage;
  window.addEventListener('DOMContentLoaded', function () {
    const saved = localStorage.getItem(LANG_KEY);
    const lang = saved || (navigator.language || 'mr').startsWith('hi') ? (saved || 'hi') : (saved || 'mr');
    applyLanguage(lang);
    const switcher = document.getElementById('langSwitch');
    if (switcher) switcher.addEventListener('change', e => applyLanguage(e.target.value));
  });
})();
