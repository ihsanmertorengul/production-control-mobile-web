# Üretim Kontrol – Expo Mobil ve Web

Spring Boot üretim kontrol backend'i için Expo Router + TypeScript arayüzü.

## Hazır özellikler

- Yönetici ve operatör girişi
- Access/refresh token yenileme
- Native cihazlarda güvenli token saklama
- Oturumu açık tut
- Rol bazlı ana sayfa
- Yönetici için makine, ürün, kontrol özelliği ve kullanıcı oluşturma ekranı
- Ürünleri bir veya birden fazla makineyle eşleştirme
- Makine ve ürün seçerek üretim başlatma
- Aktif üretimi 3 saniyede bir yenileme
- Üretimi erken durdurma
- Operatörün kendi oturumlarını ve ürün kayıtlarını görüntülemesi
- Yöneticinin sistem özetini ve tüm oturumları görmesi
- Ürün/makine bazlı yetkiye uygun raporlar
- PDF raporu oluşturma ve sistem paylaşım menüsüyle gönderme
- Üretim tamamlandığında cihaz bildirimi
- Android, iOS ve web desteği

## 1. Gereksinimler

- Node.js LTS
- Bilgisayarda çalışan Spring Boot backend (`8080`)
- Gerçek telefon testi için Expo Go

## 2. Kurulum

Proje klasöründe terminal aç:

```powershell
npm install
```

`.env.example` dosyasını `.env` olarak kopyala:

```powershell
copy .env.example .env
```

## 3. Backend adresi

### Web veya iOS Simulator

```env
EXPO_PUBLIC_API_URL=http://localhost:8080
```

### Android Emulator

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
```

### Gerçek Android/iPhone

Telefon ve bilgisayar aynı Wi-Fi ağına bağlı olmalıdır. Windows terminalinde:

```powershell
ipconfig
```

Wi-Fi bölümündeki `IPv4 Address` değerini `.env` dosyasına yaz. Örnek:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.34:8080
```

Bilgisayarın IP adresi değişirse `.env` dosyasını da güncelle.

## 4. Çalıştırma

Backend ve `simulator/fake_machine.py` açıkken:

```powershell
npx expo start
```

- Telefonda: Expo Go ile QR kodu okut.
- Web'de: terminal açıkken `w` tuşuna bas.
- Android Emulator: `a` tuşuna bas.

`.env` değiştiğinde Expo'yu kapatıp önbelleği temizleyerek aç:

```powershell
npx expo start -c
```

## Bağlantı sorunu olursa

1. Backend'in `http://localhost:8080` üzerinde çalıştığını Postman ile doğrula.
2. Telefon ve bilgisayarın aynı Wi-Fi ağında olduğundan emin ol.
3. `.env` içinde `localhost` yerine bilgisayarın IPv4 adresini kullan.
4. Windows Güvenlik Duvarı sorarsa Java ve Node.js için özel ağ erişimine izin ver.
5. URL'nin sonunda boşluk, `/` veya satır sonu bulunmadığından emin ol.
