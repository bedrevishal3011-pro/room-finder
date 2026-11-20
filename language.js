
(function () {
  "use strict";

  const dictionaries = {
    hi: {
      "मुख्य मजकुराकडे जा": "मुख्य सामग्री पर जाएँ",
      "रूम शोधा": "कमरा खोजें",
      "कसं चालतं": "यह कैसे काम करता है",
      "घरमालकांसाठी": "मकान मालिकों के लिए",
      "प्रश्न": "अक्सर पूछे जाने वाले प्रश्न",
      "Google ने login": "Google से लॉगिन",
      "विद्यार्थ्यांसाठी रूम शोध": "छात्रों के लिए कमरा खोजें",
      "कॉलेजजवळ रूम, थेट घरमालकाकडून": "कॉलेज के पास सीधे मकान मालिक से कमरा",
      "दलाल नाही, कमिशन नाही. शहर आणि कॉलेज निवडा, फोटो मोठे करून पहा आणि घरमालकाशी थेट बोला.": "कोई ब्रोकर नहीं, कोई कमीशन नहीं। शहर और कॉलेज चुनें, फोटो देखें और मकान मालिक से सीधे बात करें।",
      "कमिशन नाही": "कोई कमीशन नहीं",
      "फोटो मोठे करून पहा": "फोटो बड़ा करके देखें",
      "चुकीची माहिती कळवा": "गलत जानकारी की शिकायत करें",
      "आणखी फिल्टर": "अन्य फ़िल्टर",
      "सर्व प्रकार": "सभी प्रकार",
      "मुलगे आणि मुली": "लड़के और लड़कियाँ",
      "मुलांसाठी": "लड़कों के लिए",
      "मुलींसाठी": "लड़कियों के लिए",
      "दोघांसाठी": "दोनों के लिए",
      "नवीन आधी": "नए पहले",
      "स्वस्त आधी": "कम किराया पहले",
      "महाग आधी": "ज़्यादा किराया पहले",
      "जवळच्या आधी": "नज़दीकी पहले",
      "उपलब्ध रूम": "उपलब्ध कमरे",
      "सर्व रूम": "सभी कमरे",
      "माझ्या रूम": "मेरे कमरे",
      "रूम भाड्याने द्या": "कमरा किराए पर दें",
      "रूमची माहिती": "कमरे की जानकारी",
      "* असलेली माहिती आवश्यक आहे.": "* वाली जानकारी ज़रूरी है।",
      "✕ बंद करा": "✕ बंद करें",
      "ठिकाण": "स्थान",
      "शहर *": "शहर *",
      "एरिया *": "इलाका *",
      "कॉलेज / संस्था जवळ": "कॉलेज / संस्थान के पास",
      "रूमचा तपशील": "कमरे का विवरण",
      "भाडे (₹/महिना) *": "किराया (₹/महीना) *",
      "डिपॉझिट (₹)": "जमानत राशि (₹)",
      "प्रकार": "प्रकार",
      "कोणासाठी": "किसके लिए",
      "सुविधा": "सुविधाएँ",
      "वर्णन": "विवरण",
      "फोटो": "फोटो",
      "जास्तीत जास्त 3 फोटो (स्पष्ट आणि खरे फोटो टाका)": "अधिकतम 3 फोटो (स्पष्ट और असली फोटो डालें)",
      "संपर्क (फक्त पैसे भरलेल्यांना दिसेल)": "संपर्क (केवल भुगतान करने वालों को दिखेगा)",
      "पूर्ण पत्ता *": "पूरा पता *",
      "तुमचे नाव *": "आपका नाम *",
      "WhatsApp / फोन नंबर *": "WhatsApp / फोन नंबर *",
      "माझी सध्याची लोकेशन वापरा": "मेरी वर्तमान लोकेशन इस्तेमाल करें",
      "लोकेशन फक्त Featured झाल्यावर, पैसे भरलेल्यांना दिसते.": "लोकेशन केवल Featured होने के बाद भुगतान करने वालों को दिखेगी।",
      "मी": "मैंने",
      "वापराच्या अटी": "उपयोग की शर्तें",
      "वाचल्या आहेत आणि मान्य करतो. मी दिलेली माहिती खरी आहे आणि ही रूम भाड्याने देण्याचा मला कायदेशीर अधिकार आहे.": "पढ़ ली हैं और स्वीकार करता हूँ। मेरी दी गई जानकारी सही है और मुझे यह कमरा किराए पर देने का कानूनी अधिकार है।",
      "रूम प्रसिद्ध करा": "कमरे की जानकारी प्रकाशित करें",
      "आणखी रूम दाखवा": "और कमरे दिखाएँ",
      "लोड होत आहे…": "लोड हो रहा है…",
      "तीन सोप्या पायऱ्यांत तुमची रूम शोधा.": "तीन आसान चरणों में अपना कमरा खोजें।",
      "शोधा": "खोजें",
      "पहा": "देखें",
      "संपर्क करा": "संपर्क करें",
      "तुमची रूम रिकामी आहे?": "क्या आपका कमरा खाली है?",
      "नेहमीचे प्रश्न": "अक्सर पूछे जाने वाले प्रश्न",
      "काही शंका असल्यास येथे उत्तर मिळेल.": "किसी भी सवाल का जवाब यहाँ मिलेगा।",
      "माहिती": "जानकारी",
      "गोपनीयता धोरण": "गोपनीयता नीति",
      "परतावा धोरण": "रिफंड नीति"
    },

    en: {
      "मुख्य मजकुराकडे जा": "Skip to main content",
      "रूम शोधा": "Find Rooms",
      "कसं चालतं": "How It Works",
      "घरमालकांसाठी": "For Owners",
      "प्रश्न": "FAQ",
      "Google ने login": "Login with Google",
      "विद्यार्थ्यांसाठी रूम शोध": "Room Search for Students",
      "कॉलेजजवळ रूम, थेट घरमालकाकडून": "Rooms Near College, Directly from Owners",
      "दलाल नाही, कमिशन नाही. शहर आणि कॉलेज निवडा, फोटो मोठे करून पहा आणि घरमालकाशी थेट बोला.": "No brokers, no commission. Choose your city and college, view photos and contact the owner directly.",
      "कमिशन नाही": "No Commission",
      "फोटो मोठे करून पहा": "View Full-size Photos",
      "चुकीची माहिती कळवा": "Report Incorrect Information",
      "आणखी फिल्टर": "More Filters",
      "सर्व प्रकार": "All Types",
      "मुलगे आणि मुली": "Boys and Girls",
      "मुलांसाठी": "For Boys",
      "मुलींसाठी": "For Girls",
      "दोघांसाठी": "For Both",
      "नवीन आधी": "Newest First",
      "स्वस्त आधी": "Lowest Rent First",
      "महाग आधी": "Highest Rent First",
      "जवळच्या आधी": "Nearest First",
      "उपलब्ध रूम": "Available Rooms",
      "सर्व रूम": "All Rooms",
      "माझ्या रूम": "My Rooms",
      "रूम भाड्याने द्या": "List Your Room",
      "रूमची माहिती": "Room Details",
      "* असलेली माहिती आवश्यक आहे.": "Fields marked * are required.",
      "✕ बंद करा": "✕ Close",
      "ठिकाण": "Location",
      "शहर *": "City *",
      "एरिया *": "Area *",
      "कॉलेज / संस्था जवळ": "Nearby College / Institute",
      "रूमचा तपशील": "Room Details",
      "भाडे (₹/महिना) *": "Rent (₹/Month) *",
      "डिपॉझिट (₹)": "Deposit (₹)",
      "प्रकार": "Type",
      "कोणासाठी": "Suitable For",
      "सुविधा": "Facilities",
      "वर्णन": "Description",
      "फोटो": "Photos",
      "जास्तीत जास्त 3 फोटो (स्पष्ट आणि खरे फोटो टाका)": "Maximum 3 photos (Upload clear, genuine photos)",
      "संपर्क (फक्त पैसे भरलेल्यांना दिसेल)": "Contact (Visible only to users who have paid)",
      "पूर्ण पत्ता *": "Full Address *",
      "तुमचे नाव *": "Your Name *",
      "WhatsApp / फोन नंबर *": "WhatsApp / Phone Number *",
      "माझी सध्याची लोकेशन वापरा": "Use My Current Location",
      "लोकेशन फक्त Featured झाल्यावर, पैसे भरलेल्यांना दिसते.": "Location is visible to paying users only after the listing is Featured.",
      "मी": "I have",
      "वापराच्या अटी": "Terms of Use",
      "वाचल्या आहेत आणि मान्य करतो. मी दिलेली माहिती खरी आहे आणि ही रूम भाड्याने देण्याचा मला कायदेशीर अधिकार आहे.": "read and agree to the terms. The information I provided is true and I have the legal right to rent out this room.",
      "रूम प्रसिद्ध करा": "Publish Room",
      "आणखी रूम दाखवा": "Show More Rooms",
      "लोड होत आहे…": "Loading…",
      "तीन सोप्या पायऱ्यांत तुमची रूम शोधा.": "Find your room in three simple steps.",
      "शोधा": "Search",
      "पहा": "View",
      "संपर्क करा": "Contact",
      "तुमची रूम रिकामी आहे?": "Is Your Room Vacant?",
      "नेहमीचे प्रश्न": "Frequently Asked Questions",
      "काही शंका असल्यास येथे उत्तर मिळेल.": "Find answers to common questions here.",
      "माहिती": "Information",
      "गोपनीयता धोरण": "Privacy Policy",
      "परतावा धोरण": "Refund Policy"
    }
  };

  const select = document.getElementById("languageSelect");
  if (!select) return;

  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();

  function rememberText(node) {
    if (!originalText.has(node)) {
      originalText.set(node, node.nodeValue);
    }
    return originalText.get(node);
  }

  function translateTextNode(node, lang) {
    const original = rememberText(node);
    const trimmed = original.trim();
    if (!trimmed) return;

    const translated = lang === "mr"
      ? original
      : dictionaries[lang]?.[trimmed];

    if (translated !== undefined) {
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      node.nodeValue = leading + translated + trailing;
    }
  }

  function translateAttributes(element, lang) {
    const attrs = ["placeholder", "aria-label", "title"];

    attrs.forEach(attr => {
      if (!element.hasAttribute(attr)) return;

      let saved = originalAttributes.get(element);
      if (!saved) {
        saved = {};
        originalAttributes.set(element, saved);
      }

      if (!(attr in saved)) saved[attr] = element.getAttribute(attr);

      const original = saved[attr];
      element.setAttribute(
        attr,
        lang === "mr" ? original : (dictionaries[lang]?.[original] || original)
      );
    });
  }

  function translatePage(lang) {
    document.documentElement.lang = lang;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    let node;
    while ((node = walker.nextNode())) {
      translateTextNode(node, lang);
    }

    document.body.querySelectorAll("*").forEach(element => {
      translateAttributes(element, lang);

      if (element.tagName === "OPTION") {
        if (!originalAttributes.has(element)) {
          originalAttributes.set(element, {
            optionText: element.textContent
          });
        }

        const original = originalAttributes.get(element).optionText;
        element.textContent = lang === "mr"
          ? original
          : (dictionaries[lang]?.[original] || original);
      }
    });
  }

  const savedLanguage = localStorage.getItem("rf_language") || "mr";
  select.value = dictionaries[savedLanguage] || savedLanguage
    ? savedLanguage
    : "mr";

  select.addEventListener("change", function () {
    const lang = select.value;
    localStorage.setItem("rf_language", lang);
    translatePage(lang);
  });

  translatePage(select.value);

  // App.js कडून नंतर तयार होणाऱ्या मजकुरासाठी
  let translateTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(translateTimer);
    translateTimer = setTimeout(() => {
      translatePage(select.value);
    }, 50);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
