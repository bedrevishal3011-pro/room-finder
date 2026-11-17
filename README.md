# Room Finder – सेटअप मार्गदर्शक (मराठी)

विद्यार्थ्यांसाठी रूम शोध. घरमालकाचा नंबर आणि पत्ता पैसे भरल्यावर ठराविक वेळेसाठी दिसतो.
सर्व काही एका वेळी करू नका. आधी 1 ते 4 (Razorpay शिवाय) करून site चालवून बघा, मग 5.

## 1. GitHub वर टाका
1. github.com वर New repository बनवा (नाव उदा. `room-finder`, Private ठेवा).
2. "uploading an existing file" वर क्लिक करून या फोल्डरमधील **सर्व फाईल्स आणि `supabase` फोल्डर** drag-drop करा. Commit करा.
3. `config.js` मध्ये गुप्त चावी (Key Secret) कधीही टाकू नका. त्यात फक्त Supabase चं URL आणि "anon" key जातात, ते public असतात.

## 2. Supabase (डेटाबेस आणि login)
1. supabase.com वर नवीन project बनवा (region: Mumbai/Singapore).
2. SQL Editor मध्ये `supabase/schema.sql` ची पूर्ण फाईल पेस्ट करून **एकदाच** Run करा.
3. Project Settings → API मधून **Project URL** आणि **anon public key** `config.js` मध्ये भरा.
4. Google login: Google Cloud Console मध्ये OAuth client बनवा. Authorized redirect URI: `https://<तुमचा-project>.supabase.co/auth/v1/callback`. मग Supabase → Authentication → Providers → Google मध्ये Client ID आणि Secret टाका.
5. Authentication → URL Configuration: Site URL = तुमच्या site चा पत्ता (पायरी 4 नंतर), आणि Redirect URLs मध्ये `https://तुमची-site/*` जोडा.

## 3. स्वतःला admin बनवा
आधी site वर Google ने एकदा login करा. मग Supabase SQL Editor मध्ये (तुमचा ईमेल बदला):
```sql
insert into public.admins (user_id) select id from auth.users where email = 'तुमचा@gmail.com';
```
नंतर `तुमची-site/admin.html` उघडा.

## 4. Vercel वर चालवा (लिंक मिळवण्यासाठी)
1. vercel.com वर GitHub ने login करा → Add New → Project → तुमची `room-finder` repo निवडा → Deploy (कोणतेही build setting नको).
2. मिळालेला पत्ता तुमची site. Supabase च्या URL Configuration मध्ये तो टाका (पायरी 2.5).

## 5. Razorpay (आधी Test mode)
1. razorpay.com खातं → Test mode. Settings → API Keys मधून Key ID आणि Key Secret घ्या.
2. Supabase → Edge Functions मध्ये दोन function बनवा आणि `supabase/functions/` मधला कोड पेस्ट करा: `create-order` आणि `razorpay-webhook`. **`razorpay-webhook` साठी "Verify JWT" बंद करा.**
3. Edge Functions → Secrets मध्ये टाका: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (हा तुम्ही स्वतः ठरवलेला कोणताही लांब यादृच्छिक शब्द).
4. Razorpay → Settings → Webhooks → Add: URL = `https://<project>.supabase.co/functions/v1/razorpay-webhook`, Secret = वरचाच `RAZORPAY_WEBHOOK_SECRET`, Event = `payment.captured`.
5. Test mode चं बनावट कार्ड/UPI वापरून एका रूमचं पेमेंट करा. माहिती उघडते का आणि वेळ संपल्यावर लपते का ते बघा.
6. खरे पैसे घेण्यासाठी Razorpay KYC पूर्ण करा, Live keys ने secrets बदला आणि Live webhook बनवा.

## 6. प्रकाशित करण्याआधी
- `config.js` मध्ये नाव, ईमेल, कायदेशीर नाव, पत्ता, तक्रार अधिकारी, शहर, तारीख भरा.
- अटी, गोपनीयता, परतावा पानं वकिलाकडून तपासून `LEGAL_DRAFT: false` करा.
- Admin पानातील "शुल्क" टॅबमध्ये शुल्क आणि वेळ ठरवा.

## 7. तपासणी यादी
रूम post (फोटोसह) → दुसऱ्या खात्याने रूम दिसते का → संपर्क लपलेला दिसतो का → test पेमेंट → माहिती उघडते → countdown → वेळ संपल्यावर लपते → admin पानात Featured/लपवा/तक्रार/शुल्क.

## लोक वाढल्यावर काय होतं
- पान स्वतः (Vercel) आपोआप सगळीकडे वेगाने चालतं, गर्दीने बंद पडत नाही.
- मर्यादा Supabase च्या मोफत योजनेत येतात (साठवण, महिन्याचा डेटा आणि सक्रिय वापरकर्ते). Dashboard मध्ये Usage पाहत राहा. 70-80% भरल्यावर Pro योजना घ्या.
- यादी 24-24 रूमने येते, फिल्टर database मध्ये होतात आणि मुख्य शोधांवर index आहेत.
- Razorpay चे webhook पुन्हा आले तरी दोनदा unlock होत नाही.
