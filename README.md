# Üretim Kontrol Mobil ve Web Uygulaması

Üretim süreçlerinin mobil cihaz ve web tarayıcısı üzerinden yönetilmesini sağlayan, rol tabanlı bir üretim kontrol arayüzüdür. Uygulama; makine ve ürün tanımlama, üretim oturumu başlatma, canlı üretim takibi, geçmiş oturumları görüntüleme, filtreli raporlama ve PDF çıktısı oluşturma özelliklerini içerir.

Bu repository, sistemin **React Native + Expo tabanlı mobil ve web istemcisini** içerir. Spring Boot backend ve Python makine simülatörü ayrı olarak çalıştırılır.

## Özellikler

### Yönetici

- Yönetici ve operatör kullanıcılarını oluşturma
- Makine ekleme, düzenleme ve pasife alma
- Ürün oluşturma ve ürünleri bir veya birden fazla makineyle eşleştirme
- Ürünlere dinamik kontrol özellikleri ve seçenekleri tanımlama
- Sistem genelindeki üretim oturumlarını görüntüleme
- Tarih, makine, ürün, operatör ve oturum bazında rapor filtreleme
- Mobil ve web ortamında aynı tasarıma sahip PDF rapor oluşturma

### Operatör

- Yetkili makine ve ürünleri görüntüleme
- Hedef adet belirleyerek üretim oturumu başlatma
- Aktif üretim verilerini canlı takip etme
- Üretimi hedefe ulaşmadan durdurma
- Yalnızca kendi üretim oturumlarını ve kayıtlarını görüntüleme
- Yetkisi kapsamındaki üretim raporlarını oluşturma

### Ortak özellikler

- JWT access token ve refresh token ile kimlik doğrulama
- Rol tabanlı ekran ve menü yönetimi
- Mobil cihazlarda güvenli token saklama
- Oturumu açık tutma
- Üretim tamamlandığında cihaz bildirimi
- Android, iOS ve web desteği
- Mobilde PDF paylaşma, webde PDF indirme

## Kullanılan teknolojiler

| Teknoloji | Kullanım amacı |
| --- | --- |
| React Native | Mobil kullanıcı arayüzü |
| Expo SDK 57 | Mobil ve web geliştirme ortamı |
| Expo Router | Dosya tabanlı sayfa yönlendirme |
| TypeScript | Tip güvenli frontend geliştirme |
| Expo SecureStore | Mobil cihazda güvenli token saklama |
| Expo Notifications | Üretim tamamlanma bildirimleri |
| Expo Print / Sharing | Mobil PDF üretme ve paylaşma |
| html2pdf.js | Web ortamında PDF indirme |
| Spring Boot REST API | İş kuralları ve veri erişimi |
| Supabase PostgreSQL | Kalıcı üretim verilerinin saklanması |

## Sistem mimarisi

```text
Mobil Uygulama / Web Tarayıcısı
              │
              │ HTTPS / REST / JSON
              ▼
       Spring Boot Backend
              │
              ├── JWT kimlik doğrulama
              ├── Rol ve yetki kontrolü
              ├── Üretim iş kuralları
              └── Raporlama servisi
              │
              ▼
      Supabase PostgreSQL

Python Makine Simülatörü ──► Spring Boot Backend
```

Frontend doğrudan Supabase'e bağlanmaz. Bütün istekler Spring Boot REST API üzerinden gerçekleştirilir. Veritabanı bilgileri ve güvenlik anahtarları yalnızca backend ortamında tutulmalıdır.

## Gereksinimler

- Node.js LTS
- npm
- Expo Go veya Android/iOS emülatörü
- Çalışan Spring Boot backend
- Fiziksel cihaz testi için telefon ve bilgisayarın aynı yerel ağda olması

Sürümleri kontrol etmek için:

```bash
node --version
npm --version
```

## Kurulum

Repository'yi klonlayın:

```bash
git clone https://github.com/ihsanmertorengul/production-control-mobile-web.git
cd production-control-mobile-web
```

Bağımlılıkları yükleyin:

```bash
npm install
```

Örnek ortam dosyasını kopyalayın.

Windows:

```powershell
copy .env.example .env
```

macOS veya Linux:

```bash
cp .env.example .env
```

## API adresinin ayarlanması

Uygulamanın backend'e erişebilmesi için `.env` dosyasını çalışma ortamına göre düzenleyin.

### Web

```env
EXPO_PUBLIC_API_URL_WEB=http://localhost:8080
```

### Android Emulator

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
```

### iOS Simulator

```env
EXPO_PUBLIC_API_URL=http://localhost:8080
```

### Gerçek Android veya iPhone

Telefon ve bilgisayar aynı Wi-Fi ağına bağlı olmalıdır. Bilgisayarın yerel IP adresini bulun.

Windows:

```powershell
ipconfig
```

macOS:

```bash
ipconfig getifaddr en0
```

Bulduğunuz IP adresini `.env` dosyasına yazın:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8080
EXPO_PUBLIC_API_URL_WEB=http://localhost:8080
```

Windows Güvenlik Duvarı veya macOS güvenlik ayarlarında Java ve Node.js için yerel ağ erişimine izin verilmelidir.

### İnternette yayınlanan backend

```env
EXPO_PUBLIC_API_URL=https://api.firma.com
EXPO_PUBLIC_API_URL_WEB=https://api.firma.com
```

Üretim ortamında HTTPS kullanılmalıdır.

## Uygulamayı çalıştırma

Expo geliştirme sunucusunu başlatın:

```bash
npx expo start
```

Terminal üzerinden:

- `w`: Web uygulamasını açar.
- `a`: Android emülatörünü açar.
- `i`: iOS Simulator'ı açar (macOS).
- QR kod: Expo Go ile fiziksel cihazda açar.

Ortam değişkeni değiştirildikten sonra önbelleği temizleyerek yeniden başlatın:

```bash
npx expo start --clear
```

Farklı ağdan Expo Go bağlantısı gerekiyorsa:

```bash
npx expo start --clear --tunnel
```

> `--tunnel` yalnızca Expo geliştirme sunucusunu erişilebilir hale getirir. Yerel Spring Boot backend'e mobil internet üzerinden erişmek için backend'in ayrıca güvenli bir HTTPS adresinde yayınlanması veya bir geliştirme tüneli kullanılması gerekir.

## Kullanılabilir komutlar

| Komut | Açıklama |
| --- | --- |
| `npm start` | Expo geliştirme sunucusunu başlatır |
| `npm run web` | Web sürümünü başlatır |
| `npm run android` | Android üzerinde başlatır |
| `npm run ios` | iOS Simulator üzerinde başlatır |
| `npm run typecheck` | TypeScript tip kontrolünü çalıştırır |
| `npm run lint` | Kod kalite kontrolünü çalıştırır |

## Proje yapısı

```text
src/
├── app/
│   ├── (app)/
│   │   ├── index.tsx          # Rol bazlı ana sayfa
│   │   ├── management.tsx     # Kullanıcı, makine ve ürün yönetimi
│   │   ├── production.tsx     # Üretim başlatma ve canlı takip
│   │   ├── sessions.tsx       # Üretim oturumu geçmişi
│   │   ├── reports.tsx        # Filtreleme ve raporlama
│   │   └── profile.tsx        # Profil ve çıkış işlemleri
│   ├── session/[id].tsx       # Oturum ve ürün kayıt detayları
│   ├── login.tsx              # Kullanıcı girişi
│   └── _layout.tsx            # Ana uygulama yerleşimi
├── components/
│   └── ui.tsx                 # Ortak arayüz bileşenleri
├── constants/
│   └── theme.ts               # Renkler ve tasarım sabitleri
├── context/
│   └── AuthContext.tsx        # Oturum, token yenileme ve API istekleri
├── lib/
│   ├── api.ts                 # API adresi ve HTTP istekleri
│   ├── storage.ts             # Web ve mobil token saklama
│   ├── reportPdf.ts           # Ortak PDF HTML şablonu
│   ├── webPdf.ts              # Web PDF indirme işlemi
│   └── format.ts              # Tarih ve metin biçimlendirme
└── types/
    └── api.ts                 # API veri tipleri
```

## Kimlik doğrulama akışı

1. Kullanıcı, kullanıcı adı ve parolasıyla `/api/auth/login` endpoint'ine istek gönderir.
2. Backend access token ve refresh token döndürür.
3. Mobil uygulama tokenları `SecureStore`, web uygulaması tarayıcı depolaması içinde saklar.
4. Yetkili API isteklerinde access token `Authorization: Bearer <token>` başlığıyla gönderilir.
5. Access token geçersiz olduğunda refresh token ile yeni token alınır ve istek yeniden gerçekleştirilir.
6. Kullanıcının rolüne göre yönetici veya operatör ekranları gösterilir.

Frontend'deki rol kontrolü kullanıcı deneyimini düzenler; asıl yetki kontrolü Spring Security tarafından backend tarafında gerçekleştirilir.

## Raporlama ve PDF

Rapor ekranında tarih, makine, ürün, operatör ve üretim oturumu filtreleri birlikte kullanılabilir. Backend'den alınan sonuçlar ürün dağılımı, makine dağılımı, toplam üretim ve oturum detayları halinde gösterilir.

- Mobilde `expo-print` ile PDF oluşturulur ve `expo-sharing` ile paylaşılır.
- Webde ortak HTML/CSS rapor şablonu `html2pdf.js` ile dosya olarak indirilir.
- Her iki platform aynı veri sırasını ve rapor tasarımını kullanır.

## Sorun giderme

### Mobil cihazda veriler gelmiyor

- `.env` içinde `localhost` yerine bilgisayarın yerel IP adresini kullanın.
- Telefon ve bilgisayarın aynı Wi-Fi ağında olduğunu doğrulayın.
- Backend'in `0.0.0.0:8080` üzerinden bağlantı kabul ettiğini kontrol edin.
- Güvenlik duvarında `8080` portuna izin verin.
- Expo'yu `npx expo start --clear` ile yeniden başlatın.

### Web çalışıyor ancak telefon backend'e bağlanamıyor

Web için `localhost`, telefon için bilgisayarın yerel IP adresi kullanılmalıdır:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8080
EXPO_PUBLIC_API_URL_WEB=http://localhost:8080
```

### `401 Unauthorized`

Token eksik veya süresi dolmuş olabilir. Uygulamadan çıkış yapıp yeniden giriş yapın. Backend ile istemcinin aynı ortamı kullandığını doğrulayın.

### `403 Forbidden`

Kullanıcı rolünün istenen endpoint için yeterli olmadığını gösterir. Yönetici işlemleri için `ADMIN`, üretim işlemleri için `ADMIN` veya `OPERATOR` yetkisi gerekir.

### Expo hesabı uyarısı

Kaynak kod belirli bir Expo hesabına bağlı değildir. EAS Build veya tunnel özelliği kullanılacaksa firma kendi Expo hesabıyla giriş yapabilir:

```bash
npx expo login
```

Yerel ağda geliştirme için:

```bash
npx expo start --lan
```

## Güvenlik

- Gerçek `.env` dosyası Git repository'sine eklenmemelidir.
- Veritabanı parolası, JWT secret ve simülatör anahtarı frontend içinde tutulmamalıdır.
- Mobil veya web istemcisi Supabase'e doğrudan bağlanmamalıdır.
- Üretim API'si HTTPS üzerinden yayınlanmalıdır.
- Yetkilendirme kontrolleri yalnızca arayüzde değil backend tarafında uygulanmalıdır.

## Backend ve simülatör

Uygulamanın tam çalışması için aşağıdaki servislerin açık olması gerekir:

1. Spring Boot backend
2. Supabase PostgreSQL bağlantısı
3. Aktif üretim sırasında Python makine simülatörü
4. Expo mobil/web istemcisi

Backend ve simülatörün kurulum bilgileri backend repository'sindeki dokümantasyonda yer almalıdır.

## Teslim notu

İlk kurulumda kendi backend adresini `.env` dosyasına tanımlamalısınız ve gerekiyorsa kendi Expo/EAS hesabıyla projeyi ilişkilendirmelisiniz. Kaynak kod belirli bir geliştirici Expo hesabına veya EAS proje kimliğine bağlı değildir.

## Lisans

Lisans koşulları için [`LICENSE`](LICENSE) dosyasını inceleyin.
