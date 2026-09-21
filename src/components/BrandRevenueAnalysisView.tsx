import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Coins, 
  Layers, 
  Wrench, 
  Droplet, 
  Search, 
  Download, 
  ChevronDown, 
  ChevronRight, 
  ArrowUpDown, 
  CheckCircle2, 
  TrendingUp, 
  Car, 
  HelpCircle,
  Percent,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { ProcessedRecord, normalizeVehicleBrand, normalizeVehicleModel } from '../lib/engine';

interface BrandRevenueAnalysisViewProps {
  data: ProcessedRecord[];
}

export default function BrandRevenueAnalysisView({ data }: BrandRevenueAnalysisViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'totalCiro' | 'boschCiro' | 'nonBoschCiro' | 'yagCiro' | 'totalUsage' | 'name'>('totalCiro');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});
  const [chartType, setChartType] = useState<'ciro' | 'usage'>('ciro');
  const [chartLayout, setChartLayout] = useState<'stacked' | 'grouped'>('stacked');
  const [showIscilik, setShowIscilik] = useState(true);

  // Toggle brand expand/collapse for model drilldown
  const toggleBrandExpand = (marka: string) => {
    setExpandedBrands(prev => ({
      ...prev,
      [marka]: !prev[marka]
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    brandAggregations.forEach(b => { all[b.marka] = true; });
    setExpandedBrands(all);
  };

  const collapseAll = () => {
    setExpandedBrands({});
  };

  // Aggregation Engine
  const { brandAggregations, grandTotal } = useMemo(() => {
    interface SubMetric {
      count: number;
      ciro: number;
    }

    interface ModelAgg {
      model: string;
      vehiclePlates: Set<string>;
      totalCiro: number;
      totalUsage: number;
      bosch: SubMetric;
      nonBosch: SubMetric;
      motorYagi: SubMetric;
      iscilik: SubMetric;
    }

    interface BrandAgg {
      marka: string;
      vehiclePlates: Set<string>;
      totalCiro: number;
      totalUsage: number;
      bosch: SubMetric;
      nonBosch: SubMetric;
      motorYagi: SubMetric;
      iscilik: SubMetric;
      models: Record<string, ModelAgg>;
    }

    const brandMap: Record<string, BrandAgg> = {};

    const totals = {
      totalCiro: 0,
      totalUsage: 0,
      uniqueVehicles: new Set<string>(),
      bosch: { count: 0, ciro: 0 },
      nonBosch: { count: 0, ciro: 0 },
      motorYagi: { count: 0, ciro: 0 },
      iscilik: { count: 0, ciro: 0 }
    };

    data.forEach((r, idx) => {
      const marka = normalizeVehicleBrand(r.aracMarka || 'Diğer Marka');
      const model = normalizeVehicleModel(marka, r.aracModel || 'Genel Model');
      const rawPlate = (r.plaka || '').trim().toUpperCase();
      const vehicleKey = rawPlate || `VEH_${marka}_${model}_${r.satirNo || idx}`;
      const tutar = r.tutar || 0;

      if (!brandMap[marka]) {
        brandMap[marka] = {
          marka,
          vehiclePlates: new Set(),
          totalCiro: 0,
          totalUsage: 0,
          bosch: { count: 0, ciro: 0 },
          nonBosch: { count: 0, ciro: 0 },
          motorYagi: { count: 0, ciro: 0 },
          iscilik: { count: 0, ciro: 0 },
          models: {}
        };
      }

      const bEntry = brandMap[marka];
      bEntry.vehiclePlates.add(vehicleKey);
      bEntry.totalCiro += tutar;
      bEntry.totalUsage += 1;

      if (!bEntry.models[model]) {
        bEntry.models[model] = {
          model,
          vehiclePlates: new Set(),
          totalCiro: 0,
          totalUsage: 0,
          bosch: { count: 0, ciro: 0 },
          nonBosch: { count: 0, ciro: 0 },
          motorYagi: { count: 0, ciro: 0 },
          iscilik: { count: 0, ciro: 0 }
        };
      }

      const mEntry = bEntry.models[model];
      mEntry.vehiclePlates.add(vehicleKey);
      mEntry.totalCiro += tutar;
      mEntry.totalUsage += 1;

      // Grand totals
      totals.totalCiro += tutar;
      totals.totalUsage += 1;
      totals.uniqueVehicles.add(vehicleKey);

      // Classification into the 3 requested categories + labor
      // 1. Bosch Parça
      const isBosch = r.anaTur === 'BOSCH' || r.isBosch === true;
      // 3. Motor Yağı
      const isYag = !isBosch && (r.anaTur === 'YAG' || r.isYag === true);
      // İşçilik
      const isIscilik = !isBosch && !isYag && (r.anaTur === 'ISCILIK' || r.isIscilik === true);
      // 2. Bosch Olmayan Parça (Diğer Parça)
      const isNonBosch = !isBosch && !isYag && !isIscilik;

      if (isBosch) {
        bEntry.bosch.count += 1;
        bEntry.bosch.ciro += tutar;
        mEntry.bosch.count += 1;
        mEntry.bosch.ciro += tutar;
        totals.bosch.count += 1;
        totals.bosch.ciro += tutar;
      } else if (isYag) {
        bEntry.motorYagi.count += 1;
        bEntry.motorYagi.ciro += tutar;
        mEntry.motorYagi.count += 1;
        mEntry.motorYagi.ciro += tutar;
        totals.motorYagi.count += 1;
        totals.motorYagi.ciro += tutar;
      } else if (isIscilik) {
        bEntry.iscilik.count += 1;
        bEntry.iscilik.ciro += tutar;
        mEntry.iscilik.count += 1;
        mEntry.iscilik.ciro += tutar;
        totals.iscilik.count += 1;
        totals.iscilik.ciro += tutar;
      } else if (isNonBosch) {
        bEntry.nonBosch.count += 1;
        bEntry.nonBosch.ciro += tutar;
        mEntry.nonBosch.count += 1;
        mEntry.nonBosch.ciro += tutar;
        totals.nonBosch.count += 1;
        totals.nonBosch.ciro += tutar;
      }
    });

    const list = Object.values(brandMap).map(b => {
      const modelsList = Object.values(b.models).map(m => ({
        ...m,
        vehicleCount: m.vehiclePlates.size,
        boschCiroPercent: b.totalCiro > 0 ? (m.bosch.ciro / m.totalCiro) * 100 : 0,
        nonBoschCiroPercent: b.totalCiro > 0 ? (m.nonBosch.ciro / m.totalCiro) * 100 : 0,
        yagCiroPercent: b.totalCiro > 0 ? (m.motorYagi.ciro / m.totalCiro) * 100 : 0
      })).sort((a, b) => b.totalCiro - a.totalCiro);

      return {
        ...b,
        vehicleCount: b.vehiclePlates.size,
        modelsList,
        boschCiroPercent: b.totalCiro > 0 ? (b.bosch.ciro / b.totalCiro) * 100 : 0,
        nonBoschCiroPercent: b.totalCiro > 0 ? (b.nonBosch.ciro / b.totalCiro) * 100 : 0,
        yagCiroPercent: b.totalCiro > 0 ? (b.motorYagi.ciro / b.totalCiro) * 100 : 0,
        iscilikCiroPercent: b.totalCiro > 0 ? (b.iscilik.ciro / b.totalCiro) * 100 : 0,
        fleetSharePercent: totals.totalCiro > 0 ? (b.totalCiro / totals.totalCiro) * 100 : 0
      };
    });

    return {
      brandAggregations: list,
      grandTotal: {
        ...totals,
        uniqueVehicleCount: totals.uniqueVehicles.size,
        boschCiroPercent: totals.totalCiro > 0 ? (totals.bosch.ciro / totals.totalCiro) * 100 : 0,
        nonBoschCiroPercent: totals.totalCiro > 0 ? (totals.nonBosch.ciro / totals.totalCiro) * 100 : 0,
        yagCiroPercent: totals.totalCiro > 0 ? (totals.motorYagi.ciro / totals.totalCiro) * 100 : 0,
        iscilikCiroPercent: totals.totalCiro > 0 ? (totals.iscilik.ciro / totals.totalCiro) * 100 : 0
      }
    };
  }, [data]);

  // Filter and Sort
  const filteredAndSortedBrands = useMemo(() => {
    let result = brandAggregations.filter(b => 
      b.marka.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.modelsList.some(m => m.model.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    result.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

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
        case 'name':
          return sortOrder === 'asc' 
            ? a.marka.localeCompare(b.marka, 'tr') 
            : b.marka.localeCompare(a.marka, 'tr');
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return result;
  }, [brandAggregations, searchTerm, sortBy, sortOrder]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    return filteredAndSortedBrands.slice(0, 10).map(b => ({
      name: b.marka,
      'Bosch Cirosu': Math.round(b.bosch.ciro),
      'Bosch Olmayan Cirosu': Math.round(b.nonBosch.ciro),
      'Motor Yağı Cirosu': Math.round(b.motorYagi.ciro),
      'İşçilik Cirosu': Math.round(b.iscilik.ciro),
      'Bosch Kullanımı (Adet)': b.bosch.count,
      'Bosch Olmayan (Adet)': b.nonBosch.count,
      'Motor Yağı (Adet)': b.motorYagi.count,
      'İşçilik (Adet)': b.iscilik.count,
      totalCiro: b.totalCiro,
      totalUsage: b.totalUsage
    }));
  }, [filteredAndSortedBrands]);

  // Export as CSV
  const exportToCSV = () => {
    const headers = [
      'Marka',
      'Model',
      'Gelen Araç Sayısı',
      'Toplam İşlem Adedi',
      'Bosch Parça Kullanım (Adet)',
      'Bosch Parça Ciro (₺)',
      'Bosch Olmayan Parça Kullanım (Adet)',
      'Bosch Olmayan Parça Ciro (₺)',
      'Motor Yağı Kullanım (Adet)',
      'Motor Yağı Ciro (₺)',
      'İşçilik Kullanım (Adet)',
      'İşçilik Ciro (₺)',
      'Toplam Ciro (₺)'
    ];

    const rows: string[][] = [];

    brandAggregations.forEach(b => {
      // Main brand row
      rows.push([
        `"${b.marka}"`,
        '"Tüm Modeller Toplamı"',
        b.vehicleCount.toString(),
        b.totalUsage.toString(),
        b.bosch.count.toString(),
        b.bosch.ciro.toFixed(2),
        b.nonBosch.count.toString(),
        b.nonBosch.ciro.toFixed(2),
        b.motorYagi.count.toString(),
        b.motorYagi.ciro.toFixed(2),
        b.iscilik.count.toString(),
        b.iscilik.ciro.toFixed(2),
        b.totalCiro.toFixed(2)
      ]);

      // Sub-models rows
      b.modelsList.forEach(m => {
        rows.push([
          `"${b.marka}"`,
          `"${m.model}"`,
          m.vehicleCount.toString(),
          m.totalUsage.toString(),
          m.bosch.count.toString(),
          m.bosch.ciro.toFixed(2),
          m.nonBosch.count.toString(),
          m.nonBosch.ciro.toFixed(2),
          m.motorYagi.count.toString(),
          m.motorYagi.ciro.toFixed(2),
          m.iscilik.count.toString(),
          m.iscilik.ciro.toFixed(2),
          m.totalCiro.toFixed(2)
        ]);
      });
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Marka_Bazinda_Parca_ve_Ciro_Analizi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
              <Coins className="w-4 h-4" />
              <span>Hasılat & Parça Kullanım Kırılımı</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Araç Markası Bazında Cirolar ve Parça Kullanımı
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
              Tüm araç markaları için sırasıyla <strong>1. Bosch Parça Kullanımı & Cirosu</strong>, 
              <strong> 2. Bosch Olmayan Parça Kullanımı & Cirosu</strong> ve <strong>3. Motor Yağı Kullanımı & Cirosu</strong> analizleri.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              onClick={exportToCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Analiz tablosunu Excel / CSV olarak indirin"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>CSV Olarak İndir</span>
            </button>
          </div>
        </div>

        {/* 3 Requested Focus Categories KPI Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Card 0: Genel Toplam */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-2">
              <span>Toplam Filo Cirosu</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black tracking-tight text-white">
              {grandTotal.totalCiro.toLocaleString('tr-TR')} ₺
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/60 text-[11px] text-slate-300">
              <span>{grandTotal.uniqueVehicleCount} Tekil Araç</span>
              <span>{grandTotal.totalUsage.toLocaleString('tr-TR')} Toplam İşlem</span>
            </div>
          </div>

          {/* Card 1: Bosch Parça Kullanımı & Cirosu */}
          <div className="bg-white rounded-xl p-4 border-2 border-blue-500 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-blue-50/40">
            <div className="flex items-center justify-between text-xs font-bold text-blue-700 mb-2">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                Bosch Parça
              </span>
              <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                %{grandTotal.boschCiroPercent.toFixed(1)} Pay
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {grandTotal.bosch.ciro.toLocaleString('tr-TR')} ₺
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-100 text-[11px]">
              <span className="text-slate-500">Kullanım:</span>
              <span className="font-bold text-blue-700">{grandTotal.bosch.count.toLocaleString('tr-TR')} Adet Parça</span>
            </div>
          </div>

          {/* Card 2: Bosch Olmayan Parça Kullanımı & Cirosu */}
          <div className="bg-white rounded-xl p-4 border-2 border-amber-500 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-amber-50/40">
            <div className="flex items-center justify-between text-xs font-bold text-amber-700 mb-2">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">2</span>
                Bosch Olmayan Parça
              </span>
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                %{grandTotal.nonBoschCiroPercent.toFixed(1)} Pay
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {grandTotal.nonBosch.ciro.toLocaleString('tr-TR')} ₺
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-100 text-[11px]">
              <span className="text-slate-500">Kullanım:</span>
              <span className="font-bold text-amber-700">{grandTotal.nonBosch.count.toLocaleString('tr-TR')} Adet Parça</span>
            </div>
          </div>

          {/* Card 3: Motor Yağı Kullanımı & Cirosu */}
          <div className="bg-white rounded-xl p-4 border-2 border-emerald-500 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/40">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 mb-2">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                Motor Yağı
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                %{grandTotal.yagCiroPercent.toFixed(1)} Pay
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {grandTotal.motorYagi.ciro.toLocaleString('tr-TR')} ₺
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-100 text-[11px]">
              <span className="text-slate-500">Kullanım:</span>
              <span className="font-bold text-emerald-700">{grandTotal.motorYagi.count.toLocaleString('tr-TR')} Adet Değişim</span>
            </div>
          </div>
        </div>

        {/* Small banner showing labor (işçilik) context for complete reconciliation */}
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 text-slate-600">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-purple-600" />
            <span>
              <strong>Hizmet & İşçilik Cirosu:</strong> {grandTotal.iscilik.ciro.toLocaleString('tr-TR')} ₺ ({grandTotal.iscilik.count} işlem, filo cirosunun %{grandTotal.iscilikCiroPercent.toFixed(1)}'i).
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            3 ana parça/yağ kalemi + işçilik toplamı filo cirosunu %100 oluşturur.
          </div>
        </div>
      </div>

      {/* Visual Chart Comparison */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Markalara Göre Ciro ve Kullanım Dağılımı Grafiği
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Araç markaları bazında Bosch Parça, Bosch Olmayan Parça ve Motor Yağı karşılaştırması.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Chart Metric Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-semibold">
              <button
                onClick={() => setChartType('ciro')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  chartType === 'ciro' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ciro (₺)
              </button>
              <button
                onClick={() => setChartType('usage')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  chartType === 'usage' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kullanım (Adet)
              </button>
            </div>

            {/* Layout Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-semibold">
              <button
                onClick={() => setChartLayout('stacked')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  chartLayout === 'stacked' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Yığılmış Çubuk"
              >
                Yığılmış
              </button>
              <button
                onClick={() => setChartLayout('grouped')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  chartLayout === 'grouped' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ayrık Çubuk"
              >
                Ayrık
              </button>
            </div>
          </div>
        </div>

        <div className="h-72 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickFormatter={(v) => chartType === 'ciro' ? `${(v / 1000).toFixed(0)}k ₺` : v}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155', 
                  borderRadius: '0.75rem', 
                  color: '#fff', 
                  fontSize: '12px' 
                }}
                formatter={(val: any, name: any) => [
                  chartType === 'ciro' 
                    ? `${Number(val).toLocaleString('tr-TR')} ₺` 
                    : `${val} Adet`,
                  name
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {chartType === 'ciro' ? (
                <>
                  <Bar 
                    dataKey="Bosch Cirosu" 
                    name="1. Bosch Parça Cirosu" 
                    stackId={chartLayout === 'stacked' ? 'a' : undefined} 
                    fill="#2563eb" 
                    radius={chartLayout === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="Bosch Olmayan Cirosu" 
                    name="2. Bosch Olmayan Cirosu" 
                    stackId={chartLayout === 'stacked' ? 'a' : undefined} 
                    fill="#d97706" 
                    radius={chartLayout === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="Motor Yağı Cirosu" 
                    name="3. Motor Yağı Cirosu" 
                    stackId={chartLayout === 'stacked' ? 'a' : undefined} 
                    fill="#059669" 
                    radius={chartLayout === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]} 
                  />
                  {showIscilik && (
                    <Bar 
                      dataKey="İşçilik Cirosu" 
                      name="İşçilik Cirosu" 
                      stackId={chartLayout === 'stacked' ? 'a' : undefined} 
                      fill="#8b5cf6" 
                      radius={chartLayout === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]} 
                    />
                  )}
                </>
              ) : (
                <>
                  <Bar 
                    dataKey="Bosch Kullanımı (Adet)" 
                    name="1. Bosch Parça (Adet)" 
                    stackId={chartLayout === 'stacked' ? 'a' : undefined} 
                    fill="#2563eb" 
                    radius={chartLayout === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="Bosch Olmayan (Adet)" 
                    name="2. Bosch Olmayan (Adet)" 
                    stackId={chartLayout === 'stacked' ? 'a' : undefined} 
                    fill="#d97706" 
                    radius={chartLayout === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="Motor Yağı (Adet)" 
                    name="3. Motor Yağı (Adet)" 
                    stackId={chartLayout === 'stacked' ? 'a' : undefined} 
                    fill="#059669" 
                    radius={chartLayout === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]} 
                  />
                  {showIscilik && (
                    <Bar 
                      dataKey="İşçilik (Adet)" 
                      name="İşçilik (Adet)" 
                      stackId={chartLayout === 'stacked' ? 'a' : undefined} 
                      fill="#8b5cf6" 
                      radius={chartLayout === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]} 
                    />
                  )}
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Consolidated Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Table Control Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              Araç Markaları Derli Toplu Ciro & Kullanım Matrisi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Her markanın altında yer alan modelleri görmek için markanın yanındaki oka tıklayın.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Marka veya model ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="totalCiro">Toplam Ciroya Göre</option>
                <option value="boschCiro">1. Bosch Cirosuna Göre</option>
                <option value="nonBoschCiro">2. Bosch Olmayan Cirosuna Göre</option>
                <option value="yagCiro">3. Motor Yağı Cirosuna Göre</option>
                <option value="totalUsage">Toplam İşlem Adedine Göre</option>
                <option value="name">Marka Adına Göre</option>
              </select>
            </div>

            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 transition-colors"
              title="Sıralama yönünü değiştir"
            >
              {sortOrder === 'desc' ? 'Azalan ↓' : 'Artan ↑'}
            </button>

            {/* Expand / Collapse All */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                onClick={expandAll}
                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Tümünü Aç
              </button>
              <button
                onClick={collapseAll}
                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>

        {/* The Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              {/* Top Tier Multi-Column Group Headers */}
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                <th className="px-4 py-2 border-r border-slate-200" colSpan={2}>
                  Araç Markası
                </th>
                <th className="px-4 py-2 text-center bg-blue-50 text-blue-900 border-r border-blue-200" colSpan={2}>
                  1. Bosch Parça
                </th>
                <th className="px-4 py-2 text-center bg-amber-50 text-amber-900 border-r border-amber-200" colSpan={2}>
                  2. Bosch Olmayan Parça
                </th>
                <th className="px-4 py-2 text-center bg-emerald-50 text-emerald-900 border-r border-emerald-200" colSpan={2}>
                  3. Motor Yağı
                </th>
                <th className="px-4 py-2 text-center bg-purple-50 text-purple-900 border-r border-purple-200" colSpan={2}>
                  Hizmet & İşçilik
                </th>
                <th className="px-4 py-2 text-center bg-slate-200 text-slate-900" colSpan={2}>
                  Genel Toplam
                </th>
              </tr>

              {/* Specific Sub-Column Headers */}
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                <th className="px-3 py-2 w-8 text-center">#</th>
                <th className="px-4 py-2 border-r border-slate-200 min-w-[180px]">Marka / Model</th>
                
                {/* 1. Bosch */}
                <th className="px-3 py-2 text-right bg-blue-50/50">Kullanım</th>
                <th className="px-3 py-2 text-right bg-blue-50/50 border-r border-blue-100 text-blue-700">Ciro (₺)</th>

                {/* 2. Bosch Olmayan */}
                <th className="px-3 py-2 text-right bg-amber-50/50">Kullanım</th>
                <th className="px-3 py-2 text-right bg-amber-50/50 border-r border-amber-100 text-amber-700">Ciro (₺)</th>

                {/* 3. Motor Yağı */}
                <th className="px-3 py-2 text-right bg-emerald-50/50">Kullanım</th>
                <th className="px-3 py-2 text-right bg-emerald-50/50 border-r border-emerald-100 text-emerald-700">Ciro (₺)</th>

                {/* İşçilik */}
                <th className="px-3 py-2 text-right bg-purple-50/50">Kullanım</th>
                <th className="px-3 py-2 text-right bg-purple-50/50 border-r border-purple-100 text-purple-700">Ciro (₺)</th>

                {/* Toplam */}
                <th className="px-3 py-2 text-right bg-slate-100/70">İşlem</th>
                <th className="px-4 py-2 text-right bg-slate-100 text-slate-900">Toplam Ciro (₺)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedBrands.map((b, idx) => {
                const isExpanded = !!expandedBrands[b.marka];
                return (
                  <React.Fragment key={b.marka}>
                    {/* Brand Summary Row */}
                    <tr 
                      className={`transition-colors font-medium cursor-pointer ${
                        isExpanded ? 'bg-blue-50/30 font-semibold' : 'hover:bg-slate-50/80'
                      }`}
                      onClick={() => toggleBrandExpand(b.marka)}
                    >
                      <td className="px-3 py-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Brand Info */}
                      <td className="px-4 py-3 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded"
                            onClick={(e) => { e.stopPropagation(); toggleBrandExpand(b.marka); }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm hover:text-blue-700">
                              {b.marka}
                            </span>
                            <div className="text-[11px] text-slate-400 font-normal flex items-center gap-1.5">
                              <span>{b.vehicleCount} Gelen Araç</span>
                              <span>•</span>
                              <span>{b.modelsList.length} Model</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 1. Bosch Parça (Kullanım & Ciro) */}
                      <td className="px-3 py-3 text-right bg-blue-50/20 font-mono">
                        <span className="font-bold text-slate-800">
                          {b.bosch.count}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          %{b.totalUsage > 0 ? Math.round((b.bosch.count / b.totalUsage) * 100) : 0}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right bg-blue-50/30 border-r border-blue-100 font-mono whitespace-nowrap">
                        <span className="font-extrabold text-blue-700">
                          {b.bosch.ciro.toLocaleString('tr-TR')} ₺
                        </span>
                        <span className="text-[10px] text-blue-600 block font-sans">
                          %{b.boschCiroPercent.toFixed(1)} pay
                        </span>
                      </td>

                      {/* 2. Bosch Olmayan Parça (Kullanım & Ciro) */}
                      <td className="px-3 py-3 text-right bg-amber-50/20 font-mono">
                        <span className="font-bold text-slate-800">
                          {b.nonBosch.count}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          %{b.totalUsage > 0 ? Math.round((b.nonBosch.count / b.totalUsage) * 100) : 0}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right bg-amber-50/30 border-r border-amber-100 font-mono whitespace-nowrap">
                        <span className="font-extrabold text-amber-700">
                          {b.nonBosch.ciro.toLocaleString('tr-TR')} ₺
                        </span>
                        <span className="text-[10px] text-amber-600 block font-sans">
                          %{b.nonBoschCiroPercent.toFixed(1)} pay
                        </span>
                      </td>

                      {/* 3. Motor Yağı (Kullanım & Ciro) */}
                      <td className="px-3 py-3 text-right bg-emerald-50/20 font-mono">
                        <span className="font-bold text-slate-800">
                          {b.motorYagi.count}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          %{b.totalUsage > 0 ? Math.round((b.motorYagi.count / b.totalUsage) * 100) : 0}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right bg-emerald-50/30 border-r border-emerald-100 font-mono whitespace-nowrap">
                        <span className="font-extrabold text-emerald-700">
                          {b.motorYagi.ciro.toLocaleString('tr-TR')} ₺
                        </span>
                        <span className="text-[10px] text-emerald-600 block font-sans">
                          %{b.yagCiroPercent.toFixed(1)} pay
                        </span>
                      </td>

                      {/* İşçilik */}
                      <td className="px-3 py-3 text-right bg-purple-50/20 font-mono">
                        <span className="font-bold text-slate-800">
                          {b.iscilik.count}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right bg-purple-50/30 border-r border-purple-100 font-mono whitespace-nowrap">
                        <span className="font-bold text-purple-700">
                          {b.iscilik.ciro.toLocaleString('tr-TR')} ₺
                        </span>
                      </td>

                      {/* Toplam Marka Cirosu */}
                      <td className="px-3 py-3 text-right bg-slate-100/40 font-mono text-slate-600 font-bold">
                        {b.totalUsage}
                      </td>
                      <td className="px-4 py-3 text-right bg-slate-100/70 font-mono whitespace-nowrap">
                        <span className="font-black text-slate-900 text-sm">
                          {b.totalCiro.toLocaleString('tr-TR')} ₺
                        </span>
                        <span className="text-[10px] text-slate-500 block font-sans font-medium">
                          Filo Payı: %{b.fleetSharePercent.toFixed(1)}
                        </span>
                      </td>
                    </tr>

                    {/* Expandable Model Breakdown Rows */}
                    {isExpanded && b.modelsList.map((m, mIdx) => (
                      <tr 
                        key={mIdx}
                        className="bg-slate-50/60 hover:bg-slate-100/50 text-[11px] border-b border-slate-100/80 transition-colors"
                      >
                        <td className="px-3 py-2 text-center text-slate-300 font-mono text-[10px]">
                          {idx + 1}.{mIdx + 1}
                        </td>

                        {/* Model Name */}
                        <td className="px-4 py-2 border-r border-slate-200 pl-8">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span className="font-bold text-slate-800">{m.model}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({m.vehicleCount} araç)
                            </span>
                          </div>
                        </td>

                        {/* Model 1. Bosch */}
                        <td className="px-3 py-2 text-right bg-blue-50/10 font-mono text-slate-700">
                          {m.bosch.count}
                        </td>
                        <td className="px-3 py-2 text-right bg-blue-50/20 border-r border-blue-100 font-mono text-blue-700 font-semibold whitespace-nowrap">
                          {m.bosch.ciro > 0 ? `${m.bosch.ciro.toLocaleString('tr-TR')} ₺` : '-'}
                        </td>

                        {/* Model 2. Bosch Olmayan */}
                        <td className="px-3 py-2 text-right bg-amber-50/10 font-mono text-slate-700">
                          {m.nonBosch.count}
                        </td>
                        <td className="px-3 py-2 text-right bg-amber-50/20 border-r border-amber-100 font-mono text-amber-700 font-semibold whitespace-nowrap">
                          {m.nonBosch.ciro > 0 ? `${m.nonBosch.ciro.toLocaleString('tr-TR')} ₺` : '-'}
                        </td>

                        {/* Model 3. Motor Yağı */}
                        <td className="px-3 py-2 text-right bg-emerald-50/10 font-mono text-slate-700">
                          {m.motorYagi.count}
                        </td>
                        <td className="px-3 py-2 text-right bg-emerald-50/20 border-r border-emerald-100 font-mono text-emerald-700 font-semibold whitespace-nowrap">
                          {m.motorYagi.ciro > 0 ? `${m.motorYagi.ciro.toLocaleString('tr-TR')} ₺` : '-'}
                        </td>

                        {/* Model İşçilik */}
                        <td className="px-3 py-2 text-right bg-purple-50/10 font-mono text-slate-700">
                          {m.iscilik.count}
                        </td>
                        <td className="px-3 py-2 text-right bg-purple-50/20 border-r border-purple-100 font-mono text-purple-700 font-semibold whitespace-nowrap">
                          {m.iscilik.ciro > 0 ? `${m.iscilik.ciro.toLocaleString('tr-TR')} ₺` : '-'}
                        </td>

                        {/* Model Toplam */}
                        <td className="px-3 py-2 text-right bg-slate-100/30 font-mono text-slate-600">
                          {m.totalUsage}
                        </td>
                        <td className="px-4 py-2 text-right bg-slate-100/50 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {m.totalCiro.toLocaleString('tr-TR')} ₺
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Grand Total Footer Row */}
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-xs sticky bottom-0 z-10">
              <tr>
                <td className="px-3 py-3.5 text-center text-slate-500 font-mono">Σ</td>
                <td className="px-4 py-3.5 border-r border-slate-300 text-slate-900">
                  <div className="font-black text-sm">GENEL TOPLAM</div>
                  <div className="text-[11px] font-normal text-slate-500">
                    {grandTotal.uniqueVehicleCount} Tekil Araç • {filteredAndSortedBrands.length} Marka
                  </div>
                </td>

                {/* Total 1. Bosch */}
                <td className="px-3 py-3.5 text-right bg-blue-100/60 font-mono text-blue-900 text-sm">
                  {grandTotal.bosch.count.toLocaleString('tr-TR')}
                </td>
                <td className="px-3 py-3.5 text-right bg-blue-100 border-r border-blue-300 font-mono text-blue-950 text-sm whitespace-nowrap">
                  {grandTotal.bosch.ciro.toLocaleString('tr-TR')} ₺
                  <span className="block text-[10px] text-blue-700 font-sans font-bold">
                    %{grandTotal.boschCiroPercent.toFixed(1)} Pay
                  </span>
                </td>

                {/* Total 2. Bosch Olmayan */}
                <td className="px-3 py-3.5 text-right bg-amber-100/60 font-mono text-amber-900 text-sm">
                  {grandTotal.nonBosch.count.toLocaleString('tr-TR')}
                </td>
                <td className="px-3 py-3.5 text-right bg-amber-100 border-r border-amber-300 font-mono text-amber-950 text-sm whitespace-nowrap">
                  {grandTotal.nonBosch.ciro.toLocaleString('tr-TR')} ₺
                  <span className="block text-[10px] text-amber-700 font-sans font-bold">
                    %{grandTotal.nonBoschCiroPercent.toFixed(1)} Pay
                  </span>
                </td>

                {/* Total 3. Motor Yağı */}
                <td className="px-3 py-3.5 text-right bg-emerald-100/60 font-mono text-emerald-900 text-sm">
                  {grandTotal.motorYagi.count.toLocaleString('tr-TR')}
                </td>
                <td className="px-3 py-3.5 text-right bg-emerald-100 border-r border-emerald-300 font-mono text-emerald-950 text-sm whitespace-nowrap">
                  {grandTotal.motorYagi.ciro.toLocaleString('tr-TR')} ₺
                  <span className="block text-[10px] text-emerald-700 font-sans font-bold">
                    %{grandTotal.yagCiroPercent.toFixed(1)} Pay
                  </span>
                </td>

                {/* Total İşçilik */}
                <td className="px-3 py-3.5 text-right bg-purple-100/60 font-mono text-purple-900 text-sm">
                  {grandTotal.iscilik.count.toLocaleString('tr-TR')}
                </td>
                <td className="px-3 py-3.5 text-right bg-purple-100 border-r border-purple-300 font-mono text-purple-950 text-sm whitespace-nowrap">
                  {grandTotal.iscilik.ciro.toLocaleString('tr-TR')} ₺
                </td>

                {/* Total Toplam */}
                <td className="px-3 py-3.5 text-right bg-slate-200 font-mono text-slate-900 text-sm">
                  {grandTotal.totalUsage.toLocaleString('tr-TR')}
                </td>
                <td className="px-4 py-3.5 text-right bg-slate-900 text-white font-mono text-sm whitespace-nowrap">
                  {grandTotal.totalCiro.toLocaleString('tr-TR')} ₺
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
