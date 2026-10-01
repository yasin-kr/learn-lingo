# LearnLingo

[English](README.md) | **Türkçe**

Dil öğrenmek isteyen kullanıcıların öğretmenleri inceleyebildiği, dil, seviye ve saatlik ücret üzerinden filtreleyebildiği React uygulaması.

[Canlı site](https://verdant-cajeta-d66ca6.netlify.app/) | [GitHub deposu](https://github.com/yasin-kr/learn-lingo)

## Mevcut durum

Uygulama, Firebase Authentication ve Realtime Database bağlantılarıyla Netlify üzerinde yayımlanmıştır. Kayıt, giriş, çıkış ve kalıcı oturumlar Firebase JavaScript SDK ile yönetilir; kimlik doğrulama gözlemcisi mevcut kullanıcı bilgisini güncel tutar. Uygulama şifreleri saklamaz.

Öğretmenler, kayıt anahtarına dayalı sayfalama yapan REST sorgularıyla Realtime Database'den alınır. İlk yüklemede dört kart gösterilir ve her `Load more` işleminde yeni bir veritabanı isteği yapılır. Birlikte kullanılan filtreler, sınırlı boyuttaki veri gruplarına tarayıcıda uygulanır; eşleşen öğretmenleri bulmak için gerektiğinde ek veri grupları istenir. `src/lib/teacher-options.json` içindeki filtre seçenekleri, sağlanan öğretmen veri kümesiyle eşleşir.

Deneme dersi formu, doldurulan talebin yerel bir özetini gösterir. Rezervasyon göndermez veya e-posta iletmez.

## Özellikler

- Home, Teachers ve Firebase oturumu gerektiren Favorites sayfaları.
- Dil, öğrenci seviyesi ve en yüksek saatlik ücret filtreleri.
- Genişletilebilir öğretmen kartları, deneyim açıklamaları ve öğrenci yorumları.
- Firebase kullanıcısının UID bilgisine göre `localStorage` içinde saklanan favoriler. Aynı tarayıcıda korunur; cihazlar arasında eşitlenmez.
- Zorunlu alan doğrulaması, şifre gösterme kontrolü ve deneme dersi formu.
- Çarpı, arka plan tıklaması ve Escape ile kapanan, klavye odağını yöneten modallar.
- Mobil, tablet ve masaüstüne uyarlanan arayüz.
- Her açılışta veya yenilemede sarı, yeşil, mavi, pembe ve şeftali sırasıyla değişen tema. Normal sayfa geçişlerinde mevcut tema korunur; LearnLingo logosuna tıklamak ana sayfayı yeniden yükler ve sıradaki temaya geçirir.
- Temayla eşleşen İspanya, İtalya, Ukrayna, Birleşik Krallık ve Almanya bayraklı logolar.
- Ana sayfa görsellerinde `srcset` ile normal ekran için `1x`, retina ekran için `2x` dosya seçimi.

## Teknolojiler

React, Vite, React Router, Firebase Authentication, Firebase Realtime Database, React Hook Form, Yup ve CSS. Kod kontrolü için ESLint ve Prettier, tarayıcı kontrolleri için Playwright kullanılır.

## Yerel kurulum

Güncel Node.js LTS ve npm gereklidir.

`.env.example` dosyasını `.env.local` adıyla kopyalayın ve Realtime Database URL'si dahil Firebase web uygulaması yapılandırmasını doldurun. `.env.local` dosyasını Git dışında tutun. Kullanılan değişkenler:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Aşağıdaki Firebase kurulumunu tamamladıktan sonra çalıştırın:

```sh
npm install
npm run dev
```

Terminalde gösterilen yerel adresi tarayıcıda açın. Ortam değişkenlerini değiştirdikten sonra geliştirme sunucusunu yeniden başlatın.

## Firebase kurulumu

1. Firebase projesi oluşturun ve bir web uygulaması kaydedin.
2. Authentication bölümünde Email/Password sağlayıcısını etkinleştirin. Gerektiğinde yerel geliştirme ve yayın alan adlarını Authentication'ın yetkili alan adlarına ekleyin.
3. Realtime Database oluşturun ve adresini `VITE_FIREBASE_DATABASE_URL` için kullanın.
4. `firebase/teachers.import.json` dosyasını boş bir veritabanının köküne aktarın. Dosya, `teacher-001` ile `teacher-030` arasında anahtarlanmış 30 kayıt içeren `teachers` koleksiyonunu barındırır. Kökten içe aktarma mevcut verilerin yerini alır; dolu bir veritabanına içeriğini korumadan aktarma yapmayın.
5. `firebase/database.rules.json` içindeki kuralları yayınlayın. Bu kurallar `teachers` için herkese okuma izni verir, tüm istemci yazmalarını engeller; diğer veritabanı yolları istemciler tarafından okunamaz.

Öğretmen verileri Firebase Console gibi yönetici erişimiyle düzenlenir. Veritabanında `users` koleksiyonu gerekmez: hesapları Authentication yönetir; favoriler Firebase UID bilgisine göre ayrılmış olarak tarayıcıda saklanır.

Frontend içinde yalnızca Firebase web uygulaması yapılandırmasını kullanın. Servis hesabı özel anahtarını veya diğer sunucu kimlik bilgilerini `VITE_` değişkenlerine ya da proje dosyalarına koymayın.

## Kontroller

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

Otomatik tarayıcı testlerinin 17'si de geçmektedir. Bu testler, yalıtılmış tarayıcı oturumlarında Firebase ağ yanıtlarını taklit eder; gerçek hesap oluşturmaz veya canlı veritabanını değiştirmez. Lint ve üretim derlemesi kontrolleri de başarılıdır.

Netlify üzerinde yayımlanan sitede canlı Firebase ile kayıt ve profil bilgileri, giriş ve çıkış, kalıcı oturumlar, kullanıcıya özel favoriler, öğretmen sayfalaması ve birleşik filtreler doğrulanmıştır. Doğrudan sayfa bağlantıları ve yenileme, Favorites erişim koruması, form doğrulaması ve modal kapatma ile mobil ve tablet düzenleri de kontrol edilmiştir. Tarayıcı konsolunda hata görülmemiş, geçici test hesabı doğrulama sonrasında silinmiştir.

## Tasarım ve teknik kapsam

Arayüz, [LearnLingo Figma tasarımına](https://www.figma.com/file/dewf5jVviSTuWMMyU3d8Mc/?node-id=0-1) dayanır. Teknik kapsam; üç sayfa, Firebase Authentication ile kayıt ve oturum yönetimi, Realtime Database üzerinden öğretmen koleksiyonu ve dörder kart yükleme, kalıcı favoriler, öğretmen filtreleri ve doğrulanan modal formlarını içerir.

## Yayınlama

Canlı uygulama [verdant-cajeta-d66ca6.netlify.app](https://verdant-cajeta-d66ca6.netlify.app/) adresindedir. Netlify, [GitHub deposunun](https://github.com/yasin-kr/learn-lingo) `main` dalını yayımlar.

Netlify için temel dizin olarak depo kökünü, derleme komutu olarak `npm run build`, yayın dizini olarak `dist` kullanın. Derlemeden önce yukarıdaki yedi `VITE_FIREBASE_*` ortam değişkenini barındırma ayarlarında tanımlayın. Ortam değişiklikleri yeni bir derleme gerektirir.

Üretim çıktısı `dist` dizinine yazılır. Projedeki `public/_redirects` dosyası, React Router için sayfa isteklerini `index.html` dosyasına yönlendirir; böylece `/teachers` ve `/favorites` adresleri doğrudan açılabilir ve yenilenebilir.

Rezervasyonları veritabanına kaydetmek veya e-posta göndermek mevcut teknik şartnamede zorunlu değildir; bunlar isteğe bağlı ek özelliklerdir.
