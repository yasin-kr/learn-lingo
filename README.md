# LearnLingo

Dil öğrenmek isteyen kullanıcıların öğretmenleri inceleyebildiği, dil, seviye ve saatlik ücret üzerinden filtreleyebildiği React uygulaması.

## Mevcut durum

Proje şu anda frontend önizleme aşamasındadır. Giriş ve kayıt formları yalnızca tarayıcıda bir önizleme profili oluşturur; gerçek kimlik doğrulama yapılmaz ve şifreler saklanmaz. Deneme dersi formu gönderilmez, doldurulan talebin bir özetini gösterir.

Öğretmenler, sağlanan özgün veri dosyasının `public/data/teachers.json` kopyasından okunur. İlk yüklemede dört kart gösterilir. Her `Load more` işleminde dosyaya yeni bir HTTP isteği yapılır; filtreleme ve sayfalama tarayıcıda gerçekleştirilir. Firebase henüz bağlı değildir.

## Özellikler

- Home, Teachers ve önizleme oturumu gerektiren Favorites sayfaları.
- Dil, öğrenci seviyesi ve en yüksek saatlik ücret filtreleri.
- Genişletilebilir öğretmen kartları, deneyim açıklamaları ve öğrenci yorumları.
- Önizleme profiline göre `localStorage` içinde saklanan favoriler.
- Zorunlu alan doğrulaması, şifre gösterme kontrolü ve deneme dersi formu.
- Çarpı, arka plan tıklaması ve Escape ile kapanan, klavye odağını yöneten modallar.
- Mobil, tablet ve masaüstüne uyarlanan arayüz.
- Her açılışta veya yenilemede sarı, yeşil, mavi, pembe ve şeftali sırasıyla değişen tema. Sayfa geçişlerinde mevcut tema korunur.
- Temayla eşleşen İspanya, İtalya, Ukrayna, Birleşik Krallık ve Almanya bayraklı logolar.
- Ana sayfa görsellerinde `srcset` ile normal ekran için `1x`, retina ekran için `2x` dosya seçimi.

## Teknolojiler

React, Vite, React Router, React Hook Form, Yup ve CSS. Kod kontrolü için ESLint ve Prettier, tarayıcı kontrolleri için Playwright kullanılır.

## Yerel kurulum

Güncel Node.js LTS ve npm gereklidir.

```sh
npm install
npm run dev
```

Terminalde gösterilen yerel adresi tarayıcıda açın. Frontend önizlemesi için Firebase anahtarı veya ortam değişkeni gerekmez.

```sh
npm run build
npm run preview
npm run lint
npm run format:check
```

Tarayıcı testleri için:

```sh
npx playwright install chromium
npm test
```

## Tasarım ve teknik kapsam

Arayüz, [LearnLingo Figma tasarımına](https://www.figma.com/file/dewf5jVviSTuWMMyU3d8Mc/?node-id=0-1) dayanır. Teknik kapsam; üç sayfa, Firebase Authentication ile kayıt ve oturum yönetimi, Realtime Database üzerinden öğretmen koleksiyonu ve dörder kart yükleme, kalıcı favoriler, öğretmen filtreleri ve doğrulanan modal formlarını içerir.

## Sonraki aşama

Firebase Authentication bağlantısı, öğretmen verilerinin Realtime Database'e aktarılması, veritabanından sayfalı veri sorgulama ve gerekli güvenlik kuralları tamamlanacaktır. Rezervasyon formunun gerçek gönderim davranışı ayrıca bağlanacaktır. Sonrasında üretim yapılandırması ve barındırma ortamında yayınlama yapılacaktır.

Üretim çıktısı `dist` dizinine yazılır. React Router için barındırma servisinin sayfa isteklerini `index.html` dosyasına yönlendirmesi gerekir. Netlify için yönlendirme dosyası projede bulunmaktadır; proje henüz yayına alınmış olarak sunulmamaktadır.
