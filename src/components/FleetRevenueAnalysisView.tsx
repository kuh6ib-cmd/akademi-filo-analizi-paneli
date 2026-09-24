import React, { useState, useMemo } from 'react';
import { 
  Building2, 
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
  X, 
  BarChart3, 
  PieChart as PieChartIcon,
  Truck,
  Filter
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
import { ProcessedRecord } from '../lib/engine';

interface FleetRevenueAnalysisViewProps {
  data: ProcessedRecord[];
}

interface SubCategoryStats {
  count: number;
  ciro: number;
  items: Record<string, { code: string; name: string; count: number; ciro: number; category: string }>;
}

interface FleetAggregation {
  filo: string;
  totalCiro: number;
  totalUsage: number;
  vehiclePlates: Set<string>;
  vehicleModels: Record<string, number>;
  serviceUsage: Record<string, { count: number; ciro: number }>;
  
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

export default function FleetRevenueAnalysisView({ data }: FleetRevenueAnalysisViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<
    'totalCiro' | 'boschCiro' | 'nonBoschCiro' | 'yagCiro' | 'totalUsage' | 'boschUsage' | 'nonBoschUsage' | 'yagUsage' | 'boschParcaPayi' | 'vehicleCount' | 'name'
  >('totalCiro');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showIscilik, setShowIscilik] = useState<boolean>(true);
  const [chartMetric, setChartMetric] = useState<'ciro' | 'usage'>('ciro');
  const [selectedFleetModal, setSelectedFleetModal] = useState<FleetAggregation | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'all' | 'bosch' | 'nonBosch' | 'yag' | 'iscilik' | 'vehicles' | 'services'>('all');

  const topService = useMemo(() => {
    if (!selectedFleetModal || !selectedFleetModal.serviceUsage) return null;
    const entries = Object.entries(selectedFleetModal.serviceUsage);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1].count - a[1].count);
    return { name: entries[0][0], count: entries[0][1].count, ciro: entries[0][1].ciro };
  }, [selectedFleetModal]);

  // Format Para
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('tr-TR').format(val);
  };

  // Filo Agregasyon Motoru
  const { fleetList, grandTotals } = useMemo(() => {
    const map: Record<string, FleetAggregation> = {};

    const totals = {
      totalCiro: 0,
      totalUsage: 0,
      uniqueVehicles: new Set<string>(),
      fleetCount: 0,
      bosch: { count: 0, ciro: 0 },
      nonBosch: { count: 0, ciro: 0 },
      motorYagi: { count: 0, ciro: 0 },
      iscilik: { count: 0, ciro: 0 }
    };

    data.forEach((r, idx) => {
      const filoRaw = (r.filoAdi || 'Ana Filo').trim();
      const filoKey = filoRaw;

      if (!map[filoKey]) {
        map[filoKey] = {
          filo: filoKey,
          totalCiro: 0,
          totalUsage: 0,
          vehiclePlates: new Set<string>(),
          vehicleModels: {},
          serviceUsage: {},
          bosch: { count: 0, ciro: 0, items: {} },
          nonBosch: { count: 0, ciro: 0, items: {} },
          motorYagi: { count: 0, ciro: 0, items: {} },
          iscilik: { count: 0, ciro: 0, items: {} },
          boschParcaPayi: 0
        };
      }

      const fleet = map[filoKey];
      const tutar = r.tutar || 0;
      const plate = (r.plaka || '').trim().toUpperCase();
      const vehicleKey = plate || `VEH_${filoKey}_${idx}`;
      const modelKey = `${r.aracMarka || 'Diğer'} ${r.aracModel || ''}`.trim();
      const serviceName = (r.servisIsmi || 'Genel Servis').trim();

      fleet.totalCiro += tutar;
      fleet.totalUsage += 1;
      fleet.vehiclePlates.add(vehicleKey);
      if (modelKey) {
        fleet.vehicleModels[modelKey] = (fleet.vehicleModels[modelKey] || 0) + 1;
      }
      if (!fleet.serviceUsage[serviceName]) {
        fleet.serviceUsage[serviceName] = { count: 0, ciro: 0 };
      }
      fleet.serviceUsage[serviceName].count += 1;
      fleet.serviceUsage[serviceName].ciro += tutar;

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
        updateCategory(fleet.iscilik, totals.iscilik);
      } else if (r.anaTur === 'YAG' || r.isYag) {
        updateCategory(fleet.motorYagi, totals.motorYagi);
      } else if (r.anaTur === 'BOSCH' || r.isBosch) {
        updateCategory(fleet.bosch, totals.bosch);
      } else {
        updateCategory(fleet.nonBosch, totals.nonBosch);
      }
    });

    // Oranları hesapla
    const fleetArray = Object.values(map).map(f => {
      const toplamParcaCirosu = f.bosch.ciro + f.nonBosch.ciro;
      f.boschParcaPayi = toplamParcaCirosu > 0 ? (f.bosch.ciro / toplamParcaCirosu) * 100 : 0;
      return f;
    });

    totals.fleetCount = fleetArray.length;

    return {
      fleetList: fleetArray,
      grandTotals: totals
    };
  }, [data]);

  // Filtreleme & Sıralama
  const filteredAndSortedFleets = useMemo(() => {
    return fleetList
      .filter(item => item.filo.toLowerCase().includes(searchTerm.toLowerCase()))
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
          case 'vehicleCount':
            valA = a.vehiclePlates.size;
            valB = b.vehiclePlates.size;
            break;
          case 'name':
            return sortOrder === 'asc' 
              ? a.filo.localeCompare(b.filo, 'tr')
              : b.filo.localeCompare(a.filo, 'tr');
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [fleetList, searchTerm, sortBy, sortOrder]);

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
      'Filo / Firma Adı',
      'Araç Sayısı',
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

    const rows = filteredAndSortedFleets.map((fleet, idx) => {
      const bParcaPayi = (fleet.bosch.ciro + fleet.nonBosch.ciro) > 0 ? ((fleet.bosch.ciro / (fleet.bosch.ciro + fleet.nonBosch.ciro)) * 100).toFixed(1) : '0';
      const bCiroPayi = fleet.totalCiro > 0 ? ((fleet.bosch.ciro / fleet.totalCiro) * 100).toFixed(1) : '0';
      const nonBCiroPayi = fleet.totalCiro > 0 ? ((fleet.nonBosch.ciro / fleet.totalCiro) * 100).toFixed(1) : '0';
      const yagCiroPayi = fleet.totalCiro > 0 ? ((fleet.motorYagi.ciro / fleet.totalCiro) * 100).toFixed(1) : '0';

      return [
        idx + 1,
        `"${fleet.filo.replace(/"/g, '""')}"`,
        fleet.vehiclePlates.size,
        fleet.bosch.count,
        fleet.bosch.ciro,
        bCiroPayi,
        fleet.nonBosch.count,
        fleet.nonBosch.ciro,
        nonBCiroPayi,
        fleet.motorYagi.count,
        fleet.motorYagi.ciro,
        yagCiroPayi,
        fleet.iscilik.count,
        fleet.iscilik.ciro,
        fleet.totalUsage,
        fleet.totalCiro,
        bParcaPayi
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `filo_ciro_ve_parca_analizi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Grafik için ilk 12 Filo verisi
  const chartData = useMemo(() => {
    return filteredAndSortedFleets.slice(0, 12).map(f => {
      const shortName = f.filo.length > 20 ? f.filo.substring(0, 18) + '...' : f.filo;
      if (chartMetric === 'ciro') {
        return {
          name: shortName,
          fullName: f.filo,
          '1. Bosch Parça Cirosu': f.bosch.ciro,
          '2. Diğer Parça Cirosu': f.nonBosch.ciro,
          '3. Motor Yağı Cirosu': f.motorYagi.ciro,
          'İşçilik Cirosu': showIscilik ? f.iscilik.ciro : 0,
          total: f.totalCiro
        };
      } else {
        return {
          name: shortName,
          fullName: f.filo,
          '1. Bosch Parça (Adet)': f.bosch.count,
          '2. Diğer Parça (Adet)': f.nonBosch.count,
          '3. Motor Yağı (Adet)': f.motorYagi.count,
          'İşçilik (Adet)': showIscilik ? f.iscilik.count : 0,
          total: f.totalUsage
        };
      }
    });
  }, [filteredAndSortedFleets, chartMetric, showIscilik]);

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
            <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                Filo Bazında Ciro & Parça Kullanım Analizi
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Filolar ve müşteri grupları bazında <strong>1. Bosch Parça</strong>, <strong>2. Bosch Olmayan (Diğer) Parça</strong> ve <strong>3. Motor Yağı</strong> ciroları ve kullanım adetleri.
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
        {/* Toplam Filo & Genel Ciro */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filolar Genel Ciro</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 block tracking-tight">
              {formatCurrency(grandTotals.totalCiro)}
            </span>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                {grandTotals.fleetCount} Filo
              </span>
              <span>&bull; {formatNumber(grandTotals.uniqueVehicles.size)} Tekil Araç</span>
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
              <span className="text-slate-500">Ciro Payı: %{genelBoschCiroOrani}</span>
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
              <span className="text-slate-500">Dönüşüm Alanı</span>
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
              <span>{formatNumber(grandTotals.motorYagi.count)} Sıvı / Dolum</span>
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
              <span className="text-slate-500">İşçilik Hizmeti</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Görsel Karşılaştırma & Dağılım Grafikleri */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filo Sıralamalı Çubuk Grafik */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>En Yüksek Hacimli Filolar Dağılımı (İlk 12)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Her filonun 1. Bosch Parça, 2. Diğer Parça, 3. Motor Yağı ve İşçilik {chartMetric === 'ciro' ? 'ciro (₺)' : 'kullanım (adet)'} kırılımları.
              </p>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setChartMetric('ciro')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  chartMetric === 'ciro' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ciro (₺)
              </button>
              <button
                onClick={() => setChartMetric('usage')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  chartMetric === 'usage' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                      return payload[0].payload.fullName;
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
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                <span>Filolar Ciro Bileşimi</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">Tüm Filolar</span>
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

      {/* 4. Arama ve Sıralama Çubuğu */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filo / Firma adı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Toplam <strong>{filteredAndSortedFleets.length}</strong> filo / müşteri grubu listeleniyor
        </div>
      </div>

      {/* 5. Ana Derli Toplu Filo Tablosu (Sırasıyla 1. Bosch Parça, 2. Diğer Parça, 3. Motor Yağı) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {/* Grup Başlıkları */}
              <tr className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <th colSpan={3} className="px-4 py-2 border-r border-slate-200">
                  Filo & Araç Bilgisi
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
                    <span>Filo / Firma Adı</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('vehicleCount')}
                  className="px-3 py-3 text-center text-slate-600 border-r border-slate-200 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Araç (Plaka)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
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
              {filteredAndSortedFleets.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-slate-400 italic">
                    Arama kriterlerine uygun filo kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredAndSortedFleets.map((fleet, idx) => {
                  const bParcaPayi = (fleet.bosch.ciro + fleet.nonBosch.ciro) > 0 
                    ? Math.round((fleet.bosch.ciro / (fleet.bosch.ciro + fleet.nonBosch.ciro)) * 100) 
                    : 0;

                  return (
                    <tr 
                      key={idx}
                      onClick={() => setSelectedFleetModal(fleet)}
                      className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-3 py-3 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      {/* Filo Adı */}
                      <td className="px-4 py-3 font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[240px]" title={fleet.filo}>
                            {fleet.filo}
                          </span>
                        </div>
                      </td>

                      {/* Tekil Araç Sayısı */}
                      <td className="px-3 py-3 text-center border-r border-slate-100 font-medium text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold">
                          {fleet.vehiclePlates.size} araç
                        </span>
                      </td>

                      {/* 1. Bosch Parça */}
                      <td className="px-3 py-3 text-right bg-blue-50/20 font-medium text-blue-900">
                        {formatNumber(fleet.bosch.count)}
                      </td>
                      <td className="px-4 py-3 text-right bg-blue-50/40 font-bold text-blue-700 border-r border-blue-100">
                        {formatCurrency(fleet.bosch.ciro)}
                      </td>

                      {/* 2. Diğer Parça */}
                      <td className="px-3 py-3 text-right bg-amber-50/20 font-medium text-amber-900">
                        {formatNumber(fleet.nonBosch.count)}
                      </td>
                      <td className="px-4 py-3 text-right bg-amber-50/40 font-bold text-amber-700 border-r border-amber-100">
                        {formatCurrency(fleet.nonBosch.ciro)}
                      </td>

                      {/* 3. Motor Yağı */}
                      <td className="px-3 py-3 text-right bg-cyan-50/20 font-medium text-cyan-900">
                        {formatNumber(fleet.motorYagi.count)}
                      </td>
                      <td className="px-4 py-3 text-right bg-cyan-50/40 font-bold text-cyan-700 border-r border-cyan-100">
                        {formatCurrency(fleet.motorYagi.ciro)}
                      </td>

                      {/* İşçilik */}
                      {showIscilik && (
                        <>
                          <td className="px-3 py-3 text-right bg-emerald-50/20 font-medium text-emerald-900">
                            {formatNumber(fleet.iscilik.count)}
                          </td>
                          <td className="px-4 py-3 text-right bg-emerald-50/40 font-bold text-emerald-700 border-r border-emerald-100">
                            {formatCurrency(fleet.iscilik.ciro)}
                          </td>
                        </>
                      )}

                      {/* Toplam Adet */}
                      <td className="px-3 py-3 text-right font-medium text-slate-600">
                        {formatNumber(fleet.totalUsage)}
                      </td>

                      {/* Toplam Ciro */}
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        {formatCurrency(fleet.totalCiro)}
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
            {filteredAndSortedFleets.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-slate-900">
                    FİLTRELENEN TOPLAM ({filteredAndSortedFleets.length} Filo)
                  </td>
                  <td className="px-3 py-3 text-center border-r border-slate-200 font-black text-slate-800">
                    {formatNumber(grandTotals.uniqueVehicles.size)} Araç
                  </td>
                  
                  {/* Bosch Toplam */}
                  <td className="px-3 py-3 text-right text-blue-900 bg-blue-100/60">
                    {formatNumber(filteredAndSortedFleets.reduce((a, b) => a + b.bosch.count, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-blue-800 bg-blue-100/80 border-r border-blue-200">
                    {formatCurrency(filteredAndSortedFleets.reduce((a, b) => a + b.bosch.ciro, 0))}
                  </td>

                  {/* Diğer Toplam */}
                  <td className="px-3 py-3 text-right text-amber-900 bg-amber-100/60">
                    {formatNumber(filteredAndSortedFleets.reduce((a, b) => a + b.nonBosch.count, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-amber-800 bg-amber-100/80 border-r border-amber-200">
                    {formatCurrency(filteredAndSortedFleets.reduce((a, b) => a + b.nonBosch.ciro, 0))}
                  </td>

                  {/* Motor Yağı Toplam */}
                  <td className="px-3 py-3 text-right text-cyan-900 bg-cyan-100/60">
                    {formatNumber(filteredAndSortedFleets.reduce((a, b) => a + b.motorYagi.count, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-cyan-800 bg-cyan-100/80 border-r border-cyan-200">
                    {formatCurrency(filteredAndSortedFleets.reduce((a, b) => a + b.motorYagi.ciro, 0))}
                  </td>

                  {/* İşçilik Toplam */}
                  {showIscilik && (
                    <>
                      <td className="px-3 py-3 text-right text-emerald-900 bg-emerald-100/60">
                        {formatNumber(filteredAndSortedFleets.reduce((a, b) => a + b.iscilik.count, 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-800 bg-emerald-100/80 border-r border-emerald-200">
                        {formatCurrency(filteredAndSortedFleets.reduce((a, b) => a + b.iscilik.ciro, 0))}
                      </td>
                    </>
                  )}

                  {/* Genel Toplam */}
                  <td className="px-3 py-3 text-right text-slate-800">
                    {formatNumber(filteredAndSortedFleets.reduce((a, b) => a + b.totalUsage, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                    {formatCurrency(filteredAndSortedFleets.reduce((a, b) => a + b.totalCiro, 0))}
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

      {/* 6. Seçilen Filo Detay Modalı (1. Bosch Parça, 2. Diğer Parça, 3. Motor Yağı, Araçlar) */}
      {selectedFleetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {selectedFleetModal.filo}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-emerald-100">
                    <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {selectedFleetModal.vehiclePlates.size} Farklı Araç</span>
                    <span>&bull;</span>
                    <span>{selectedFleetModal.totalUsage} Toplam İşlem Kalemi</span>
                    <span>&bull;</span>
                    <span>Toplam Ciro: {formatCurrency(selectedFleetModal.totalCiro)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedFleetModal(null)}
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
                    {formatCurrency(selectedFleetModal.bosch.ciro)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedFleetModal.bosch.count} Adet (%{selectedFleetModal.boschParcaPayi.toFixed(0)} Pay)
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">2. Diğer Parça Cirosu</span>
                  <span className="text-base font-black text-amber-800 mt-1 block">
                    {formatCurrency(selectedFleetModal.nonBosch.ciro)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedFleetModal.nonBosch.count} Adet
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-cyan-200 shadow-xs">
                  <span className="text-[10px] font-bold text-cyan-700 uppercase block">3. Motor Yağı Cirosu</span>
                  <span className="text-base font-black text-cyan-800 mt-1 block">
                    {formatCurrency(selectedFleetModal.motorYagi.ciro)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedFleetModal.motorYagi.count} Adet
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-700 uppercase block">Toplam Filo Cirosu</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">
                    {formatCurrency(selectedFleetModal.totalCiro)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedFleetModal.totalUsage} Kalem İşlem
                  </span>
                </div>
              </div>
            </div>

            {/* Detay Sekmeleri (Sırasıyla 1. Bosch, 2. Diğer, 3. Motor Yağı, Araç Modelleri) */}
            <div className="px-6 pt-4 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0 bg-white">
              <button
                onClick={() => setActiveDetailTab('all')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeDetailTab === 'all' 
                    ? 'border-emerald-600 text-emerald-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Tüm Kalemler ({Object.keys(selectedFleetModal.bosch.items).length + Object.keys(selectedFleetModal.nonBosch.items).length + Object.keys(selectedFleetModal.motorYagi.items).length})
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
                <span>1. Bosch Parçaları ({Object.keys(selectedFleetModal.bosch.items).length})</span>
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
                <span>2. Diğer Marka Parçalar ({Object.keys(selectedFleetModal.nonBosch.items).length})</span>
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
                <span>3. Motor Yağları ({Object.keys(selectedFleetModal.motorYagi.items).length})</span>
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
                <span>İşçilikler ({Object.keys(selectedFleetModal.iscilik.items).length})</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('vehicles')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                  activeDetailTab === 'vehicles' 
                    ? 'border-emerald-600 text-emerald-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Car className="w-3.5 h-3.5 text-emerald-600" />
                <span>Araç Modelleri ({Object.keys(selectedFleetModal.vehicleModels).length})</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('services')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                  activeDetailTab === 'services' 
                    ? 'border-indigo-600 text-indigo-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kullanılan Servisler ({Object.keys(selectedFleetModal.serviceUsage || {}).length})</span>
              </button>
            </div>

            {/* Ürün Listesi, Araç Modelleri veya Servisler */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {activeDetailTab === 'services' ? (
                <div className="space-y-3">
                  <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide">En Çok Tercih Edilen Servis</span>
                      <div className="text-sm font-extrabold text-indigo-950 mt-0.5">
                        {topService ? topService.name : 'Veri Yok'}
                      </div>
                    </div>
                    {topService && (
                      <div className="text-right">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-lg">
                          {topService.count} İşlem ({formatCurrency(topService.ciro)})
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Servis Adı / İstasyon</th>
                          <th className="px-4 py-2.5 text-right">İşlem / Ziyaret Adedi</th>
                          <th className="px-4 py-3 text-right font-bold text-slate-800">Toplam Ciro (₺)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(selectedFleetModal.serviceUsage || {})
                          .sort((a, b) => b[1].count - a[1].count)
                          .map(([sName, sVal], i) => (
                            <tr key={i} className={`hover:bg-slate-50 ${i === 0 ? 'bg-indigo-50/30 font-semibold' : ''}`}>
                              <td className="px-4 py-3 flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                                  i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {i + 1}
                                </span>
                                <span className="text-slate-900">{sName}</span>
                                {i === 0 && (
                                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded ml-2">
                                    En Çok Kullanılan
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-700">
                                {sVal.count} Adet
                              </td>
                              <td className="px-4 py-3 text-right font-black text-slate-900 font-mono">
                                {formatCurrency(sVal.ciro)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : activeDetailTab === 'vehicles' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(selectedFleetModal.vehicleModels)
                    .sort((a, b) => b[1] - a[1])
                    .map(([model, count], i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold text-slate-800 text-xs">{model}</span>
                        </div>
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                          {count} işlem
                        </span>
                      </div>
                    ))}
                </div>
              ) : (() => {
                let itemsList: { type: string; code: string; name: string; count: number; ciro: number; category: string }[] = [];

                if (activeDetailTab === 'all' || activeDetailTab === 'bosch') {
                  itemsList.push(...Object.values(selectedFleetModal.bosch.items).map(i => ({ ...i, type: 'Bosch Parça' })));
                }
                if (activeDetailTab === 'all' || activeDetailTab === 'nonBosch') {
                  itemsList.push(...Object.values(selectedFleetModal.nonBosch.items).map(i => ({ ...i, type: 'Diğer Parça' })));
                }
                if (activeDetailTab === 'all' || activeDetailTab === 'yag') {
                  itemsList.push(...Object.values(selectedFleetModal.motorYagi.items).map(i => ({ ...i, type: 'Motor Yağı' })));
                }
                if (activeDetailTab === 'all' || activeDetailTab === 'iscilik') {
                  itemsList.push(...Object.values(selectedFleetModal.iscilik.items).map(i => ({ ...i, type: 'İşçilik' })));
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
