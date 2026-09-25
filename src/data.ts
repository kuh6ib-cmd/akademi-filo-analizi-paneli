export type AnaTur = 'BOSCH' | 'DIGER' | 'YAG' | 'ISCILIK';
export type IslemTuru = 'Bakım' | 'Arıza' | 'Hasar' | 'Dış İşçilikler';
export type GarantiDurumu = 'Garanti İçi' | 'Garanti Dışı';

export interface ProcessedRecord {
  satirNo: number;
  ypTipi: string;
  anaTur?: AnaTur;
  anaTurAd?: string;
  islemTuru?: IslemTuru;
  orijinalKodAd: string;
  normalizeAd: string;
  eslesenKatalog: string;
  seviye1: string;
  seviye2: string;
  isBosch: boolean;
  isDiger?: boolean;
  isYag?: boolean;
  isIscilik?: boolean;
  plaka?: string;
  aracMarka?: string;
  aracModel?: string;
  modelYili?: number;
  islemYili?: number;
  aracYasi?: number;
  garantiDurumu?: GarantiDurumu;
  garantiNedeni?: string;
  filoAdi?: string;
  servisIsmi?: string;
  ph3Code?: string;
  ph3Type?: string;
  km?: number;
  tutar?: number;
}

export const processedData: ProcessedRecord[] = [
  { satirNo: 1, ypTipi: "BOSCH", anaTur: "BOSCH", anaTurAd: "Bosch Parçası", islemTuru: "Arıza", orijinalKodAd: "0986479000", normalizeAd: "-", eslesenKatalog: "Fren Diski", ph3Type: "Fren Diski", ph3Code: "PH3-098", seviye1: "Fren Sistemleri", seviye2: "Disk ve Balatalar", isBosch: true, isDiger: false, isYag: false, isIscilik: false, plaka: "34 ABC 01", aracMarka: "Renault", aracModel: "Clio", modelYili: 2023, islemYili: 2024, aracYasi: 1, garantiDurumu: "Garanti İçi", garantiNedeni: "1 Yaşında (≤3 Yıl) ve 45.200 KM (≤100.000 KM)", filoAdi: "Merkez Filo", servisIsmi: "Bosch Car Service Oto", km: 45200, tutar: 2450 },
  { satirNo: 2, ypTipi: "BOSCH", anaTur: "BOSCH", anaTurAd: "Bosch Parçası", islemTuru: "Bakım", orijinalKodAd: "3397007120", normalizeAd: "-", eslesenKatalog: "Silecek Süpürgesi", ph3Type: "Silecek Süpürgesi", ph3Code: "PH3-339", seviye1: "Görüş Sistemleri", seviye2: "Silecekler", isBosch: true, isDiger: false, isYag: false, isIscilik: false, plaka: "34 ABC 02", aracMarka: "Ford", aracModel: "Focus", modelYili: 2021, islemYili: 2024, aracYasi: 3, garantiDurumu: "Garanti İçi", garantiNedeni: "3 Yaşında (≤3 Yıl) ve 98.400 KM (≤100.000 KM)", filoAdi: "Merkez Filo", servisIsmi: "Bosch Car Service Oto", km: 98400, tutar: 750 },
  { satirNo: 3, ypTipi: "VALEO", anaTur: "DIGER", anaTurAd: "Diğer Parça", islemTuru: "Bakım", orijinalKodAd: "Valeo Silecek Takımı", normalizeAd: "silecek takımı", eslesenKatalog: "Silecek Takımı", ph3Type: "Silecek Takımı", ph3Code: "PH3-VAL-01", seviye1: "Görüş Sistemleri", seviye2: "Silecekler", isBosch: false, isDiger: true, isYag: false, isIscilik: false, plaka: "06 DEF 34", aracMarka: "Fiat", aracModel: "Egea", modelYili: 2023, islemYili: 2024, aracYasi: 1, garantiDurumu: "Garanti İçi", garantiNedeni: "1 Yaşında (≤3 Yıl) ve 62.100 KM (≤100.000 KM)", filoAdi: "Ankara Filo", servisIsmi: "Özel Oto Servis", km: 62100, tutar: 680 },
  { satirNo: 4, ypTipi: "MANN", anaTur: "DIGER", anaTurAd: "Diğer Parça", islemTuru: "Bakım", orijinalKodAd: "Hava Filtresi Mann", normalizeAd: "hava filtresi", eslesenKatalog: "Hava Filtresi", ph3Type: "Hava Filtresi", ph3Code: "PH3-MNN-02", seviye1: "Filtre Sistemleri", seviye2: "Motor Filtreleri", isBosch: false, isDiger: true, isYag: false, isIscilik: false, plaka: "35 GHI 56", aracMarka: "Renault", aracModel: "Megane", modelYili: 2019, islemYili: 2024, aracYasi: 5, garantiDurumu: "Garanti Dışı", garantiNedeni: "Hem Yaş (>3 Yıl: 5 Yaş) Hem KM (>100.000 KM: 135.000 KM) Aşıldı", filoAdi: "İzmir Filo", servisIsmi: "Ege Oto Bakım", km: 135000, tutar: 520 },
  { satirNo: 5, ypTipi: "MOTOR YAĞI", anaTur: "YAG", anaTurAd: "Motor Yağı", islemTuru: "Bakım", orijinalKodAd: "Castrol Edge 5W-30 4Lt", normalizeAd: "castrol edge 5w30", eslesenKatalog: "Castrol Edge 5W-30 Tam Sentetik Motor Yağı", ph3Type: "5W-30 Motor Yağı", ph3Code: "OIL-5W30", seviye1: "Madeni Yağlar & Sıvılar", seviye2: "Tam Sentetik Motor Yağı", isBosch: false, isDiger: false, isYag: true, isIscilik: false, plaka: "34 ABC 01", aracMarka: "Renault", aracModel: "Clio", modelYili: 2023, islemYili: 2024, aracYasi: 1, garantiDurumu: "Garanti İçi", garantiNedeni: "1 Yaşında (≤3 Yıl) ve 45.200 KM (≤100.000 KM)", filoAdi: "Merkez Filo", servisIsmi: "Bosch Car Service Oto", km: 45200, tutar: 1650 },
  { satirNo: 6, ypTipi: "MOTOR YAĞI", anaTur: "YAG", anaTurAd: "Motor Yağı", islemTuru: "Bakım", orijinalKodAd: "Mobil Super 3000 5W-40", normalizeAd: "mobil super 5w40", eslesenKatalog: "Mobil Super 5W-40 Motor Yağı", ph3Type: "5W-40 Motor Yağı", ph3Code: "OIL-5W40", seviye1: "Madeni Yağlar & Sıvılar", seviye2: "Tam Sentetik Motor Yağı", isBosch: false, isDiger: false, isYag: true, isIscilik: false, plaka: "34 ABC 02", aracMarka: "Ford", aracModel: "Focus", modelYili: 2021, islemYili: 2024, aracYasi: 3, garantiDurumu: "Garanti İçi", garantiNedeni: "3 Yaşında (≤3 Yıl) ve 98.400 KM (≤100.000 KM)", filoAdi: "Merkez Filo", servisIsmi: "Özel Oto Servis", km: 98400, tutar: 1550 },
  { satirNo: 7, ypTipi: "İŞÇİLİK", anaTur: "ISCILIK", anaTurAd: "İşçilik", islemTuru: "Bakım", orijinalKodAd: "Periyodik Bakım İşçiliği 15.000 KM", normalizeAd: "periyodik bakım işçiliği", eslesenKatalog: "Periyodik Bakım İşçiliği", ph3Type: "Periyodik Bakım", ph3Code: "LAB-PRY-01", seviye1: "İşçilik ve Bakım Hizmetleri", seviye2: "Periyodik Bakım İşçiliği", isBosch: false, isDiger: false, isYag: false, isIscilik: true, plaka: "34 ABC 01", aracMarka: "Renault", aracModel: "Clio", modelYili: 2023, islemYili: 2024, aracYasi: 1, garantiDurumu: "Garanti İçi", garantiNedeni: "1 Yaşında (≤3 Yıl) ve 45.200 KM (≤100.000 KM)", filoAdi: "Merkez Filo", servisIsmi: "Bosch Car Service Oto", km: 45200, tutar: 2800 },
  { satirNo: 8, ypTipi: "İŞÇİLİK", anaTur: "ISCILIK", anaTurAd: "İşçilik", islemTuru: "Arıza", orijinalKodAd: "Ön Fren Balata Değişim İşçiliği", normalizeAd: "ön fren balata değişim işçiliği", eslesenKatalog: "Fren Sistemi Değişim İşçiliği", ph3Type: "Fren İşçiliği", ph3Code: "LAB-FRN-02", seviye1: "İşçilik ve Bakım Hizmetleri", seviye2: "Fren Sistemi İşçiliği", isBosch: false, isDiger: false, isYag: false, isIscilik: true, plaka: "06 DEF 34", aracMarka: "Fiat", aracModel: "Egea", modelYili: 2023, islemYili: 2024, aracYasi: 1, garantiDurumu: "Garanti İçi", garantiNedeni: "1 Yaşında (≤3 Yıl) ve 62.100 KM (≤100.000 KM)", filoAdi: "Ankara Filo", servisIsmi: "Özel Oto Servis", km: 62100, tutar: 1850 },
  { satirNo: 9, ypTipi: "İŞÇİLİK", anaTur: "ISCILIK", anaTurAd: "İşçilik", islemTuru: "Dış İşçilikler", orijinalKodAd: "Ön Düzen Rot & Balans Ayarı Dış Atölye", normalizeAd: "rot balans ayarı dış atölye", eslesenKatalog: "Rot Balans Ayar Hizmeti", ph3Type: "Rot Balans Ayarı", ph3Code: "LAB-ROT-01", seviye1: "İşçilik ve Bakım Hizmetleri", seviye2: "Rot & Balans İşçiliği", isBosch: false, isDiger: false, isYag: false, isIscilik: true, plaka: "35 GHI 56", aracMarka: "Renault", aracModel: "Megane", modelYili: 2019, islemYili: 2024, aracYasi: 5, garantiDurumu: "Garanti Dışı", garantiNedeni: "Hem Yaş (>3 Yıl: 5 Yaş) Hem KM (>100.000 KM: 135.000 KM) Aşıldı", filoAdi: "İzmir Filo", servisIsmi: "Ege Oto Bakım", km: 135000, tutar: 1400 },
  { satirNo: 10, ypTipi: "BOSCH", anaTur: "BOSCH", anaTurAd: "Bosch Parçası", islemTuru: "Arıza", orijinalKodAd: "0445110190", normalizeAd: "-", eslesenKatalog: "Enjektör", ph3Type: "Enjektör", ph3Code: "PH3-044", seviye1: "Yakıt Sistemleri", seviye2: "Enjeksiyon", isBosch: true, isDiger: false, isYag: false, isIscilik: false, plaka: "34 ABC 02", aracMarka: "Ford", aracModel: "Focus", modelYili: 2021, islemYili: 2024, aracYasi: 3, garantiDurumu: "Garanti İçi", garantiNedeni: "3 Yaşında (≤3 Yıl) ve 98.400 KM (≤100.000 KM)", filoAdi: "Merkez Filo", servisIsmi: "Bosch Car Service Oto", km: 98400, tutar: 12800 },
  { satirNo: 11, ypTipi: "İŞÇİLİK", anaTur: "ISCILIK", anaTurAd: "İşçilik", islemTuru: "Hasar", orijinalKodAd: "Ön Tampon Onarım & Fırın Boya İşçiliği", normalizeAd: "ön tampon onarım fırın boya", eslesenKatalog: "Kaporta & Boya Onarım Hizmeti", ph3Type: "Hasar Onarımı", ph3Code: "LAB-HSR-01", seviye1: "Kaporta & Boya Hizmetleri", seviye2: "Hasar ve Kaporta Onarımı", isBosch: false, isDiger: false, isYag: false, isIscilik: true, plaka: "34 ABC 01", aracMarka: "Renault", aracModel: "Clio", modelYili: 2023, islemYili: 2024, aracYasi: 1, garantiDurumu: "Garanti İçi", garantiNedeni: "1 Yaşında (≤3 Yıl) ve 45.200 KM (≤100.000 KM)", filoAdi: "Merkez Filo", servisIsmi: "Bosch Car Service Oto", km: 45200, tutar: 8400 },
  { satirNo: 12, ypTipi: "İŞÇİLİK", anaTur: "ISCILIK", anaTurAd: "İşçilik", islemTuru: "Dış İşçilikler", orijinalKodAd: "Fren Disk Tornalama Dış Taşeron Hizmeti", normalizeAd: "fren disk tornalama dış taşeron", eslesenKatalog: "Disk Tornalama Hizmeti", ph3Type: "Torna Hizmeti", ph3Code: "LAB-TRN-01", seviye1: "Dış Servis ve Taşeron", seviye2: "Mekanik Torna", isBosch: false, isDiger: false, isYag: false, isIscilik: true, plaka: "06 DEF 34", aracMarka: "Fiat", aracModel: "Egea", modelYili: 2023, islemYili: 2024, aracYasi: 1, garantiDurumu: "Garanti İçi", garantiNedeni: "1 Yaşında (≤3 Yıl) ve 62.100 KM (≤100.000 KM)", filoAdi: "Ankara Filo", servisIsmi: "Özel Oto Servis", km: 62100, tutar: 1250 },
  { satirNo: 13, ypTipi: "BOSCH", anaTur: "BOSCH", anaTurAd: "Bosch Parçası", islemTuru: "Bakım", orijinalKodAd: "F026407000", normalizeAd: "-", eslesenKatalog: "Yağ Filtresi", ph3Type: "Yağ Filtresi", ph3Code: "PH3-F02", seviye1: "Filtre Sistemleri", seviye2: "Motor Filtreleri", isBosch: true, isDiger: false, isYag: false, isIscilik: false, plaka: "34 VOL 99", aracMarka: "Volkswagen", aracModel: "Passat", modelYili: 2024, islemYili: 2024, aracYasi: 0, garantiDurumu: "Garanti İçi", garantiNedeni: "0 Yaşında (≤3 Yıl) ve 18.500 KM (≤100.000 KM)", filoAdi: "Atlas Lojistik", servisIsmi: "Bosch Car Service Oto", km: 18500, tutar: 950 },
  { satirNo: 14, ypTipi: "MOTOR YAĞI", anaTur: "YAG", anaTurAd: "Motor Yağı", islemTuru: "Bakım", orijinalKodAd: "Castrol Edge 5W-30 LL 4Lt", normalizeAd: "castrol edge 5w30", eslesenKatalog: "Castrol Edge 5W-30 Tam Sentetik Motor Yağı", ph3Type: "5W-30 Motor Yağı", ph3Code: "OIL-5W30", seviye1: "Madeni Yağlar & Sıvılar", seviye2: "Tam Sentetik Motor Yağı", isBosch: false, isDiger: false, isYag: true, isIscilik: false, plaka: "34 VOL 99", aracMarka: "Volkswagen", aracModel: "Passat", modelYili: 2024, islemYili: 2024, aracYasi: 0, garantiDurumu: "Garanti İçi", garantiNedeni: "0 Yaşında (≤3 Yıl) ve 18.500 KM (≤100.000 KM)", filoAdi: "Atlas Lojistik", servisIsmi: "Bosch Car Service Oto", km: 18500, tutar: 2100 },
  { satirNo: 15, ypTipi: "İŞÇİLİK", anaTur: "ISCILIK", anaTurAd: "İşçilik", islemTuru: "Bakım", orijinalKodAd: "İlk 15.000 KM Bakım İşçiliği", normalizeAd: "bakım işçiliği", eslesenKatalog: "Periyodik Bakım İşçiliği", ph3Type: "Periyodik Bakım", ph3Code: "LAB-PRY-01", seviye1: "İşçilik ve Bakım Hizmetleri", seviye2: "Periyodik Bakım İşçiliği", isBosch: false, isDiger: false, isYag: false, isIscilik: true, plaka: "34 VOL 99", aracMarka: "Volkswagen", aracModel: "Passat", modelYili: 2024, islemYili: 2024, aracYasi: 0, garantiDurumu: "Garanti İçi", garantiNedeni: "0 Yaşında (≤3 Yıl) ve 18.500 KM (≤100.000 KM)", filoAdi: "Atlas Lojistik", servisIsmi: "Bosch Car Service Oto", km: 18500, tutar: 3200 },
  { satirNo: 16, ypTipi: "BOSCH", anaTur: "BOSCH", anaTurAd: "Bosch Parçası", islemTuru: "Bakım", orijinalKodAd: "0986479001", normalizeAd: "-", eslesenKatalog: "Fren Balatası", ph3Type: "Fren Balatası", ph3Code: "PH3-098B", seviye1: "Fren Sistemleri", seviye2: "Disk ve Balatalar", isBosch: true, isDiger: false, isYag: false, isIscilik: false, plaka: "34 TOY 77", aracMarka: "Toyota", aracModel: "Corolla", modelYili: 2023, islemYili: 2024, aracYasi: 1, garantiDurumu: "Garanti İçi", garantiNedeni: "1 Yaşında (≤3 Yıl) ve 32.400 KM (≤100.000 KM)", filoAdi: "Hedef Filo", servisIsmi: "Bosch Car Service Oto", km: 32400, tutar: 1850 },
  { satirNo: 17, ypTipi: "İŞÇİLİK", anaTur: "ISCILIK", anaTurAd: "İşçilik", islemTuru: "Arıza", orijinalKodAd: "Amortisör Değişimi İşçiliği", normalizeAd: "amortisör değişimi", eslesenKatalog: "Amortisör Değişimi", ph3Type: "Mekanik İşçilik", ph3Code: "LAB-SUS-01", seviye1: "İşçilik ve Bakım Hizmetleri", seviye2: "Süspansiyon İşçiliği", isBosch: false, isDiger: false, isYag: false, isIscilik: true, plaka: "34 TOY 77", aracMarka: "Toyota", aracModel: "Corolla", modelYili: 2023, islemYili: 2024, aracYasi: 1, garantiDurumu: "Garanti İçi", garantiNedeni: "1 Yaşında (≤3 Yıl) ve 32.400 KM (≤100.000 KM)", filoAdi: "Hedef Filo", servisIsmi: "Bosch Car Service Oto", km: 32400, tutar: 2200 },
  { satirNo: 18, ypTipi: "MONROE", anaTur: "DIGER", anaTurAd: "Diğer Parça", islemTuru: "Arıza", orijinalKodAd: "Monroe Ön Amortisör Sol", normalizeAd: "amortisör", eslesenKatalog: "Ön Amortisör", ph3Type: "Amortisör", ph3Code: "PH3-MON-01", seviye1: "Yürüyen Aksam", seviye2: "Süspansiyon", isBosch: false, isDiger: true, isYag: false, isIscilik: false, plaka: "06 HYU 88", aracMarka: "Hyundai", aracModel: "i20", modelYili: 2020, islemYili: 2024, aracYasi: 4, garantiDurumu: "Garanti Dışı", garantiNedeni: "Hem Yaş (>3 Yıl: 4 Yaş) Hem KM (>100.000 KM: 112.000 KM) Aşıldı", filoAdi: "Ankara Filo", servisIsmi: "Özel Oto Servis", km: 112000, tutar: 3400 }
];

export const servisData = [
  { servis: 'Bosch Car Service Oto', total: 5, bosch: 3, diger: 0, yag: 1, iscilik: 1, topItems: [{ name: 'Fren Diski', count: 1 }, { name: 'Enjektör', count: 1 }, { name: '5W-30 Motor Yağı', count: 1 }, { name: 'Periyodik Bakım İşçiliği', count: 1 }] },
  { servis: 'Özel Oto Servis', total: 3, bosch: 0, diger: 1, yag: 1, iscilik: 1, topItems: [{ name: 'Silecek Takımı', count: 1 }, { name: '5W-40 Motor Yağı', count: 1 }, { name: 'Fren İşçiliği', count: 1 }] },
  { servis: 'Ege Oto Bakım', total: 2, bosch: 0, diger: 1, yag: 0, iscilik: 1, topItems: [{ name: 'Hava Filtresi', count: 1 }, { name: 'Rot Balans Ayarı', count: 1 }] }
];

export const hierarchicalData = {
  name: "Tüm Hizmet ve Parçalar",
  children: [
    {
      name: "Bosch Parçaları",
      children: [
        {
          name: "Fren Sistemleri",
          children: [
            { name: "Fren Diski (BOSCH)", value: 1 }
          ]
        },
        {
          name: "Görüş Sistemleri",
          children: [
            { name: "Silecek Süpürgesi (BOSCH)", value: 1 }
          ]
        },
        {
          name: "Yakıt Sistemleri",
          children: [
            { name: "Enjektör (BOSCH)", value: 1 }
          ]
        }
      ]
    },
    {
      name: "Diğer Marka Parçalar",
      children: [
        {
          name: "Görüş Sistemleri",
          children: [
            { name: "Silecek Takımı (VALEO)", value: 1 }
          ]
        },
        {
          name: "Filtre Sistemleri",
          children: [
            { name: "Hava Filtresi (MANN)", value: 1 }
          ]
        }
      ]
    },
    {
      name: "Madeni Yağlar & Sıvılar",
      children: [
        {
          name: "Tam Sentetik Motor Yağı",
          children: [
            { name: "Castrol Edge 5W-30 (MOTOR YAĞI)", value: 1 },
            { name: "Mobil Super 5W-40 (MOTOR YAĞI)", value: 1 }
          ]
        }
      ]
    },
    {
      name: "İşçilik ve Bakım Hizmetleri",
      children: [
        {
          name: "Periyodik Bakım İşçiliği",
          children: [
            { name: "Periyodik Bakım 15.000 KM (İŞÇİLİK)", value: 1 }
          ]
        },
        {
          name: "Fren Sistemi İşçiliği",
          children: [
            { name: "Ön Fren Balata Değişimi (İŞÇİLİK)", value: 1 }
          ]
        },
        {
          name: "Rot & Balans İşçiliği",
          children: [
            { name: "Ön Düzen Rot & Balans (İŞÇİLİK)", value: 1 }
          ]
        }
      ]
    }
  ]
};

export const brandDistribution = [
  { name: 'Bosch Parçaları', value: 3, color: '#3b82f6', key: 'BOSCH' },
  { name: 'Diğer Markalar', value: 2, color: '#f59e0b', key: 'DIGER' },
  { name: 'Motor Yağı', value: 2, color: '#06b6d4', key: 'YAG' },
  { name: 'İşçilik', value: 3, color: '#10b981', key: 'ISCILIK' }
];

export const topCategories = [
  { name: 'İşçilik ve Bakım Hizmetleri', count: 3 },
  { name: 'Bosch Parçaları', count: 3 },
  { name: 'Madeni Yağlar & Sıvılar', count: 2 },
  { name: 'Görüş Sistemleri', count: 2 },
  { name: 'Filtre Sistemleri', count: 1 }
];

export const categoryTopItems = {
  'İşçilik ve Bakım Hizmetleri': [
    { name: 'Periyodik Bakım İşçiliği', count: 1 },
    { name: 'Fren Sistemi Değişim İşçiliği', count: 1 },
    { name: 'Rot Balans Ayar Hizmeti', count: 1 }
  ],
  'Madeni Yağlar & Sıvılar': [
    { name: 'Castrol Edge 5W-30 Tam Sentetik Motor Yağı', count: 1 },
    { name: 'Mobil Super 5W-40 Motor Yağı', count: 1 }
  ],
  'Bosch Parçaları': [
    { name: 'Fren Diski', count: 1 },
    { name: 'Silecek Süpürgesi', count: 1 },
    { name: 'Enjektör', count: 1 }
  ],
  'Görüş Sistemleri': [
    { name: 'Silecek Süpürgesi', count: 1 },
    { name: 'Silecek Takımı', count: 1 }
  ],
  'Filtre Sistemleri': [
    { name: 'Hava Filtresi', count: 1 }
  ]
};

export const brandModelData = [
  { 
    marka: 'Ford', 
    total: 3, 
    vehicleCount: 1, 
    totalCiro: 15100,
    avgKm: 98400,
    models: [
      { model: 'Focus', count: 3, vehicleCount: 1, totalCiro: 15100, avgKm: 98400, plates: ['34 ABC 02'] }
    ] 
  },
  { 
    marka: 'Renault', 
    total: 4, 
    vehicleCount: 2, 
    totalCiro: 8820,
    avgKm: 90100,
    models: [
      { model: 'Clio', count: 3, vehicleCount: 1, totalCiro: 6900, avgKm: 45200, plates: ['34 ABC 01'] }, 
      { model: 'Megane', count: 1, vehicleCount: 1, totalCiro: 1920, avgKm: 135000, plates: ['35 GHI 56'] }
    ] 
  },
  { 
    marka: 'Fiat', 
    total: 2, 
    vehicleCount: 1, 
    totalCiro: 2530,
    avgKm: 62100,
    models: [
      { model: 'Egea', count: 2, vehicleCount: 1, totalCiro: 2530, avgKm: 62100, plates: ['06 DEF 34'] }
    ] 
  }
];

export const fleetData = [
  { filo: 'Merkez Filo', count: 6 },
  { filo: 'Ankara Filo', count: 2 },
  { filo: 'İzmir Filo', count: 2 }
];
