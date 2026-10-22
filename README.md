# 🐣 Masaüstü Arkadaşım

Mac masaüstünde yaşayan, beslenebilen, birlikte kitap okuyup müzik dinleyen ve yazışarak sohbet eden minik arkadaş.

## İndir

**[Releases](../../releases/latest)** sayfasından en son `Arkadasim-mac.zip` dosyasını indir (Apple çipli Mac'ler için).

1. Zip'e çift tıkla, çıkan **Arkadasim** uygulamasını **Uygulamalar** klasörüne sürükle.
2. İlk açılışta Mac uyarı verirse: **Sistem Ayarları → Gizlilik ve Güvenlik → Yine de Aç**.
3. Ayarlar'dan bir fotoğraf/çizim yükle; arka planı yapay zekâ siler, o da masaüstüne yerleşir.

## Neler yapabiliyor

- Sürükle-bırak, ekranın altında gezinme, göz kırpma, nefes alma
- Besleme, kalp yakalama oyunu, okuma/çalışma zamanlayıcısı, müzik modu, uyku
- Tokluk / mutluluk / enerji; acıkınca ve sıkılınca kendisi söyler
- Cihazda çalışan küçük yapay zekâ ile Türkçe sohbet (ilk açılışta bir kez iner)
- Her hâl için ayrı çizim yükleme, kulaklık/kitap süslerini yerleştirme

## Geliştirme

```
npm install
npm start          # çalıştır
npm run build:mac  # out/ klasörüne Mac uygulaması üretir
```

Uygulama kodu `app/` klasöründe. Arka plan silme: @imgly/background-removal (AGPL-3.0). Sohbet: @mlc-ai/web-llm.
