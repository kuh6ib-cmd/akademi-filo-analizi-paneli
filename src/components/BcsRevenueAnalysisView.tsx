import React, { useState, useMemo, useEffect } from 'react';
import { 
  Store, 
  Coins, 
  Wrench, 
  Droplet, 
  Search, 
  Download, 
  ChevronRight, 
  ArrowUpDown, 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp, 
  Car, 
  MapPin, 
  Building, 
  Filter, 
  X, 
  CheckCircle2, 
  SlidersHorizontal, 
  BarChart3, 
  PieChart as PieChartIcon,
  Info,
  Layers,
  Sparkles
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
import { ProcessedRecord, ServisLocationRecord } from '../lib/engine';
import { getDataFromIDB } from '../lib/idb';

interface BcsRevenueAnalysisViewProps {
  data: ProcessedRecord[];
}

interface SubCategoryStats {
  count: number;
  ciro: number;
  items: Record<string, { code: string; name: string; count: number; ciro: number; category: string }>;
}

interface BcsAggregation {
  servis: string;
  sehir: string;
  bolge: string;
  totalCiro: number;
  totalUsage: number;
  vehiclePlates: Set<string>;
  
  // 1. Bosch Parça Kullanımı / Cirosu
  bosch: SubCategoryStats;
  
  // 2. Bosch Olmayan (Diğer) Parça Kullanımı / Cirosu
  nonBosch: SubCategoryStats;
  
  // 3. Motor Yağı Kullanımı / Cirosu
  motorYagi: SubCategoryStats;
  
  // İşçilik
  iscilik: SubCategoryStats;

  // Bosch Parça Penetrasyonu (Bosch Ciro / Toplam Parça Cirosu)
  boschParcaPayi: number;
}

export default function BcsRevenueAnalysisView({ data }: BcsRevenueAnalysisViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBolge, setSelectedBolge] = useState<string>('all');
  const [selectedSehir, setSelectedSehir] = useState<string>('all');
  const [sortBy, setSortBy] = useState<
    'totalCiro' | 'boschCiro' | 'nonBoschCiro' | 'yagCiro' | 'totalUsage' | 'boschUsage' | 'nonBoschUsage' | 'yagUsage' | 'boschParcaPayi' | 'name'
  >('totalCiro');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showIscilik, setShowIscilik] = useState<boolean>(true);
  const [chartMetric, setChartMetric] = useState<'ciro' | 'usage'>('ciro');
  const [selectedBcsModal, setSelectedBcsModal] = useState<BcsAggregation | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'all' | 'bosch' | 'nonBosch' | 'yag' | 'iscilik'>('all');
  
  // Servis Şehir ve Bölge Matrisi (IndexedDB'den otomatik çekilir)
  const [servisLocations, setServisLocations] = useState<Record<string, { sehir: string; bolge: string }>>({});

  useEffect(() => {
    async function fetchLocations() {
      try {
        const savedData = await getDataFromIDB<ServisLocationRecord[]>('servis_locations_data');
        if (savedData && Array.isArray(savedData) && savedData.length > 0) {
          const locMap: Record<string, { sehir: string; bolge: string }> = {};
          savedData.forEach(item => {
            if (item.servisAdi) {
              const cleanKey = item.servisAdi.trim().toLowerCase();
              locMap[cleanKey] = {
                sehir: item.sehir || 'Belirtilmedi',
                bolge: item.bolge || 'Genel'
              };
            }
          });
          setServisLocations(locMap);
        }
      } catch (e) {
        console.warn('Servis lokasyonları yüklenemedi:', e);
      }
    }
    fetchLocations();
  }, []);

  // Format Para
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('tr-TR').format(val);
  };

  // BCS Agregasyon Motoru
  const { bcsList, grandTotals, allBolgeler, allSehirler } = useMemo(() => {
    const map: Record<string, BcsAggregation> = {};
    const bolgelerSet = new Set<string>();
    const sehirlerSet = new Set<string>();

    const totals = {
      totalCiro: 0,
      totalUsage: 0,
      uniqueVehicles: new Set<string>(),
      bcsCount: 0,
      bosch: { count: 0, ciro: 0 },
      nonBosch: { count: 0, ciro: 0 },
      motorYagi: { count: 0, ciro: 0 },
      iscilik: { count: 0, ciro: 0 }
    };

    data.forEach((r, idx) => {
      const servisRaw = (r.servisIsmi || 'Merkez Servis').trim();
      const servisKey = servisRaw;
      const lowerKey = servisRaw.toLowerCase();

      // Lokasyon bilgisini eşleştir
      let matchedLoc = servisLocations[lowerKey];
      if (!matchedLoc) {
        // Kısmi eşleşme dene
        const found = Object.keys(servisLocations).find(k => lowerKey.includes(k) || k.includes(lowerKey));
        if (found) {
          matchedLoc = servisLocations[found];
        }
      }

      const sehir = matchedLoc?.sehir || 'Belirtilmedi';
      const bolge = matchedLoc?.bolge || 'Genel';

      if (sehir && sehir !== 'Belirtilmedi') sehirlerSet.add(sehir);
      if (bolge && bolge !== 'Genel') bolgelerSet.add(bolge);

      if (!map[servisKey]) {
        map[servisKey] = {
          servis: servisKey,
          sehir,
          bolge,
          totalCiro: 0,
          totalUsage: 0,
          vehiclePlates: new Set<string>(),
          bosch: { count: 0, ciro: 0, items: {} },
          nonBosch: { count: 0, ciro: 0, items: {} },
          motorYagi: { count: 0, ciro: 0, items: {} },
          iscilik: { count: 0, ciro: 0, items: {} },
          boschParcaPayi: 0
        };
      }

      const bcs = map[servisKey];
      const tutar = r.tutar || 0;
      const plate = (r.plaka || '').trim().toUpperCase();
      const vehicleKey = plate || `VEH_${servisKey}_${idx}`;

      bcs.totalCiro += tutar;
      bcs.totalUsage += 1;
      bcs.vehiclePlates.add(vehicleKey);

      totals.totalCiro += tutar;
      totals.totalUsage += 1;
      totals.uniqueVehicles.add(vehicleKey);

      const itemName = r.eslesenKatalog && r.eslesenKatalog !== 'Eşleşmedi' ? r.eslesenKatalog : (r.orijinalKodAd || 'Bilinmeyen Parça');
      const itemCode = r.ph3Code || r.orijinalKodAd || '-';
      const itemCat = r.seviye1 || 'Genel Bakım';

      const updateCategory = (catStats: SubCategoryStats, globalMetric: { count: number; ciro: number }) => {
        catStats.count += 1;
        catStats.ciro += tutar;
        globalMetric.count += 1;
        globalMetric.ciro += tutar;

        const pKey = `${itemCode}__${itemName}`;
        if (!catStats.items[pKey]) {
          catStats.items[pKey] = {
            code: itemCode,
            name: itemName,
            count: 0,
            ciro: 0,
            category: itemCat
          };
        }
        catStats.items[pKey].count += 1;
        catStats.items[pKey].ciro += tutar;
      };

      // 1. Bosch Parça vs 2. Diğer Parça vs 3. Motor Yağı vs 4. İşçilik
      if (r.anaTur === 'ISCILIK' || r.isIscilik) {
        updateCategory(bcs.iscilik, totals.iscilik);
      } else if (r.anaTur === 'YAG' || r.isYag) {
        updateCategory(bcs.motorYagi, totals.motorYagi);
      } else if (r.anaTur === 'BOSCH' || r.isBosch) {
        updateCategory(bcs.bosch, totals.bosch);
      } else {
        updateCategory(bcs.nonBosch, totals.nonBosch);
      }
    });

    // Oranları hesapla
    const bcsArray = Object.values(map).map(b => {
      const toplamParcaCirosu = b.bosch.ciro + b.nonBosch.ciro;
      b.boschParcaPayi = toplamParcaCirosu > 0 ? (b.bosch.ciro / toplamParcaCirosu) * 100 : 0;
      return b;
    });

    totals.bcsCount = bcsArray.length;

    return {
      bcsList: bcsArray,
      grandTotals: totals,
      allBolgeler: Array.from(bolgelerSet).sort(),
      allSehirler: Array.from(sehirlerSet).sort()
    };
  }, [data, servisLocations]);

  // Filtreleme & Sıralama
  const filteredAndSortedBcs = useMemo(() => {
    return bcsList
      .filter(item => {
        const matchesSearch = 
          item.servis.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sehir.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.bolge.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesBolge = selectedBolge === 'all' || item.bolge === selectedBolge;
        const matchesSehir = selectedSehir === 'all' || item.sehir === selectedSehir;

        return matchesSearch && matchesBolge && matchesSehir;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;

        switch (sortBy) {
          case 'totalCiro':
            valA = a.totalCiro;
            valB = b.totalCiro;
            break;
          case 'boschCiro':
            valA = a.bosch.ciro;
            valB = b.bosch.ciro;
            break;
          case 'nonBoschCiro':
            valA = a.nonBosch.ciro;
            valB = b.nonBosch.ciro;
            break;
          case 'yagCiro':
            valA = a.motorYagi.ciro;
            valB = b.motorYagi.ciro;
            break;
          case 'totalUsage':
            valA = a.totalUsage;
            valB = b.totalUsage;
            break;
          case 'boschUsage':
            valA = a.bosch.count;
            valB = b.bosch.count;
            break;
          case 'nonBoschUsage':
            valA = a.nonBosch.count;
            valB = b.nonBosch.count;
            break;
          case 'yagUsage':
            valA = a.motorYagi.count;
            valB = b.motorYagi.count;
            break;
          case 'boschParcaPayi':
            valA = a.boschParcaPayi;
            valB = b.boschParcaPayi;
            break;
          case 'name':
            return sortOrder === 'asc' 
              ? a.servis.localeCompare(b.servis, 'tr')
              : b.servis.localeCompare(a.servis, 'tr');
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [bcsList, searchTerm, selectedBolge, selectedSehir, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // CSV Export Fonksiyonu
  const exportToCsv = () => {
    const headers = [
      'Sıra',
      'BCS / Servis Adı',
      'Şehir',
      'Bölge',
      'Bosch Parça Adet',
      'Bosch Parça Cirosu (TL)',
      'Bosch Ciro Payı (%)',
      'Bosch Olmayan Parça Adet',
      'Bosch Olmayan Ciro (TL)',
      'Bosch Olmayan Ciro Payı (%)',
      'Motor Yağı Adet',
      'Motor Yağı Cirosu (TL)',
      'Motor Yağı Ciro Payı (%)',
      'İşçilik Adet',
      'İşçilik Cirosu (TL)',
      'Toplam Kalem Adet',
      'Genel Toplam Ciro (TL)',
      'Bosch Parça Penetrasyonu (%)'
    ];

    const rows = filteredAndSortedBcs.map((bcs, idx) => {
      const bParcaPayi = (bcs.bosch.ciro + bcs.nonBosch.ciro) > 0 ? ((bcs.bosch.ciro / (bcs.bosch.ciro + bcs.nonBosch.ciro)) * 100).toFixed(1) : '0';
      const bCiroPayi = bcs.totalCiro > 0 ? ((bcs.bosch.ciro / bcs.totalCiro) * 100).toFixed(1) : '0';
      const nonBCiroPayi = bcs.totalCiro > 0 ? ((bcs.nonBosch.ciro / bcs.totalCiro) * 100).toFixed(1) : '0';
      const yagCiroPayi = bcs.totalCiro > 0 ? ((bcs.motorYagi.ciro / bcs.totalCiro) * 100).toFixed(1) : '0';

      return [
        idx + 1,
        `"${bcs.servis.replace(/"/g, '""')}"`,
        `"${bcs.sehir}"`,
        `"${bcs.bolge}"`,
        bcs.bosch.count,
        bcs.bosch.ciro,
        bCiroPayi,
        bcs.nonBosch.count,
        bcs.nonBosch.ciro,
        nonBCiroPayi,
        bcs.motorYagi.count,
        bcs.motorYagi.ciro,
        yagCiroPayi,
        bcs.iscilik.count,
        bcs.iscilik.ciro,
        bcs.totalUsage,
        bcs.totalCiro,
        bParcaPayi
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bcs_ciro_ve_parca_analizi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Grafik için ilk 10 veya 15 BCS verisi
  const chartData = useMemo(() => {
    return filteredAndSortedBcs.slice(0, 12).map(b => {
      const shortName = b.servis.length > 20 ? b.servis.substring(0, 18) + '...' : b.servis;
      if (chartMetric === 'ciro') {
        return {
          name: shortName,
          fullName: b.servis,
          sehir: b.sehir,
          '1. Bosch Parça Cirosu': b.bosch.ciro,
          '2. Diğer Parça Cirosu': b.nonBosch.ciro,
          '3. Motor Yağı Cirosu': b.motorYagi.ciro,
          'İşçilik Cirosu': showIscilik ? b.iscilik.ciro : 0,
          total: b.totalCiro
        };
      } else {
        return {
          name: shortName,
          fullName: b.servis,
          sehir: b.sehir,
          '1. Bosch Parça (Adet)': b.bosch.count,
          '2. Diğer Parça (Adet)': b.nonBosch.count,
          '3. Motor Yağı (Adet)': b.motorYagi.count,
          'İşçilik (Adet)': showIscilik ? b.iscilik.count : 0,
          total: b.totalUsage
        };
      }
    });
  }, [filteredAndSortedBcs, chartMetric, showIscilik]);

  // Pasta Grafik Kategorik Toplam Ciro Dağılımı
  const pieData = useMemo(() => {
    const raw = [
      { name: '1. Bosch Parça Cirosu', value: grandTotals.bosch.ciro, color: '#2563eb' },
      { name: '2. Diğer Parça Cirosu', value: grandTotals.nonBosch.ciro, color: '#f59e0b' },
      { name: '3. Motor Yağı Cirosu', value: grandTotals.motorYagi.ciro, color: '#06b6d4' },
      ...(showIscilik ? [{ name: 'İşçilik Cirosu', value: grandTotals.iscilik.ciro, color: '#10b981' }] : [])
    ];
    return raw.filter(item => item.value > 0);
  }, [grandTotals, showIscilik]);

  const totalParcaCirosu = grandTotals.bosch.ciro + grandTotals.nonBosch.ciro;
  const genelBoschParcaPayi = totalParcaCirosu > 0 ? Math.round((grandTotals.bosch.ciro / totalParcaCirosu) * 100) : 0;
  const genelBoschCiroOrani = grandTotals.totalCiro > 0 ? Math.round((grandTotals.bosch.ciro / grandTotals.totalCiro) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header & Açıklama */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                BCS Bazında Ciro & Parça Kullanım Analizi
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Bosch Car Service noktaları bazında <strong>1. Bosch Parça</strong>, <strong>2. Bosch Olmayan (Diğer) Parça</strong> ve <strong>3. Motor Yağı</strong> ciroları ve kullanım adetleri.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowIscilik(prev => !prev)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-xs ${
              showIscilik 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="İşçilik sütununu ve grafiğini aç/kapat"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>İşçilik: {showIscilik ? 'Gösteriliyor' : 'Gizlendi'}</span>
          </button>

          <button
            onClick={exportToCsv}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Excel / CSV İndir</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Özet Kartları (Sırasıyla 1. Bosch, 2. Diğer, 3. Motor Yağı) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Toplam BCS & Genel Ciro */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Toplam Genel Ciro</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 block tracking-tight">
              {formatCurrency(grandTotals.totalCiro)}
            </span>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                {grandTotals.bcsCount} BCS
              </span>
              <span>&bull; {formatNumber(grandTotals.totalUsage)} Toplam Kalem</span>
            </div>
          </div>
        </div>

        {/* 1. Bosch Parça Kullanımı / Cirosu */}
        <div className="bg-gradient-to-br from-blue-50/70 to-blue-100/30 p-5 rounded-xl border border-blue-200 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              1. Bosch Parça Cirosu
            </span>
            <span className="text-[11px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-full">
              %{genelBoschParcaPayi} Parça Payı
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-blue-700 block tracking-tight">
              {formatCurrency(grandTotals.bosch.ciro)}
            </span>
            <div className="flex items-center justify-between mt-1.5 text-xs text-blue-900 font-medium">
              <span>{formatNumber(grandTotals.bosch.count)} Kalem Kullanım</span>
              <span className="text-slate-500">Genel Ciro Payı: %{genelBoschCiroOrani}</span>
            </div>
          </div>
        </div>

        {/* 2. Bosch Olmayan (Diğer) Parça Kullanımı / Cirosu */}
        <div className="bg-gradient-to-br from-amber-50/70 to-amber-100/30 p-5 rounded-xl border border-amber-200 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              2. Diğer Parça Cirosu
            </span>
            <span className="text-[11px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full">
              %{100 - genelBoschParcaPayi} Parça Payı
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-700 block tracking-tight">
              {formatCurrency(grandTotals.nonBosch.ciro)}
            </span>
            <div className="flex items-center justify-between mt-1.5 text-xs text-amber-900 font-medium">
              <span>{formatNumber(grandTotals.nonBosch.count)} Kalem Kullanım</span>
              <span className="text-slate-500">Fırsat Alanı</span>
            </div>
          </div>
        </div>

        {/* 3. Motor Yağı Kullanımı / Cirosu */}
        <div className="bg-gradient-to-br from-cyan-50/70 to-cyan-100/30 p-5 rounded-xl border border-cyan-200 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-800 uppercase tracking-wider flex items-center gap-1">
              <Droplet className="w-3.5 h-3.5 text-cyan-600" />
              3. Motor Yağı Cirosu
            </span>
            <span className="text-[11px] font-extrabold bg-cyan-600 text-white px-2 py-0.5 rounded-full">
              %{grandTotals.totalCiro > 0 ? Math.round((grandTotals.motorYagi.ciro / grandTotals.totalCiro) * 100) : 0} Pay
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-cyan-700 block tracking-tight">
              {formatCurrency(grandTotals.motorYagi.ciro)}
            </span>
            <div className="flex items-center justify-between mt-1.5 text-xs text-cyan-900 font-medium">
              <span>{formatNumber(grandTotals.motorYagi.count)} Kalem / Sıvı</span>
              <span className="text-slate-500">Yağ & Katkı</span>
            </div>
          </div>
        </div>

        {/* İşçilik Cirosu */}
        <div className="bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 p-5 rounded-xl border border-emerald-200 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-emerald-600" />
              İşçilik & Bakım Cirosu
            </span>
            <span className="text-[11px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
              %{grandTotals.totalCiro > 0 ? Math.round((grandTotals.iscilik.ciro / grandTotals.totalCiro) * 100) : 0} Pay
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700 block tracking-tight">
              {formatCurrency(grandTotals.iscilik.ciro)}
            </span>
            <div className="flex items-center justify-between mt-1.5 text-xs text-emerald-900 font-medium">
              <span>{formatNumber(grandTotals.iscilik.count)} Servis İşlemi</span>
              <span className="text-slate-500">Mekanik/Bakım</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Görsel Karşılaştırma & Dağılım Grafikleri */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BCS Sıralamalı Çubuk Grafik */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>En Yüksek Hacimli BCS Noktaları Dağılımı (İlk 12)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Her servisin 1. Bosch Parça, 2. Diğer Parça, 3. Motor Yağı ve İşçilik {chartMetric === 'ciro' ? 'ciro (₺)' : 'kullanım (adet)'} kırılımları.
              </p>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setChartMetric('ciro')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  chartMetric === 'ciro' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ciro (₺)
              </button>
              <button
                onClick={() => setChartMetric('usage')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  chartMetric === 'usage' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kullanım (Adet)
              </button>
            </div>
          </div>

          <div className="h-[320px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  angle={-30} 
                  textAnchor="end" 
                  interval={0} 
                  tick={{ fontSize: 11, fill: '#475569' }} 
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#475569' }} 
                  tickFormatter={(val) => chartMetric === 'ciro' ? `${(val / 1000).toFixed(0)}k₺` : `${val}`}
                />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    chartMetric === 'ciro' ? formatCurrency(Number(value)) : `${formatNumber(Number(value))} Adet`,
                    name
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]?.payload?.fullName) {
                      return `${payload[0].payload.fullName} (${payload[0].payload.sehir || 'Genel'})`;
                    }
                    return label;
                  }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar 
                  dataKey={chartMetric === 'ciro' ? '1. Bosch Parça Cirosu' : '1. Bosch Parça (Adet)'} 
                  stackId="a" 
                  fill="#2563eb" 
                  radius={[0, 0, 0, 0]} 
                />
                <Bar 
                  dataKey={chartMetric === 'ciro' ? '2. Diğer Parça Cirosu' : '2. Diğer Parça (Adet)'} 
                  stackId="a" 
                  fill="#f59e0b" 
                  radius={[0, 0, 0, 0]} 
                />
                <Bar 
                  dataKey={chartMetric === 'ciro' ? '3. Motor Yağı Cirosu' : '3. Motor Yağı (Adet)'} 
                  stackId="a" 
                  fill="#06b6d4" 
                  radius={[0, 0, 0, 0]} 
                />
                {showIscilik && (
                  <Bar 
                    dataKey={chartMetric === 'ciro' ? 'İşçilik Cirosu' : 'İşçilik (Adet)'} 
                    stackId="a" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Genel Ciro Pasta Grafiği & Penetrasyon Göstergesi */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-600" />
                <span>Toplam Ciro Bileşimi</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">Tüm BCS</span>
            </div>

            <div className="h-[200px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Ciro']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-2">
              {pieData.map((item, i) => {
                const pct = grandTotals.totalCiro > 0 ? ((item.value / grandTotals.totalCiro) * 100).toFixed(1) : '0';
                return (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-700 font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{formatCurrency(item.value)}</span>
                      <span className="text-slate-400 font-semibold w-10 text-right">%{pct}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-lg">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600 font-semibold">Parça Bazlı Bosch Payı</span>
              <span className="font-black text-blue-700">%{genelBoschParcaPayi}</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
              <div className="bg-blue-600 h-full" style={{ width: `${genelBoschParcaPayi}%` }} />
              <div className="bg-amber-500 h-full" style={{ width: `${100 - genelBoschParcaPayi}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
              <span>Bosch Parça: {formatCurrency(grandTotals.bosch.ciro)}</span>
              <span>Diğer Parça: {formatCurrency(grandTotals.nonBosch.ciro)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Arama, Filtreleme ve Sıralama Çubuğu */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Arama */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="BCS adı, şehir veya bölge ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Şehir ve Bölge Filtreleri */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          {allBolgeler.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBolge}
                onChange={(e) => setSelectedBolge(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Tüm Bölgeler ({allBolgeler.length})</option>
                {allBolgeler.map((b, i) => (
                  <option key={i} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}

          {allSehirler.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSehir}
                onChange={(e) => setSelectedSehir(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Tüm Şehirler ({allSehirler.length})</option>
                {allSehirler.map((s, i) => (
                  <option key={i} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <div className="text-xs text-slate-500 font-medium ml-auto">
            Toplam <strong>{filteredAndSortedBcs.length}</strong> BCS listeleniyor
          </div>
        </div>
      </div>

      {/* 5. Ana Derli Toplu BCS Tablosu (Sırasıyla 1. Bosch Parça, 2. Diğer Parça, 3. Motor Yağı) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {/* Grup Başlıkları */}
              <tr className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <th colSpan={3} className="px-4 py-2 border-r border-slate-200">
                  Servis Bilgisi
                </th>
                <th colSpan={2} className="px-4 py-2 text-center bg-blue-100/70 text-blue-900 border-r border-blue-200">
                  1. Bosch Parça Kullanımı & Cirosu
                </th>
                <th colSpan={2} className="px-4 py-2 text-center bg-amber-100/70 text-amber-900 border-r border-amber-200">
                  2. Bosch Olmayan (Diğer) Parça
                </th>
                <th colSpan={2} className="px-4 py-2 text-center bg-cyan-100/70 text-cyan-900 border-r border-cyan-200">
                  3. Motor Yağı Kullanımı & Cirosu
                </th>
                {showIscilik && (
                  <th colSpan={2} className="px-4 py-2 text-center bg-emerald-100/70 text-emerald-900 border-r border-emerald-200">
                    İşçilik Hizmeti
                  </th>
                )}
                <th colSpan={3} className="px-4 py-2 text-center bg-slate-200 text-slate-800">
                  Toplam & Penetrasyon
                </th>
              </tr>

              {/* Sütun Başlıkları */}
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                <th className="px-3 py-3 w-10 text-center">#</th>
                <th 
                  onClick={() => handleSort('name')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>BCS / Servis Adı</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-3 text-slate-500 border-r border-slate-200">
                  Lokasyon
                </th>

                {/* 1. Bosch Parça */}
                <th 
                  onClick={() => handleSort('boschUsage')}
                  className="px-3 py-3 text-right bg-blue-50/40 cursor-pointer hover:bg-blue-100/50 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Kullanım (Ad.)</span>
                    <ArrowUpDown className="w-3 h-3 text-blue-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('boschCiro')}
                  className="px-4 py-3 text-right bg-blue-50/70 font-bold text-blue-900 border-r border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Bosch Cirosu (₺)</span>
                    <ArrowUpDown className="w-3 h-3 text-blue-700" />
                  </div>
                </th>

                {/* 2. Diğer Parça */}
                <th 
                  onClick={() => handleSort('nonBoschUsage')}
                  className="px-3 py-3 text-right bg-amber-50/40 cursor-pointer hover:bg-amber-100/50 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Kullanım (Ad.)</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('nonBoschCiro')}
                  className="px-4 py-3 text-right bg-amber-50/70 font-bold text-amber-900 border-r border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Diğer Cirosu (₺)</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-700" />
                  </div>
                </th>

                {/* 3. Motor Yağı */}
                <th 
                  onClick={() => handleSort('yagUsage')}
                  className="px-3 py-3 text-right bg-cyan-50/40 cursor-pointer hover:bg-cyan-100/50 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Kullanım (Ad.)</span>
                    <ArrowUpDown className="w-3 h-3 text-cyan-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('yagCiro')}
                  className="px-4 py-3 text-right bg-cyan-50/70 font-bold text-cyan-900 border-r border-cyan-200 cursor-pointer hover:bg-cyan-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Yağ Cirosu (₺)</span>
                    <ArrowUpDown className="w-3 h-3 text-cyan-700" />
                  </div>
                </th>

                {/* İşçilik */}
                {showIscilik && (
                  <>
                    <th className="px-3 py-3 text-right bg-emerald-50/40">Kullanım</th>
                    <th className="px-4 py-3 text-right bg-emerald-50/70 font-bold text-emerald-900 border-r border-emerald-200">
                      İşçilik Cirosu (₺)
                    </th>
                  </>
                )}

                {/* Toplam Ciro & Bosch Penetrasyonu */}
                <th 
                  onClick={() => handleSort('totalUsage')}
                  className="px-3 py-3 text-right cursor-pointer hover:bg-slate-100"
                >
                  Toplam Ad.
                </th>
                <th 
                  onClick={() => handleSort('totalCiro')}
                  className="px-4 py-3 text-right font-black text-slate-900 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Toplam Ciro (₺)</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('boschParcaPayi')}
                  className="px-3 py-3 text-center font-bold text-blue-800 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Bosch Payı (%)</span>
                    <ArrowUpDown className="w-3 h-3 text-blue-600" />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAndSortedBcs.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-slate-400 italic">
                    Arama kriterlerine uygun BCS kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredAndSortedBcs.map((bcs, idx) => {
                  const bParcaPayi = (bcs.bosch.ciro + bcs.nonBosch.ciro) > 0 
                    ? Math.round((bcs.bosch.ciro / (bcs.bosch.ciro + bcs.nonBosch.ciro)) * 100) 
                    : 0;

                  return (
                    <tr 
                      key={idx}
                      onClick={() => setSelectedBcsModal(bcs)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-3 py-3 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      {/* BCS Adı */}
                      <td className="px-4 py-3 font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                          <span className="truncate max-w-[220px]" title={bcs.servis}>
                            {bcs.servis}
                          </span>
                        </div>
                      </td>

                      {/* Şehir & Bölge */}
                      <td className="px-3 py-3 border-r border-slate-100">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-700 text-[11px] truncate max-w-[100px]">
                            {bcs.sehir}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                            {bcs.bolge}
                          </span>
                        </div>
                      </td>

                      {/* 1. Bosch Parça */}
                      <td className="px-3 py-3 text-right bg-blue-50/20 font-medium text-blue-900">
                        {formatNumber(bcs.bosch.count)}
                      </td>
                      <td className="px-4 py-3 text-right bg-blue-50/40 font-bold text-blue-700 border-r border-blue-100">
                        {formatCurrency(bcs.bosch.ciro)}
                      </td>

                      {/* 2. Diğer Parça */}
                      <td className="px-3 py-3 text-right bg-amber-50/20 font-medium text-amber-900">
                        {formatNumber(bcs.nonBosch.count)}
                      </td>
                      <td className="px-4 py-3 text-right bg-amber-50/40 font-bold text-amber-700 border-r border-amber-100">
                        {formatCurrency(bcs.nonBosch.ciro)}
                      </td>

                      {/* 3. Motor Yağı */}
                      <td className="px-3 py-3 text-right bg-cyan-50/20 font-medium text-cyan-900">
                        {formatNumber(bcs.motorYagi.count)}
                      </td>
                      <td className="px-4 py-3 text-right bg-cyan-50/40 font-bold text-cyan-700 border-r border-cyan-100">
                        {formatCurrency(bcs.motorYagi.ciro)}
                      </td>

                      {/* İşçilik */}
                      {showIscilik && (
                        <>
                          <td className="px-3 py-3 text-right bg-emerald-50/20 font-medium text-emerald-900">
                            {formatNumber(bcs.iscilik.count)}
                          </td>
                          <td className="px-4 py-3 text-right bg-emerald-50/40 font-bold text-emerald-700 border-r border-emerald-100">
                            {formatCurrency(bcs.iscilik.ciro)}
                          </td>
                        </>
                      )}

                      {/* Toplam Adet */}
                      <td className="px-3 py-3 text-right font-medium text-slate-600">
                        {formatNumber(bcs.totalUsage)}
                      </td>

                      {/* Toplam Ciro */}
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        {formatCurrency(bcs.totalCiro)}
                      </td>

                      {/* Bosch Parça Payı (%) */}
                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                          %{bParcaPayi}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Toplam Satırı */}
            {filteredAndSortedBcs.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-slate-900 border-r border-slate-200">
                    FİLTRELENEN TOPLAM ({filteredAndSortedBcs.length} BCS)
                  </td>
                  
                  {/* Bosch Toplam */}
                  <td className="px-3 py-3 text-right text-blue-900 bg-blue-100/60">
                    {formatNumber(filteredAndSortedBcs.reduce((a, b) => a + b.bosch.count, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-blue-800 bg-blue-100/80 border-r border-blue-200">
                    {formatCurrency(filteredAndSortedBcs.reduce((a, b) => a + b.bosch.ciro, 0))}
                  </td>

                  {/* Diğer Toplam */}
                  <td className="px-3 py-3 text-right text-amber-900 bg-amber-100/60">
                    {formatNumber(filteredAndSortedBcs.reduce((a, b) => a + b.nonBosch.count, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-amber-800 bg-amber-100/80 border-r border-amber-200">
                    {formatCurrency(filteredAndSortedBcs.reduce((a, b) => a + b.nonBosch.ciro, 0))}
                  </td>

                  {/* Motor Yağı Toplam */}
                  <td className="px-3 py-3 text-right text-cyan-900 bg-cyan-100/60">
                    {formatNumber(filteredAndSortedBcs.reduce((a, b) => a + b.motorYagi.count, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-cyan-800 bg-cyan-100/80 border-r border-cyan-200">
                    {formatCurrency(filteredAndSortedBcs.reduce((a, b) => a + b.motorYagi.ciro, 0))}
                  </td>

                  {/* İşçilik Toplam */}
                  {showIscilik && (
                    <>
                      <td className="px-3 py-3 text-right text-emerald-900 bg-emerald-100/60">
                        {formatNumber(filteredAndSortedBcs.reduce((a, b) => a + b.iscilik.count, 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-800 bg-emerald-100/80 border-r border-emerald-200">
                        {formatCurrency(filteredAndSortedBcs.reduce((a, b) => a + b.iscilik.ciro, 0))}
                      </td>
                    </>
                  )}

                  {/* Genel Toplam */}
                  <td className="px-3 py-3 text-right text-slate-800">
                    {formatNumber(filteredAndSortedBcs.reduce((a, b) => a + b.totalUsage, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                    {formatCurrency(filteredAndSortedBcs.reduce((a, b) => a + b.totalCiro, 0))}
                  </td>
                  <td className="px-3 py-3 text-center text-blue-900">
                    %{genelBoschParcaPayi}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 6. Seçilen BCS Detay Modalı (1. Bosch Parça, 2. Diğer Parça, 3. Motor Yağı Kalem Dökümleri) */}
      {selectedBcsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {selectedBcsModal.servis}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-blue-100">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedBcsModal.sehir}</span>
                    <span>&bull;</span>
                    <span>{selectedBcsModal.bolge} Bölgesi</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {selectedBcsModal.vehiclePlates.size} Farklı Araç</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedBcsModal(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Mini KPI Kartları */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-xs">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">1. Bosch Parça Cirosu</span>
                  <span className="text-base font-black text-blue-800 mt-1 block">
                    {formatCurrency(selectedBcsModal.bosch.ciro)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedBcsModal.bosch.count} Adet (%{selectedBcsModal.boschParcaPayi.toFixed(0)} Pay)
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">2. Diğer Parça Cirosu</span>
                  <span className="text-base font-black text-amber-800 mt-1 block">
                    {formatCurrency(selectedBcsModal.nonBosch.ciro)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedBcsModal.nonBosch.count} Adet
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-cyan-200 shadow-xs">
                  <span className="text-[10px] font-bold text-cyan-700 uppercase block">3. Motor Yağı Cirosu</span>
                  <span className="text-base font-black text-cyan-800 mt-1 block">
                    {formatCurrency(selectedBcsModal.motorYagi.ciro)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedBcsModal.motorYagi.count} Adet
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-700 uppercase block">Toplam BCS Cirosu</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">
                    {formatCurrency(selectedBcsModal.totalCiro)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedBcsModal.totalUsage} Kalem İşlem
                  </span>
                </div>
              </div>
            </div>

            {/* Detay Sekmeleri (Sırasıyla 1. Bosch, 2. Diğer, 3. Motor Yağı) */}
            <div className="px-6 pt-4 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0 bg-white">
              <button
                onClick={() => setActiveDetailTab('all')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeDetailTab === 'all' 
                    ? 'border-blue-600 text-blue-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Tüm Kalemler ({Object.keys(selectedBcsModal.bosch.items).length + Object.keys(selectedBcsModal.nonBosch.items).length + Object.keys(selectedBcsModal.motorYagi.items).length})
              </button>

              <button
                onClick={() => setActiveDetailTab('bosch')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                  activeDetailTab === 'bosch' 
                    ? 'border-blue-600 text-blue-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>1. Bosch Parçaları ({Object.keys(selectedBcsModal.bosch.items).length})</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('nonBosch')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                  activeDetailTab === 'nonBosch' 
                    ? 'border-amber-600 text-amber-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Diğer Marka Parçalar ({Object.keys(selectedBcsModal.nonBosch.items).length})</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('yag')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                  activeDetailTab === 'yag' 
                    ? 'border-cyan-600 text-cyan-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Droplet className="w-3.5 h-3.5 text-cyan-600" />
                <span>3. Motor Yağları ({Object.keys(selectedBcsModal.motorYagi.items).length})</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('iscilik')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                  activeDetailTab === 'iscilik' 
                    ? 'border-emerald-600 text-emerald-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                <span>İşçilikler ({Object.keys(selectedBcsModal.iscilik.items).length})</span>
              </button>
            </div>

            {/* Ürün Listesi */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {(() => {
                let itemsList: { type: string; code: string; name: string; count: number; ciro: number; category: string }[] = [];

                if (activeDetailTab === 'all' || activeDetailTab === 'bosch') {
                  itemsList.push(...Object.values(selectedBcsModal.bosch.items).map(i => ({ ...i, type: 'Bosch Parça' })));
                }
                if (activeDetailTab === 'all' || activeDetailTab === 'nonBosch') {
                  itemsList.push(...Object.values(selectedBcsModal.nonBosch.items).map(i => ({ ...i, type: 'Diğer Parça' })));
                }
                if (activeDetailTab === 'all' || activeDetailTab === 'yag') {
                  itemsList.push(...Object.values(selectedBcsModal.motorYagi.items).map(i => ({ ...i, type: 'Motor Yağı' })));
                }
                if (activeDetailTab === 'all' || activeDetailTab === 'iscilik') {
                  itemsList.push(...Object.values(selectedBcsModal.iscilik.items).map(i => ({ ...i, type: 'İşçilik' })));
                }

                itemsList.sort((a, b) => b.ciro - a.ciro);

                if (itemsList.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 italic">
                      Bu kategoride kayıtlı parça veya hizmet bulunmamaktadır.
                    </div>
                  );
                }

                return (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5">Kategori / Tür</th>
                          <th className="px-3 py-2.5">Parça / Hizmet Tanımı</th>
                          <th className="px-3 py-2.5">Kod / Referans</th>
                          <th className="px-3 py-2.5 text-right">Adet</th>
                          <th className="px-4 py-2.5 text-right font-bold text-slate-800">Ciro (₺)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemsList.map((item, i) => {
                          const badgeColor = 
                            item.type === 'Bosch Parça' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            item.type === 'Diğer Parça' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            item.type === 'Motor Yağı' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200';

                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-2.5">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-medium text-slate-900">
                                {item.name}
                                <span className="block text-[10px] text-slate-400">{item.category}</span>
                              </td>
                              <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">
                                {item.code}
                              </td>
                              <td className="px-3 py-2.5 text-right font-semibold text-slate-700">
                                {item.count} ad.
                              </td>
                              <td className="px-4 py-2.5 text-right font-black text-slate-900">
                                {formatCurrency(item.ciro)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
