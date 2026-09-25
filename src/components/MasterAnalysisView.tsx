import React, { useState, useMemo } from 'react';
import * as xlsx from 'xlsx';
import { 
  Building2, 
  Store, 
  Car, 
  Wrench, 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  ShieldCheck,
  Layers, 
  Filter, 
  Search, 
  Download, 
  ChevronRight, 
  ArrowUpDown, 
  CheckCircle2, 
  TrendingUp, 
  Coins, 
  X, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { ProcessedRecord, IslemTuru } from '../lib/engine';
import WarrantyAnalysisView from './WarrantyAnalysisView';

interface MasterAnalysisViewProps {
  data: ProcessedRecord[];
}

export default function MasterAnalysisView({ data }: MasterAnalysisViewProps) {
  // Filtre State'leri
  const [selectedFilo, setSelectedFilo] = useState<string>('ALL');
  const [selectedServis, setSelectedServis] = useState<string>('ALL');
  const [selectedModel, setSelectedModel] = useState<string>('ALL');
  const [selectedIslemTuru, setSelectedIslemTuru] = useState<string>('ALL');
  const [selectedParcaTuru, setSelectedParcaTuru] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Aktif Görünüm Sekmesi
  const [activeViewTab, setActiveViewTab] = useState<'garanti' | 'filolar' | 'servisler' | 'modeller' | 'matris' | 'grafikler'>('garanti');
  
  // Sıralama State'leri
  const [sortField, setSortField] = useState<string>('totalCiro');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Detay Modal State'i
  const [selectedDetailItem, setSelectedDetailItem] = useState<{
    type: 'filo' | 'servis' | 'model';
    name: string;
    records: ProcessedRecord[];
  } | null>(null);

  // Para ve Sayı Formatlama
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('tr-TR').format(val);
  };

  // 1. Filtre Listeleri (Benzersiz değerler)
  const filterOptions = useMemo(() => {
    const filolar = new Set<string>();
    const servisler = new Set<string>();
    const modeller = new Set<string>();

    data.forEach(r => {
      if (r.filoAdi && r.filoAdi.trim()) filolar.add(r.filoAdi.trim());
      if (r.servisIsmi && r.servisIsmi.trim()) servisler.add(r.servisIsmi.trim());
      if (r.aracModel && r.aracModel.trim() && r.aracModel !== '-') {
        const fullModel = r.aracMarka ? `${r.aracMarka} ${r.aracModel}` : r.aracModel;
        modeller.add(fullModel);
      }
    });

    return {
      filolar: Array.from(filolar).sort((a, b) => a.localeCompare(b, 'tr-TR')),
      servisler: Array.from(servisler).sort((a, b) => a.localeCompare(b, 'tr-TR')),
      modeller: Array.from(modeller).sort((a, b) => a.localeCompare(b, 'tr-TR'))
    };
  }, [data]);

  // 2. Filtrelenmiş Ham Veri
  const filteredData = useMemo(() => {
    return data.filter(r => {
      // Filo Filtresi
      if (selectedFilo !== 'ALL' && (r.filoAdi || 'Bilinmeyen Filo') !== selectedFilo) {
        return false;
      }
      // Servis Filtresi
      if (selectedServis !== 'ALL' && (r.servisIsmi || 'Merkez Servis') !== selectedServis) {
        return false;
      }
      // Model Filtresi
      if (selectedModel !== 'ALL') {
        const fullModel = r.aracMarka ? `${r.aracMarka} ${r.aracModel}` : (r.aracModel || '');
        if (fullModel !== selectedModel && r.aracModel !== selectedModel) {
          return false;
        }
      }
      // İşlem Türü Filtresi (Bakım, Arıza, Hasar, Dış İşçilikler)
      if (selectedIslemTuru !== 'ALL') {
        const islem = r.islemTuru || 'Bakım';
        if (islem !== selectedIslemTuru) {
          return false;
        }
      }
      // Parça / Tür Filtresi
      if (selectedParcaTuru !== 'ALL') {
        const pType = r.anaTur || (r.isBosch ? 'BOSCH' : (r.isYag ? 'YAG' : (r.isIscilik ? 'ISCILIK' : 'DIGER')));
        if (pType !== selectedParcaTuru) {
          return false;
        }
      }
      // Arama Terimi
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const searchPool = [
          r.filoAdi,
          r.servisIsmi,
          r.plaka,
          r.aracMarka,
          r.aracModel,
          r.orijinalKodAd,
          r.eslesenKatalog,
          r.islemTuru,
          r.seviye1,
          r.seviye2
        ].join(' ').toLowerCase();
        if (!searchPool.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [data, selectedFilo, selectedServis, selectedModel, selectedIslemTuru, selectedParcaTuru, searchTerm]);

  // 3. Genel KPI ve 4 İşlem Türü Agregasyonu
  const summaryStats = useMemo(() => {
    let totalCiro = 0;
    const uniquePlates = new Set<string>();
    const uniqueFilos = new Set<string>();
    const uniqueServisler = new Set<string>();
    const uniqueModels = new Set<string>();

    let boschCiro = 0;
    let digerCiro = 0;
    let yagCiro = 0;
    let iscilikCiro = 0;

    const islemStats: Record<IslemTuru, { ciro: number; count: number; plates: Set<string>; topItems: Record<string, { count: number; ciro: number }> }> = {
      'Bakım': { ciro: 0, count: 0, plates: new Set(), topItems: {} },
      'Arıza': { ciro: 0, count: 0, plates: new Set(), topItems: {} },
      'Hasar': { ciro: 0, count: 0, plates: new Set(), topItems: {} },
      'Dış İşçilikler': { ciro: 0, count: 0, plates: new Set(), topItems: {} }
    };

    filteredData.forEach(r => {
      const tutar = r.tutar || 0;
      totalCiro += tutar;

      if (r.plaka) uniquePlates.add(r.plaka);
      if (r.filoAdi) uniqueFilos.add(r.filoAdi);
      if (r.servisIsmi) uniqueServisler.add(r.servisIsmi);
      if (r.aracModel) uniqueModels.add(`${r.aracMarka || ''} ${r.aracModel}`);

      // Parça / Ürün Türü
      if (r.isBosch || r.anaTur === 'BOSCH') boschCiro += tutar;
      else if (r.isYag || r.anaTur === 'YAG') yagCiro += tutar;
      else if (r.isIscilik || r.anaTur === 'ISCILIK') iscilikCiro += tutar;
      else digerCiro += tutar;

      // İşlem Türü
      const islem = (r.islemTuru || 'Bakım') as IslemTuru;
      if (islemStats[islem]) {
        islemStats[islem].ciro += tutar;
        islemStats[islem].count += 1;
        if (r.plaka) islemStats[islem].plates.add(r.plaka);

        const itemName = r.eslesenKatalog || r.orijinalKodAd || 'Bilinmeyen Kalem';
        if (!islemStats[islem].topItems[itemName]) {
          islemStats[islem].topItems[itemName] = { count: 0, ciro: 0 };
        }
        islemStats[islem].topItems[itemName].count += 1;
        islemStats[islem].topItems[itemName].ciro += tutar;
      }
    });

    const totalPartsCiro = boschCiro + digerCiro;
    const boschPenetration = totalPartsCiro > 0 ? (boschCiro / totalPartsCiro) * 100 : 0;

    return {
      totalCiro,
      totalCount: filteredData.length,
      uniquePlatesCount: uniquePlates.size,
      uniqueFilosCount: uniqueFilos.size,
      uniqueServislerCount: uniqueServisler.size,
      uniqueModelsCount: uniqueModels.size,
      boschCiro,
      digerCiro,
      yagCiro,
      iscilikCiro,
      boschPenetration,
      islemStats
    };
  }, [filteredData]);

  // 4. Filo Bazında Derli Toplu Agregasyon
  const filoTableData = useMemo(() => {
    const map: Record<string, {
      name: string;
      totalCiro: number;
      totalCount: number;
      plates: Set<string>;
      servisler: Set<string>;
      models: Record<string, number>;
      bakimCiro: number;
      arizaCiro: number;
      hasarCiro: number;
      disCiro: number;
      boschCiro: number;
      nonBoschCiro: number;
      yagCiro: number;
      iscilikCiro: number;
    }> = {};

    filteredData.forEach(r => {
      const filo = r.filoAdi || 'Diğer / Belirtilmemiş Filo';
      if (!map[filo]) {
        map[filo] = {
          name: filo,
          totalCiro: 0,
          totalCount: 0,
          plates: new Set(),
          servisler: new Set(),
          models: {},
          bakimCiro: 0,
          arizaCiro: 0,
          hasarCiro: 0,
          disCiro: 0,
          boschCiro: 0,
          nonBoschCiro: 0,
          yagCiro: 0,
          iscilikCiro: 0
        };
      }

      const tutar = r.tutar || 0;
      map[filo].totalCiro += tutar;
      map[filo].totalCount += 1;
      if (r.plaka) map[filo].plates.add(r.plaka);
      if (r.servisIsmi) map[filo].servisler.add(r.servisIsmi);

      const m = r.aracModel ? `${r.aracMarka || ''} ${r.aracModel}`.trim() : 'Diğer Model';
      map[filo].models[m] = (map[filo].models[m] || 0) + 1;

      // İşlem Türü
      const islem = r.islemTuru || 'Bakım';
      if (islem === 'Bakım') map[filo].bakimCiro += tutar;
      else if (islem === 'Arıza') map[filo].arizaCiro += tutar;
      else if (islem === 'Hasar') map[filo].hasarCiro += tutar;
      else if (islem === 'Dış İşçilikler') map[filo].disCiro += tutar;

      // Parça Türü
      if (r.isBosch || r.anaTur === 'BOSCH') map[filo].boschCiro += tutar;
      else if (r.isYag || r.anaTur === 'YAG') map[filo].yagCiro += tutar;
      else if (r.isIscilik || r.anaTur === 'ISCILIK') map[filo].iscilikCiro += tutar;
      else map[filo].nonBoschCiro += tutar;
    });

    return Object.values(map).sort((a, b) => {
      let valA = (a as any)[sortField] || 0;
      let valB = (b as any)[sortField] || 0;
      if (sortField === 'plates') {
        valA = a.plates.size;
        valB = b.plates.size;
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredData, sortField, sortAsc]);

  // 5. Servis Bazında Derli Toplu Agregasyon
  const servisTableData = useMemo(() => {
    const map: Record<string, {
      name: string;
      totalCiro: number;
      totalCount: number;
      plates: Set<string>;
      filolar: Set<string>;
      bakimCiro: number;
      arizaCiro: number;
      hasarCiro: number;
      disCiro: number;
      boschCiro: number;
      nonBoschCiro: number;
      yagCiro: number;
      iscilikCiro: number;
    }> = {};

    filteredData.forEach(r => {
      const s = r.servisIsmi || 'Merkez Servis';
      if (!map[s]) {
        map[s] = {
          name: s,
          totalCiro: 0,
          totalCount: 0,
          plates: new Set(),
          filolar: new Set(),
          bakimCiro: 0,
          arizaCiro: 0,
          hasarCiro: 0,
          disCiro: 0,
          boschCiro: 0,
          nonBoschCiro: 0,
          yagCiro: 0,
          iscilikCiro: 0
        };
      }

      const tutar = r.tutar || 0;
      map[s].totalCiro += tutar;
      map[s].totalCount += 1;
      if (r.plaka) map[s].plates.add(r.plaka);
      if (r.filoAdi) map[s].filolar.add(r.filoAdi);

      const islem = r.islemTuru || 'Bakım';
      if (islem === 'Bakım') map[s].bakimCiro += tutar;
      else if (islem === 'Arıza') map[s].arizaCiro += tutar;
      else if (islem === 'Hasar') map[s].hasarCiro += tutar;
      else if (islem === 'Dış İşçilikler') map[s].disCiro += tutar;

      if (r.isBosch || r.anaTur === 'BOSCH') map[s].boschCiro += tutar;
      else if (r.isYag || r.anaTur === 'YAG') map[s].yagCiro += tutar;
      else if (r.isIscilik || r.anaTur === 'ISCILIK') map[s].iscilikCiro += tutar;
      else map[s].nonBoschCiro += tutar;
    });

    return Object.values(map).sort((a, b) => b.totalCiro - a.totalCiro);
  }, [filteredData]);

  // 6. Araç Modeli Bazında Derli Toplu Agregasyon (Q Marka + R Model)
  const modelTableData = useMemo(() => {
    const map: Record<string, {
      modelName: string;
      marka: string;
      totalCiro: number;
      totalCount: number;
      plates: Set<string>;
      filolar: Set<string>;
      bakimCiro: number;
      arizaCiro: number;
      hasarCiro: number;
      disCiro: number;
      avgKm: number;
      kmTotal: number;
      kmCount: number;
    }> = {};

    filteredData.forEach(r => {
      const brand = r.aracMarka || 'Diğer Marka';
      const mod = r.aracModel || 'Standart Model';
      const key = `${brand} - ${mod}`;

      if (!map[key]) {
        map[key] = {
          modelName: mod,
          marka: brand,
          totalCiro: 0,
          totalCount: 0,
          plates: new Set(),
          filolar: new Set(),
          bakimCiro: 0,
          arizaCiro: 0,
          hasarCiro: 0,
          disCiro: 0,
          avgKm: 0,
          kmTotal: 0,
          kmCount: 0
        };
      }

      const tutar = r.tutar || 0;
      map[key].totalCiro += tutar;
      map[key].totalCount += 1;
      if (r.plaka) map[key].plates.add(r.plaka);
      if (r.filoAdi) map[key].filolar.add(r.filoAdi);
      if (r.km && r.km > 0) {
        map[key].kmTotal += r.km;
        map[key].kmCount += 1;
      }

      const islem = r.islemTuru || 'Bakım';
      if (islem === 'Bakım') map[key].bakimCiro += tutar;
      else if (islem === 'Arıza') map[key].arizaCiro += tutar;
      else if (islem === 'Hasar') map[key].hasarCiro += tutar;
      else if (islem === 'Dış İşçilikler') map[key].disCiro += tutar;
    });

    return Object.values(map)
      .map(m => ({
        ...m,
        avgKm: m.kmCount > 0 ? Math.round(m.kmTotal / m.kmCount) : 0
      }))
      .sort((a, b) => b.totalCiro - a.totalCiro);
  }, [filteredData]);

  // 7. Çapraz Matris (Pivot: Filo x Servis x İşlem Türü)
  const matrixData = useMemo(() => {
    const pairs: Record<string, {
      filo: string;
      servis: string;
      totalCiro: number;
      totalCount: number;
      bakimCiro: number;
      arizaCiro: number;
      hasarCiro: number;
      disCiro: number;
      plates: Set<string>;
    }> = {};

    filteredData.forEach(r => {
      const filo = r.filoAdi || 'Bilinmeyen Filo';
      const servis = r.servisIsmi || 'Merkez Servis';
      const key = `${filo}___${servis}`;

      if (!pairs[key]) {
        pairs[key] = {
          filo,
          servis,
          totalCiro: 0,
          totalCount: 0,
          bakimCiro: 0,
          arizaCiro: 0,
          hasarCiro: 0,
          disCiro: 0,
          plates: new Set()
        };
      }

      const tutar = r.tutar || 0;
      pairs[key].totalCiro += tutar;
      pairs[key].totalCount += 1;
      if (r.plaka) pairs[key].plates.add(r.plaka);

      const islem = r.islemTuru || 'Bakım';
      if (islem === 'Bakım') pairs[key].bakimCiro += tutar;
      else if (islem === 'Arıza') pairs[key].arizaCiro += tutar;
      else if (islem === 'Hasar') pairs[key].hasarCiro += tutar;
      else if (islem === 'Dış İşçilikler') pairs[key].disCiro += tutar;
    });

    return Object.values(pairs).sort((a, b) => b.totalCiro - a.totalCiro);
  }, [filteredData]);

  // 8. Grafik Veri Setleri
  const islemPieChartData = useMemo(() => {
    const colors: Record<IslemTuru, string> = {
      'Bakım': '#2563EB',       // Blue 600
      'Arıza': '#D97706',       // Amber 600
      'Hasar': '#DC2626',       // Red 600
      'Dış İşçilikler': '#7C3AED' // Violet 600
    };

    return (['Bakım', 'Arıza', 'Hasar', 'Dış İşçilikler'] as IslemTuru[]).map(key => ({
      name: key,
      ciro: summaryStats.islemStats[key]?.ciro || 0,
      count: summaryStats.islemStats[key]?.count || 0,
      color: colors[key]
    }));
  }, [summaryStats]);

  const topFiloBarChartData = useMemo(() => {
    return filoTableData.slice(0, 7).map(f => ({
      name: f.name.length > 16 ? f.name.substring(0, 16) + '...' : f.name,
      fullName: f.name,
      Bakım: f.bakimCiro,
      Arıza: f.arizaCiro,
      Hasar: f.hasarCiro,
      'Dış İşçilikler': f.disCiro,
      total: f.totalCiro
    }));
  }, [filoTableData]);

  // CSV İndirme
  const exportToCSV = () => {
    const headers = [
      'Satır No',
      'Filo / Firma Adı',
      'Servis İsmi',
      'Araç Markası',
      'Araç Modeli',
      'Plaka',
      'KM',
      'İşlem Türü',
      'Kategori / Ürün Türü',
      'Orijinal Parça / İşlem',
      'Eşleşen Katalog',
      'Seviye 1',
      'Seviye 2',
      'Tutar (₺)'
    ];

    const rows = filteredData.map(r => [
      r.satirNo,
      `"${(r.filoAdi || '').replace(/"/g, '""')}"`,
      `"${(r.servisIsmi || '').replace(/"/g, '""')}"`,
      `"${(r.aracMarka || '').replace(/"/g, '""')}"`,
      `"${(r.aracModel || '').replace(/"/g, '""')}"`,
      `"${(r.plaka || '').replace(/"/g, '""')}"`,
      r.km || '',
      `"${r.islemTuru || 'Bakım'}"`,
      `"${r.anaTurAd || r.ypTipi || ''}"`,
      `"${(r.orijinalKodAd || '').replace(/"/g, '""')}"`,
      `"${(r.eslesenKatalog || '').replace(/"/g, '""')}"`,
      `"${(r.seviye1 || '').replace(/"/g, '""')}"`,
      `"${(r.seviye2 || '').replace(/"/g, '""')}"`,
      r.tutar || 0
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Derli_Toplu_Bütünleşik_Analiz_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Kapsamlı Tek Sayfa Excel Olarak Dışa Aktarma (xlsx)
  const exportComprehensiveExcel = () => {
    const aoa: any[][] = [];

    // 1. Rapor Başlığı
    aoa.push(["BOSCH CAR SERVICE & FİLO YÖNETİMİ - BÜTÜNLEŞİK ANALİZ RAPORU"]);
    aoa.push([`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Filtreler: Filo=${selectedFilo}, Servis=${selectedServis}, Model=${selectedModel}, İşlem=${selectedIslemTuru}`]);
    aoa.push([]);

    // 2. Bölüm 1: Bütünleşik Özet ve KPI'lar
    aoa.push(["=== 1. BÜTÜNLEŞİK ÖZET VE ANA GÖSTERGELER ==="]);
    aoa.push(["Metrik", "Değer", "Açıklama"]);
    aoa.push(["Toplam Portföy Cirosu (TL)", summaryStats.totalCiro, "Filtrelenmiş toplam harcama tutarı"]);
    aoa.push(["Toplam İşlem / Kayıt Sayısı", summaryStats.totalCount, "Toplam parça ve işçilik işlem adedi"]);
    aoa.push(["Tekil Araç Sayısı (Plaka)", summaryStats.uniquePlatesCount, "Analiz kapsamındaki tekil araç sayısı"]);
    aoa.push(["Filo Sayısı", summaryStats.uniqueFilosCount, "İşlem yapılan filo adedi"]);
    aoa.push(["Servis Sayısı", summaryStats.uniqueServislerCount, "Hizmet alınan servis adedi"]);
    aoa.push(["Model Sayısı", summaryStats.uniqueModelsCount, "Farklı araç modeli adedi"]);
    aoa.push(["Bosch Parça Cirosu (TL)", summaryStats.boschCiro, "Bosch orijinal parça harcamaları"]);
    aoa.push(["Motor Yağı Cirosu (TL)", summaryStats.yagCiro, "Madeni yağ harcamaları"]);
    aoa.push(["İşçilik Cirosu (TL)", summaryStats.iscilikCiro, "Bakım ve onarım işçilik bedelleri"]);
    aoa.push(["Diğer Parça Cirosu (TL)", summaryStats.digerCiro, "Diğer marka parça harcamaları"]);
    aoa.push([]);

    // 3. Bölüm 2: Filo Bazlı Dağılım
    aoa.push(["=== 2. FİLO BAZINDA HARCAMA DAĞILIMI ==="]);
    aoa.push(["Filo Adı", "Araç Sayısı", "Toplam Ciro (TL)", "İşlem Adedi", "Bakım (TL)", "Arıza (TL)", "Hasar (TL)", "Dış İşçilik (TL)"]);
    filoTableData.forEach(f => {
      aoa.push([
        f.name,
        f.plates.size,
        f.totalCiro,
        f.totalCount,
        f.bakimCiro,
        f.arizaCiro,
        f.hasarCiro,
        f.disCiro
      ]);
    });
    aoa.push([]);

    // 4. Bölüm 3: Servis Bazlı Dağılım
    aoa.push(["=== 3. SERVİS BAZINDA HARCAMA DAĞILIMI ==="]);
    aoa.push(["Servis İsmi", "Araç Sayısı", "Toplam Ciro (TL)", "İşlem Adedi", "Bakım (TL)", "Arıza (TL)", "Hasar (TL)", "Dış İşçilik (TL)"]);
    servisTableData.forEach(s => {
      aoa.push([
        s.name,
        s.plates.size,
        s.totalCiro,
        s.totalCount,
        s.bakimCiro,
        s.arizaCiro,
        s.hasarCiro,
        s.disCiro
      ]);
    });
    aoa.push([]);

    // 5. Bölüm 4: Detaylı İşlem ve Parça Listesi
    aoa.push(["=== 4. DETAYLI İŞLEM VE PARÇA LİSTESİ ==="]);
    aoa.push([
      'Satır No',
      'Filo / Firma Adı',
      'Servis İsmi',
      'Araç Markası',
      'Araç Modeli',
      'Plaka',
      'KM',
      'İşlem Türü',
      'Kategori / Ürün Türü',
      'Orijinal Parça / İşlem',
      'Eşleşen Katalog',
      'Seviye 1',
      'Seviye 2',
      'Tutar (₺)'
    ]);
    filteredData.forEach(r => {
      aoa.push([
        r.satirNo,
        r.filoAdi || '',
        r.servisIsmi || '',
        r.aracMarka || '',
        r.aracModel || '',
        r.plaka || '',
        r.km || 0,
        r.islemTuru || 'Bakım',
        r.anaTurAd || r.ypTipi || '',
        r.orijinalKodAd || '',
        r.eslesenKatalog || '',
        r.seviye1 || '',
        r.seviye2 || '',
        r.tutar || 0
      ]);
    });

    const ws = xlsx.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 25 },
      { wch: 16 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 16 },
      { wch: 20 },
      { wch: 30 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 16 }
    ];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Butunlesik_Analiz_Raporu");
    xlsx.writeFile(wb, `Bosch_Butunlesik_Analiz_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Detay Modalı Açıcı
  const handleOpenDetailModal = (type: 'filo' | 'servis' | 'model', name: string) => {
    let matchedRecords: ProcessedRecord[] = [];
    if (type === 'filo') {
      matchedRecords = data.filter(r => (r.filoAdi || 'Diğer / Belirtilmemiş Filo') === name);
    } else if (type === 'servis') {
      matchedRecords = data.filter(r => (r.servisIsmi || 'Merkez Servis') === name);
    } else if (type === 'model') {
      matchedRecords = data.filter(r => `${r.aracMarka || ''} - ${r.aracModel || ''}` === name || r.aracModel === name);
    }

    setSelectedDetailItem({
      type,
      name,
      records: matchedRecords
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. ÜST BAŞLIK VE KONTROL PANELİ */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Derli Toplu Bütünleşik Görünüm
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
            Filo, Servis, Model & İşlem Türü Analizi
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Filolar, hizmet alınan servisler, araç modelleri ve Bakım / Arıza / Hasar / Dış İşçilik harcama dağılımları.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedFilo('ALL');
              setSelectedServis('ALL');
              setSelectedModel('ALL');
              setSelectedIslemTuru('ALL');
              setSelectedParcaTuru('ALL');
              setSearchTerm('');
            }}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
            title="Tüm Filtreleri Temizle"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Filtreleri Sıfırla
          </button>
          <button
            onClick={exportComprehensiveExcel}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Excel Raporu İndir (Tek Sayfa)
          </button>
        </div>
      </div>

      {/* 2. DERLİ TOPLU ÜST KPI KARTLARI */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Toplam Ciro */}
        <div className="col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Toplam Analiz Cirosu</p>
              <h3 className="text-2xl font-black mt-1 text-white tracking-tight">
                {formatCurrency(summaryStats.totalCiro)}
              </h3>
            </div>
            <div className="p-2 bg-white/10 rounded-xl">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-300 pt-2 border-t border-white/10">
            <span>Toplam <strong>{formatNumber(summaryStats.totalCount)}</strong> Kalem</span>
            <span>•</span>
            <span>Ort. Kalem: <strong>{formatCurrency(summaryStats.totalCount > 0 ? summaryStats.totalCiro / summaryStats.totalCount : 0)}</strong></span>
          </div>
        </div>

        {/* Aktif Filolar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Filolar (Firma)</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {formatNumber(summaryStats.uniqueFilosCount)}
              </h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Aktif kurumsal filo portföyü</p>
        </div>

        {/* Hizmet Veren Servisler */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Servis Noktası</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {formatNumber(summaryStats.uniqueServislerCount)}
              </h3>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Hizmet veren servis ağı</p>
        </div>

        {/* Araç Modelleri & Plakalar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Araç & Model</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {formatNumber(summaryStats.uniquePlatesCount)} <span className="text-xs font-normal text-slate-400">Araç</span>
              </h3>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">{summaryStats.uniqueModelsCount} farklı araç modeli</p>
        </div>

        {/* Bosch Parça Penetrasyon Payı */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bosch Penetrasyon</p>
              <h3 className="text-xl font-bold text-blue-700 mt-1">
                %{summaryStats.boschPenetration.toFixed(1)}
              </h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Parça cirosu içindeki payı</p>
        </div>
      </div>

      {/* 3. 4 ANA İŞLEM TÜRÜ KARTI (Bakım, Arıza, Hasar, Dış İşçilikler) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. BAKIM */}
        <div className="bg-white rounded-2xl p-5 border border-blue-200 shadow-sm relative overflow-hidden hover:border-blue-300 transition">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Bakım</h4>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              %{summaryStats.totalCiro > 0 ? ((summaryStats.islemStats['Bakım'].ciro / summaryStats.totalCiro) * 100).toFixed(1) : 0} Pay
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs text-slate-500">Toplam Bakım Cirosu</p>
            <p className="text-xl font-black text-blue-900 mt-0.5">
              {formatCurrency(summaryStats.islemStats['Bakım'].ciro)}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span><strong>{formatNumber(summaryStats.islemStats['Bakım'].count)}</strong> İşlem</span>
            <span><strong>{formatNumber(summaryStats.islemStats['Bakım'].plates.size)}</strong> Araç</span>
            <span>Ort: <strong>{formatCurrency(summaryStats.islemStats['Bakım'].count > 0 ? summaryStats.islemStats['Bakım'].ciro / summaryStats.islemStats['Bakım'].count : 0)}</strong></span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            Periyodik bakım, filtreler, motor yağı ve silecekler
          </p>
        </div>

        {/* 2. ARIZA */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm relative overflow-hidden hover:border-amber-300 transition">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Arıza</h4>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              %{summaryStats.totalCiro > 0 ? ((summaryStats.islemStats['Arıza'].ciro / summaryStats.totalCiro) * 100).toFixed(1) : 0} Pay
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs text-slate-500">Toplam Arıza Cirosu</p>
            <p className="text-xl font-black text-amber-900 mt-0.5">
              {formatCurrency(summaryStats.islemStats['Arıza'].ciro)}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span><strong>{formatNumber(summaryStats.islemStats['Arıza'].count)}</strong> İşlem</span>
            <span><strong>{formatNumber(summaryStats.islemStats['Arıza'].plates.size)}</strong> Araç</span>
            <span>Ort: <strong>{formatCurrency(summaryStats.islemStats['Arıza'].count > 0 ? summaryStats.islemStats['Arıza'].ciro / summaryStats.islemStats['Arıza'].count : 0)}</strong></span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            Mekanik onarımlar, fren, debriyaj, enjektör, motor
          </p>
        </div>

        {/* 3. HASAR */}
        <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm relative overflow-hidden hover:border-rose-300 transition">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                <Flame className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Hasar</h4>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              %{summaryStats.totalCiro > 0 ? ((summaryStats.islemStats['Hasar'].ciro / summaryStats.totalCiro) * 100).toFixed(1) : 0} Pay
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs text-slate-500">Toplam Hasar Cirosu</p>
            <p className="text-xl font-black text-rose-900 mt-0.5">
              {formatCurrency(summaryStats.islemStats['Hasar'].ciro)}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span><strong>{formatNumber(summaryStats.islemStats['Hasar'].count)}</strong> İşlem</span>
            <span><strong>{formatNumber(summaryStats.islemStats['Hasar'].plates.size)}</strong> Araç</span>
            <span>Ort: <strong>{formatCurrency(summaryStats.islemStats['Hasar'].count > 0 ? summaryStats.islemStats['Hasar'].ciro / summaryStats.islemStats['Hasar'].count : 0)}</strong></span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            Kaporta, fırın boya, tampon onarımı, kaza tamirleri
          </p>
        </div>

        {/* 4. DIŞ İŞÇİLİKLER */}
        <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-sm relative overflow-hidden hover:border-purple-300 transition">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-purple-600" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Dış İşçilikler</h4>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              %{summaryStats.totalCiro > 0 ? ((summaryStats.islemStats['Dış İşçilikler'].ciro / summaryStats.totalCiro) * 100).toFixed(1) : 0} Pay
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs text-slate-500">Toplam Dış İşçilik Cirosu</p>
            <p className="text-xl font-black text-purple-900 mt-0.5">
              {formatCurrency(summaryStats.islemStats['Dış İşçilikler'].ciro)}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span><strong>{formatNumber(summaryStats.islemStats['Dış İşçilikler'].count)}</strong> İşlem</span>
            <span><strong>{formatNumber(summaryStats.islemStats['Dış İşçilikler'].plates.size)}</strong> Araç</span>
            <span>Ort: <strong>{formatCurrency(summaryStats.islemStats['Dış İşçilikler'].count > 0 ? summaryStats.islemStats['Dış İşçilikler'].ciro / summaryStats.islemStats['Dış İşçilikler'].count : 0)}</strong></span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            Torna, rot-balans dış, taşeron ve dış laboratuvar
          </p>
        </div>
      </div>

      {/* 4. ETKİLEŞİMLİ FİLTRELEME & ARAMA ÇUBUĞU */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Filter className="w-4 h-4 text-blue-600" />
            Çok Boyutlu Filtreleme
          </div>
          <span className="text-xs font-medium text-slate-500">
            <strong>{filteredData.length}</strong> / {data.length} kayıt listeleniyor
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Filo Filtresi */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Filo / Firma</label>
            <select
              value={selectedFilo}
              onChange={(e) => setSelectedFilo(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">Tüm Filolar ({filterOptions.filolar.length})</option>
              {filterOptions.filolar.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Servis Filtresi */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Servis Noktası</label>
            <select
              value={selectedServis}
              onChange={(e) => setSelectedServis(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">Tüm Servisler ({filterOptions.servisler.length})</option>
              {filterOptions.servisler.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Araç Modeli Filtresi */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Araç Modeli</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">Tüm Modeller ({filterOptions.modeller.length})</option>
              {filterOptions.modeller.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* İşlem Türü Filtresi */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">İşlem Türü</label>
            <select
              value={selectedIslemTuru}
              onChange={(e) => setSelectedIslemTuru(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">Tüm İşlemler</option>
              <option value="Bakım">Bakım</option>
              <option value="Arıza">Arıza</option>
              <option value="Hasar">Hasar</option>
              <option value="Dış İşçilikler">Dış İşçilikler</option>
            </select>
          </div>

          {/* Hızlı Arama */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Hızlı Arama</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Plaka, parça, filo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. GÖRÜNÜM SEKME SEÇİCİSİ */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveViewTab('garanti')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeViewTab === 'garanti' 
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/20' 
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>Garanti İçi / Dışı Analizi (2 Yıl / 60k KM)</span>
        </button>

        <button
          onClick={() => setActiveViewTab('filolar')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeViewTab === 'filolar' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Filo & İşlem Türü Özeti ({filoTableData.length})
        </button>

        <button
          onClick={() => setActiveViewTab('servisler')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeViewTab === 'servisler' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          Servis & İşlem Kırılımı ({servisTableData.length})
        </button>

        <button
          onClick={() => setActiveViewTab('modeller')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeViewTab === 'modeller' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Car className="w-4 h-4" />
          Araç Modeli & İşlem Analizi ({modelTableData.length})
        </button>

        <button
          onClick={() => setActiveViewTab('matris')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeViewTab === 'matris' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Çapraz Matris (Filo x Servis x İşlem)
        </button>

        <button
          onClick={() => setActiveViewTab('grafikler')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeViewTab === 'grafikler' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Grafiksel Dağılım
        </button>
      </div>

      {/* 6. AKTİF GÖRÜNÜM İÇERİKLERİ */}

      {/* SEKME 0: ARAÇ GARANTİ İÇİ / DIŞI ANALİZİ */}
      {activeViewTab === 'garanti' && (
        <WarrantyAnalysisView data={filteredData} />
      )}

      {/* SEKME 1: FİLO & İŞLEM TÜRÜ ÖZETİ */}
      {activeViewTab === 'filolar' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Filoların İşlem Türü ve Parça Tüketim Raporu</h3>
              <p className="text-xs text-slate-500 mt-0.5">Filo bazında Bakım, Arıza, Hasar, Dış İşçilik ve Bosch parça dağılımı</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              {filoTableData.length} Filo
            </span>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-600 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Filo / Firma Adı</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Toplam Ciro (₺)</th>
                  <th scope="col" className="px-3 py-3 text-center font-bold">Araç</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-blue-700 bg-blue-50/50">Bakım (₺)</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-amber-700 bg-amber-50/50">Arıza (₺)</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-rose-700 bg-rose-50/50">Hasar (₺)</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-purple-700 bg-purple-50/50">Dış İşç. (₺)</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-blue-800">Bosch Parça</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-amber-800">Diğer Parça</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-cyan-800">Motor Yağı</th>
                  <th scope="col" className="px-4 py-3 text-center font-bold">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filoTableData.map((f, idx) => {
                  const partsTotal = f.boschCiro + f.nonBoschCiro;
                  const boschPct = partsTotal > 0 ? (f.boschCiro / partsTotal) * 100 : 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-sm font-extrabold text-slate-900">{f.name}</span>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {f.servisler.size} Farklı Servis • {Object.keys(f.models).length} Araç Modeli
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-black text-slate-900 text-sm">
                        {formatCurrency(f.totalCiro)}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          {f.plates.size}
                        </span>
                      </td>
                      {/* Bakım */}
                      <td className="px-3 py-3 text-right font-mono font-bold text-blue-700 bg-blue-50/20">
                        {formatCurrency(f.bakimCiro)}
                      </td>
                      {/* Arıza */}
                      <td className="px-3 py-3 text-right font-mono font-bold text-amber-700 bg-amber-50/20">
                        {formatCurrency(f.arizaCiro)}
                      </td>
                      {/* Hasar */}
                      <td className="px-3 py-3 text-right font-mono font-bold text-rose-700 bg-rose-50/20">
                        {formatCurrency(f.hasarCiro)}
                      </td>
                      {/* Dış İşçilik */}
                      <td className="px-3 py-3 text-right font-mono font-bold text-purple-700 bg-purple-50/20">
                        {formatCurrency(f.disCiro)}
                      </td>
                      {/* Bosch Parça */}
                      <td className="px-3 py-3 text-right font-mono font-semibold text-blue-800">
                        {formatCurrency(f.boschCiro)}
                        <span className="block text-[9px] text-blue-600 font-sans font-normal">%{boschPct.toFixed(0)} pay</span>
                      </td>
                      {/* Diğer Parça */}
                      <td className="px-3 py-3 text-right font-mono text-slate-700">
                        {formatCurrency(f.nonBoschCiro)}
                      </td>
                      {/* Motor Yağı */}
                      <td className="px-3 py-3 text-right font-mono text-cyan-800">
                        {formatCurrency(f.yagCiro)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenDetailModal('filo', f.name)}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
                        >
                          İncele
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEKME 2: SERVİS & İŞLEM KIRILIMI */}
      {activeViewTab === 'servisler' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Servis Noktalarının İşlem Türü Analizi</h3>
              <p className="text-xs text-slate-500 mt-0.5">Servis noktalarına göre ciro, bakım, arıza, hasar ve dış işçilik dağılımı</p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {servisTableData.length} Servis
            </span>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-600 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Servis İsmi</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Toplam Ciro (₺)</th>
                  <th scope="col" className="px-3 py-3 text-center font-bold">Filo Sayısı</th>
                  <th scope="col" className="px-3 py-3 text-center font-bold">Araç</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-blue-700 bg-blue-50/50">Bakım</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-amber-700 bg-amber-50/50">Arıza</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-rose-700 bg-rose-50/50">Hasar</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-purple-700 bg-purple-50/50">Dış İşçilik</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-blue-800">Bosch Parça</th>
                  <th scope="col" className="px-4 py-3 text-center font-bold">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {servisTableData.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-sm font-extrabold text-slate-900">{s.name}</span>
                          <div className="text-[10px] text-slate-400 font-normal">{s.totalCount} Toplam Kalem</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-black text-slate-900 text-sm">
                      {formatCurrency(s.totalCiro)}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        {s.filolar.size} Filo
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-700">
                      {s.plates.size}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-blue-700 bg-blue-50/20">
                      {formatCurrency(s.bakimCiro)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-amber-700 bg-amber-50/20">
                      {formatCurrency(s.arizaCiro)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-rose-700 bg-rose-50/20">
                      {formatCurrency(s.hasarCiro)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-purple-700 bg-purple-50/20">
                      {formatCurrency(s.disCiro)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-blue-800">
                      {formatCurrency(s.boschCiro)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleOpenDetailModal('servis', s.name)}
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
                      >
                        İncele
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEKME 3: ARAÇ MODELİ & İŞLEM ANALİZİ */}
      {activeViewTab === 'modeller' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Araç Modellerine Göre İşlem Dağılımı</h3>
              <p className="text-xs text-slate-500 mt-0.5">Araç markası ve modeli bazında harcama, ortalama KM ve işlem türleri</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {modelTableData.length} Model
            </span>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-600 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Araç Marka & Model</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Toplam Ciro (₺)</th>
                  <th scope="col" className="px-3 py-3 text-center font-bold">Tekil Araç</th>
                  <th scope="col" className="px-3 py-3 text-center font-bold">Ortalama KM</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-blue-700 bg-blue-50/50">Bakım</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-amber-700 bg-amber-50/50">Arıza</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-rose-700 bg-rose-50/50">Hasar</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-purple-700 bg-purple-50/50">Dış İşçilik</th>
                  <th scope="col" className="px-4 py-3 text-center font-bold">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modelTableData.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-sm font-extrabold text-slate-900">{m.marka} {m.modelName}</span>
                          <div className="text-[10px] text-slate-400 font-normal">{m.filolar.size} Filo bünyesinde</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-black text-slate-900 text-sm">
                      {formatCurrency(m.totalCiro)}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        {m.plates.size}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-emerald-700">
                      {m.avgKm > 0 ? `${m.avgKm.toLocaleString('tr-TR')} KM` : '-'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-blue-700 bg-blue-50/20">
                      {formatCurrency(m.bakimCiro)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-amber-700 bg-amber-50/20">
                      {formatCurrency(m.arizaCiro)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-rose-700 bg-rose-50/20">
                      {formatCurrency(m.hasarCiro)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-purple-700 bg-purple-50/20">
                      {formatCurrency(m.disCiro)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleOpenDetailModal('model', `${m.marka} - ${m.modelName}`)}
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
                      >
                        İncele
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEKME 4: ÇAPRAZ MATRİS (FİLO x SERVİS x İŞLEM) */}
      {activeViewTab === 'matris' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Çapraz Pivot Matris (Filo x Servis Noktası)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Hangi filonun hangi serviste ne kadarlık bakım, arıza, hasar ve dış işlem yaptırdığının tam dökümü</p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              {matrixData.length} Eşleşme
            </span>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-600 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Filo / Firma</th>
                  <th scope="col" className="px-4 py-3 font-bold">Hizmet Alan Servis</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Toplam Ciro (₺)</th>
                  <th scope="col" className="px-3 py-3 text-center font-bold">Araç</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-blue-700 bg-blue-50/50">Bakım</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-amber-700 bg-amber-50/50">Arıza</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-rose-700 bg-rose-50/50">Hasar</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-purple-700 bg-purple-50/50">Dış İşçilik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-extrabold text-slate-900 text-sm">
                      {p.filo}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      <span className="bg-amber-50 text-amber-900 px-2 py-1 rounded-md border border-amber-200">
                        {p.servis}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-black text-slate-900 text-sm">
                      {formatCurrency(p.totalCiro)}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-700">
                      {p.plates.size}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-blue-700 bg-blue-50/20">
                      {formatCurrency(p.bakimCiro)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-amber-700 bg-amber-50/20">
                      {formatCurrency(p.arizaCiro)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-rose-700 bg-rose-50/20">
                      {formatCurrency(p.hasarCiro)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-purple-700 bg-purple-50/20">
                      {formatCurrency(p.disCiro)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEKME 5: GRAFİKSEL DAĞILIM */}
      {activeViewTab === 'grafikler' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* İşlem Türleri Ciro Pasta Grafiği */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-1">4 Ana İşlem Türü Ciro Dağılımı</h3>
            <p className="text-xs text-slate-500 mb-4">Bakım, Arıza, Hasar ve Dış İşçilikler arasındaki ciro payları</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={islemPieChartData}
                    dataKey="ciro"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={45}
                    paddingAngle={3}
                    label={(entry: any) => `${entry.name || ''}: %${summaryStats.totalCiro > 0 ? (((Number(entry.value) || 0) / summaryStats.totalCiro) * 100).toFixed(0) : 0}`}
                  >
                    {islemPieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Ciro']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lider Filoların İşlem Türü Kırılımı */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-1">En Çok Harcama Yapan Filoların İşlem Dağılımı</h3>
            <p className="text-xs text-slate-500 mb-4">İlk 7 filonun Bakım, Arıza, Hasar ve Dış İşçilik harcamaları</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFiloBarChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k ₺`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val) || 0)]} />
                  <Legend />
                  <Bar dataKey="Bakım" stackId="a" fill="#2563EB" />
                  <Bar dataKey="Arıza" stackId="a" fill="#D97706" />
                  <Bar dataKey="Hasar" stackId="a" fill="#DC2626" />
                  <Bar dataKey="Dış İşçilikler" stackId="a" fill="#7C3AED" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 7. DETAYLI İNCELEME MODALI */}
      {selectedDetailItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Başlık */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white font-bold">
                  {selectedDetailItem.type === 'filo' && <Building2 className="w-5 h-5" />}
                  {selectedDetailItem.type === 'servis' && <Store className="w-5 h-5" />}
                  {selectedDetailItem.type === 'model' && <Car className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">
                    {selectedDetailItem.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedDetailItem.type === 'filo' && 'Filo Detaylı İşlem & Parça Listesi'}
                    {selectedDetailItem.type === 'servis' && 'Servis Detaylı İşlem & Filo Listesi'}
                    {selectedDetailItem.type === 'model' && 'Model Detaylı Bakım & Onarım Kayıtları'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Özet İstatistikleri */}
            <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-100 text-center text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 font-medium block">Toplam Kayıt</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">{selectedDetailItem.records.length} Kalem</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 font-medium block">Toplam Ciro</span>
                <span className="text-base font-black text-blue-700 mt-0.5 block">
                  {formatCurrency(selectedDetailItem.records.reduce((a, b) => a + (b.tutar || 0), 0))}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 font-medium block">Tekil Araç / Plaka</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">
                  {new Set(selectedDetailItem.records.map(r => r.plaka).filter(Boolean)).size} Araç
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 font-medium block">Bosch Parça Payı</span>
                <span className="text-base font-bold text-emerald-700 mt-0.5 block">
                  %{(() => {
                    const boschCiro = selectedDetailItem.records.filter(r => r.isBosch || r.anaTur === 'BOSCH').reduce((a, b) => a + (b.tutar || 0), 0);
                    const digerCiro = selectedDetailItem.records.filter(r => r.isDiger || r.anaTur === 'DIGER').reduce((a, b) => a + (b.tutar || 0), 0);
                    const totalParts = boschCiro + digerCiro;
                    return totalParts > 0 ? ((boschCiro / totalParts) * 100).toFixed(0) : '0';
                  })()}
                </span>
              </div>
            </div>

            {/* Modal Tablosu */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[450px]">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-slate-600 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-bold">#</th>
                    <th scope="col" className="px-3 py-2.5 font-bold">Plaka & Model</th>
                    <th scope="col" className="px-3 py-2.5 font-bold">İşlem Türü</th>
                    <th scope="col" className="px-3 py-2.5 font-bold">Parça / Hizmet</th>
                    <th scope="col" className="px-3 py-2.5 font-bold">Eşleşen Katalog</th>
                    <th scope="col" className="px-3 py-2.5 font-bold">Servis / Filo</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-bold">Tutar (₺)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDetailItem.records.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="px-3 py-2 text-slate-400 font-mono">{r.satirNo}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        <div>{r.plaka || '-'}</div>
                        <div className="text-[10px] text-slate-400">{r.aracMarka} {r.aracModel}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.islemTuru === 'Bakım' ? 'bg-blue-100 text-blue-800' :
                          r.islemTuru === 'Arıza' ? 'bg-amber-100 text-amber-800' :
                          r.islemTuru === 'Hasar' ? 'bg-rose-100 text-rose-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {r.islemTuru || 'Bakım'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800 truncate max-w-[160px]" title={r.orijinalKodAd}>
                        {r.orijinalKodAd}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {r.eslesenKatalog}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {selectedDetailItem.type === 'filo' ? r.servisIsmi : r.filoAdi}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(r.tutar || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Kapat Butonu */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
