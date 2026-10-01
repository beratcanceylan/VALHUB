import type { AppLocale } from "@valhub/domain";

/**
 * Privacy policy and terms of use. Written against what the app actually does (see
 * docs/product.md); update both language versions whenever data handling changes. Locales
 * without a translation show the English text, which is the governing version.
 */
export interface LegalSection {
  heading: string;
  body: string;
}

export type LegalDocumentId = "privacy" | "terms";

export const LEGAL_EFFECTIVE_DATE = "2026-10-01";

const en: Record<LegalDocumentId, LegalSection[]> = {
  privacy: [
    {
      heading: "Summary",
      body: "VALHUB runs entirely on your phone. There is no VALHUB server and no VALHUB account. We do not sell, share or receive your personal data.",
    },
    {
      heading: "What is stored on your phone",
      body: "Favorites, saved crosshairs, strategy boards, reaction-drill history, your settings and a size-limited cache of downloaded content are kept in the app's local database. If you sign in with Riot, the sign-in tokens are kept in the operating system's secure storage (Keychain on iOS, Keystore-backed storage on Android). None of this is copied anywhere else by VALHUB.",
    },
    {
      heading: "Riot sign-in",
      body: "Signing in is optional and happens on Riot's own sign-in page inside the app. VALHUB never sees or stores your password. With your tokens the app reads your profile, store, match history and leaderboard data directly from Riot and only shows it to you. Tokens expire on their own; signing out deletes them from the phone.",
    },
    {
      heading: "Content sources",
      body: "Game reference content and media are fetched while you use the app from valorant-api.com, playvalorant.com, the VALORANT wiki (wiki.playvalorant.com) and Riot's public status service. These services receive the ordinary technical data of any web request, such as your IP address, under their own privacy policies. Videos are streamed and never saved.",
    },
    {
      heading: "Usage analytics",
      body: "The app records a small set of anonymous events (for example which screen was opened or that a search returned results), never tokens, identifiers, match payloads or what you type. In this version these events are not sent off the phone. You can turn them off at any time in Settings › Privacy & data.",
    },
    {
      heading: "Notifications",
      body: "Store and training reminders are scheduled locally on your phone and only after you turn them on. No push service receives your data.",
    },
    {
      heading: "Deleting your data",
      body: "Clear the cache in Settings › Storage & cache, remove saved items from the Library, sign out from the Account tab, or uninstall the app to remove everything it stored.",
    },
    {
      heading: "Children",
      body: "VALHUB is a companion to VALORANT and follows the same age requirements as Riot's services. It does not knowingly collect data from anyone.",
    },
    {
      heading: "Changes",
      body: "If the way VALHUB handles data changes, this policy is updated in the app before the change takes effect, with a new effective date.",
    },
  ],
  terms: [
    {
      heading: "About VALHUB",
      body: "VALHUB is an unofficial fan-made companion for VALORANT. It is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.",
    },
    {
      heading: "Using the app",
      body: "You may use VALHUB for personal, non-commercial purposes. Do not use it to break Riot's Terms of Service, to access accounts that are not yours, or to interfere with Riot's or any content provider's services.",
    },
    {
      heading: "Your Riot account",
      body: "Account features use Riot's sign-in and Riot's game-client services, which are not an official public API and can change or stop working at any time. Your use of your Riot account remains subject to Riot's own terms. You are responsible for the security of your device.",
    },
    {
      heading: "Content",
      body: "Game content and media belong to Riot Games. Callout data comes from the VALORANT wiki under CC BY-SA 3.0. Crosshairs, strategies and other items you create stay on your phone and are yours.",
    },
    {
      heading: "No warranty",
      body: "VALHUB is provided as is. Content can be missing, outdated or wrong, and features that depend on third-party services may be unavailable. Use stats and tools as guidance, not as guarantees.",
    },
    {
      heading: "Liability",
      body: "To the extent the law allows, the makers of VALHUB are not liable for losses arising from use of the app, including account actions taken by Riot.",
    },
    {
      heading: "Changes",
      body: "These terms can be updated with new versions of the app. The effective date at the top shows the current version; continuing to use the app means you accept it.",
    },
  ],
};

const tr: Record<LegalDocumentId, LegalSection[]> = {
  privacy: [
    {
      heading: "Özet",
      body: "VALHUB tamamen telefonunda çalışır. VALHUB sunucusu ve VALHUB hesabı yoktur. Kişisel verilerini satmayız, paylaşmayız ve almayız.",
    },
    {
      heading: "Telefonunda saklananlar",
      body: "Favoriler, kayıtlı nişangâhlar, strateji tahtaları, refleks çalışması geçmişi, ayarların ve boyutu sınırlı bir içerik önbelleği uygulamanın yerel veritabanında tutulur. Riot ile giriş yaparsan giriş anahtarların işletim sisteminin güvenli deposunda (iOS'ta Anahtar Zinciri, Android'de Keystore destekli depolama) saklanır. VALHUB bunların hiçbirini başka bir yere kopyalamaz.",
    },
    {
      heading: "Riot ile giriş",
      body: "Giriş isteğe bağlıdır ve uygulama içinde Riot'un kendi giriş sayfasında yapılır. VALHUB şifreni hiçbir zaman görmez ve saklamaz. Uygulama anahtarlarınla profil, mağaza, maç geçmişi ve sıralama verilerini doğrudan Riot'tan okur ve yalnızca sana gösterir. Anahtarların süresi kendiliğinden dolar; çıkış yapmak onları telefondan siler.",
    },
    {
      heading: "İçerik kaynakları",
      body: "Oyun başvuru içeriği ve medya, uygulamayı kullanırken valorant-api.com, playvalorant.com, VALORANT wiki (wiki.playvalorant.com) ve Riot'un herkese açık durum servisinden alınır. Bu servisler her web isteğinde olduğu gibi IP adresin gibi olağan teknik verileri kendi gizlilik politikaları kapsamında alır. Videolar akış olarak oynatılır ve hiç kaydedilmez.",
    },
    {
      heading: "Kullanım analitiği",
      body: "Uygulama az sayıda anonim olay kaydeder (örneğin hangi ekranın açıldığı ya da bir aramanın sonuç verdiği); anahtar, kimlik, maç verisi veya yazdıkların asla kaydedilmez. Bu sürümde bu olaylar telefondan dışarı gönderilmez. İstediğin zaman Ayarlar › Gizlilik ve veriler bölümünden kapatabilirsin.",
    },
    {
      heading: "Bildirimler",
      body: "Mağaza ve antrenman hatırlatıcıları yalnızca sen açtığında, telefonunda yerel olarak planlanır. Hiçbir bildirim servisi verini almaz.",
    },
    {
      heading: "Verilerini silmek",
      body: "Ayarlar › Depolama ve önbellek bölümünden önbelleği temizleyebilir, Kitaplık'tan kayıtlı öğeleri kaldırabilir, Hesap sekmesinden çıkış yapabilir ya da uygulamayı silerek sakladığı her şeyi kaldırabilirsin.",
    },
    {
      heading: "Çocuklar",
      body: "VALHUB bir VALORANT yardımcısıdır ve Riot servisleriyle aynı yaş koşullarına uyar. Kimseden bilerek veri toplamaz.",
    },
    {
      heading: "Değişiklikler",
      body: "VALHUB'ın verileri işleme şekli değişirse bu politika, değişiklik yürürlüğe girmeden önce uygulama içinde yeni bir yürürlük tarihiyle güncellenir.",
    },
  ],
  terms: [
    {
      heading: "VALHUB hakkında",
      body: "VALHUB, VALORANT için resmi olmayan, hayranlar tarafından yapılmış bir yardımcı uygulamadır. Riot Games tarafından onaylanmamıştır ve Riot Games'in ya da Riot Games mülklerinin üretimi veya yönetiminde resmi olarak yer alan kimsenin görüşlerini yansıtmaz. Riot Games ve ilgili tüm mülkler Riot Games, Inc.'in ticari markaları veya tescilli ticari markalarıdır.",
    },
    {
      heading: "Uygulamanın kullanımı",
      body: "VALHUB'ı kişisel ve ticari olmayan amaçlarla kullanabilirsin. Riot'un Hizmet Şartları'nı ihlal etmek, sana ait olmayan hesaplara erişmek ya da Riot'un veya herhangi bir içerik sağlayıcının servislerine müdahale etmek için kullanma.",
    },
    {
      heading: "Riot hesabın",
      body: "Hesap özellikleri Riot'un girişini ve Riot'un oyun istemcisi servislerini kullanır; bunlar resmi bir herkese açık API değildir ve her an değişebilir veya çalışmayı durdurabilir. Riot hesabını kullanman Riot'un kendi şartlarına tabidir. Cihazının güvenliğinden sen sorumlusun.",
    },
    {
      heading: "İçerik",
      body: "Oyun içeriği ve medya Riot Games'e aittir. Bölge adı verileri CC BY-SA 3.0 lisansıyla VALORANT wiki'den gelir. Oluşturduğun nişangâhlar, stratejiler ve diğer öğeler telefonunda kalır ve sana aittir.",
    },
    {
      heading: "Garanti yoktur",
      body: "VALHUB olduğu gibi sunulur. İçerik eksik, eski veya hatalı olabilir; üçüncü taraf servislere bağlı özellikler kullanılamayabilir. İstatistikleri ve araçları garanti değil, yol gösterici olarak kullan.",
    },
    {
      heading: "Sorumluluk",
      body: "Yasaların izin verdiği ölçüde VALHUB'ı yapanlar, Riot'un hesaplar üzerinde aldığı işlemler dahil, uygulamanın kullanımından doğan kayıplardan sorumlu değildir.",
    },
    {
      heading: "Değişiklikler",
      body: "Bu şartlar uygulamanın yeni sürümleriyle güncellenebilir. Üstteki yürürlük tarihi geçerli sürümü gösterir; uygulamayı kullanmaya devam etmen onu kabul ettiğin anlamına gelir.",
    },
  ],
};

const DOCUMENTS: Partial<Record<AppLocale, Record<LegalDocumentId, LegalSection[]>>> = { en, tr };

export function legalDocument(locale: AppLocale, id: LegalDocumentId): LegalSection[] {
  return (DOCUMENTS[locale] ?? en)[id];
}
