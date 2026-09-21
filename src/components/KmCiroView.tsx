import React, { useState, useMemo } from 'react';
import { 
  Gauge, 
  DollarSign, 
  Car, 
  Wrench, 
  TrendingUp, 
  ChevronRight, 
  ArrowLeft, 
  Search, 
  Filter, 
  Award, 
  Layers, 
  Info,
  X,
  Sparkles,
  BarChart3,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  Cell,
  ComposedChart,
  Line
} from 'recharts';
import { ProcessedRecord, normalizeVehicleBrand, normalizeVehicleModel } from '../lib/engine';

interface KmCiroViewProps {
  data: ProcessedRecord[];
  brandModelData: any[];
}

interface KmSegment {
  id: string;
  label: string;
  minKm: number;
  maxKm: number;
  description: string;
  badgeColor: string;
}

const KM_SEGMENTS: KmSegment[] = [
  { id: 'seg1', label: '0 - 30.000 KM', minKm: 0, maxKm: 30000, description: 'Yeni Araç & Hafif Bakım', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'seg2', label: '30.001 - 60.000 KM', minKm: 30001, maxKm: 60000, description: 'Orta KM & Balata / Filtre', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'seg3', label: '60.001 - 90.000 KM', minKm: 60001, maxKm: 90000, description: 'Periyodik Bakım & Fren Diski', badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'seg4', label: '90.001 - 120.000 KM', minKm: 90001, maxKm: 120000, description: 'Ağır Bakım & Mekanik Revizyon', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'seg5', label: '120.001 - 150.000 KM', minKm: 120001, maxKm: 150000, description: 'Yüksek Kilometre Bakımı', badgeColor: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'seg6', label: '150.000+ KM', minKm: 150001, maxKm: Infinity, description: 'Kritik Aşınma & Filo Sonu', badgeColor: 'bg-red-100 text-red-800 border-red-200' },
];

export default function KmCiroView({ data, brandModelData }: KmCiroViewProps) {
  // Stage state: 1 = Tüm Araçlar, 2 = Araç Markası, 3 = Araç Marka-Model
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeModelModal, setActiveModelModal] = useState<{ marka: string; model: string } | null>(null);

  // 1. Vehicle Unique Aggregates (Plaka bazında)
  const vehicleStats = useMemo(() => {
    const map = new Map<string, {
      plaka: string;
      marka: string;
      model: string;
      filo: string;
      servis: string;
      km: number;
      totalCiro: number;
      operationCount: number;
      items: { name: string; count: number; ciro: number }[];
    }>();

    data.forEach(item => {
      const normBrand = normalizeVehicleBrand(item.aracMarka || 'Diğer Marka');
      const normModel = normalizeVehicleModel(normBrand, item.aracModel || 'Genel Model');
      const plaka = (item.plaka || '').trim().toUpperCase() || `ARAC_${normBrand}_${normModel}_${item.satirNo}`;
      const ciro = item.tutar || 0;
      const km = item.km || 0;
      const itemName = item.eslesenKatalog !== 'Eşleşmedi' ? item.eslesenKatalog : item.orijinalKodAd;

      if (!map.has(plaka)) {
        map.set(plaka, {
          plaka,
          marka: normBrand,
          model: normModel,
          filo: item.filoAdi || 'Ana Filo',
          servis: item.servisIsmi || 'Merkez Servis',
          km: km,
          totalCiro: ciro,
          operationCount: 1,
          items: [{ name: itemName, count: 1, ciro }]
        });
      } else {
        const entry = map.get(plaka)!;
        entry.totalCiro += ciro;
        entry.operationCount += 1;
        if (km > entry.km) entry.km = km;
        const existingItem = entry.items.find(i => i.name === itemName);
        if (existingItem) {
          existingItem.count += 1;
          existingItem.ciro += ciro;
        } else {
          entry.items.push({ name: itemName, count: 1, ciro });
        }
      }
    });

    return Array.from(map.values());
  }, [data]);

  // Overall Totals
  const fleetTotals = useMemo(() => {
    const totalVehicles = vehicleStats.length;
    const totalOperations = data.length;
    const totalCiro = vehicleStats.reduce((sum, v) => sum + v.totalCiro, 0);
    const validKms = vehicleStats.filter(v => v.km > 0).map(v => v.km);
    const avgKm = validKms.length > 0 ? Math.round(validKms.reduce((a, b) => a + b, 0) / validKms.length) : 0;
    const avgCiroPerVehicle = totalVehicles > 0 ? Math.round(totalCiro / totalVehicles) : 0;
    const avgCiroPerOperation = totalOperations > 0 ? Math.round(totalCiro / totalOperations) : 0;

    return {
      totalVehicles,
      totalOperations,
      totalCiro,
      avgKm,
      avgCiroPerVehicle,
      avgCiroPerOperation
    };
  }, [vehicleStats, data]);

  // 2. KM Segment Aggregation across all vehicles
  const segmentStats = useMemo(() => {
    return KM_SEGMENTS.map(seg => {
      const vehiclesInSeg = vehicleStats.filter(v => v.km >= seg.minKm && v.km <= seg.maxKm);
      const vehicleCount = vehiclesInSeg.length;
      const totalCiro = vehiclesInSeg.reduce((sum, v) => sum + v.totalCiro, 0);
      const totalOps = vehiclesInSeg.reduce((sum, v) => sum + v.operationCount, 0);
      const vehicleShare = fleetTotals.totalVehicles > 0 ? (vehicleCount / fleetTotals.totalVehicles) * 100 : 0;
      const ciroShare = fleetTotals.totalCiro > 0 ? (totalCiro / fleetTotals.totalCiro) * 100 : 0;
      const avgCiro = vehicleCount > 0 ? Math.round(totalCiro / vehicleCount) : 0;

      return {
        ...seg,
        vehicleCount,
        totalCiro,
        totalOps,
        vehicleShare: vehicleShare.toFixed(1),
        ciroShare: ciroShare.toFixed(1),
        avgCiro,
        vehicles: vehiclesInSeg
      };
    });
  }, [vehicleStats, fleetTotals]);

  // 3. Brand-level KM & Ciro Aggregates
  const brandKmCiroStats = useMemo(() => {
    const brandsMap = new Map<string, {
      marka: string;
      vehicleCount: number;
      operationCount: number;
      totalCiro: number;
      kms: number[];
      vehicles: typeof vehicleStats;
      segmentCounts: Record<string, { vehicles: number; ciro: number }>;
    }>();

    vehicleStats.forEach(v => {
      if (!brandsMap.has(v.marka)) {
        brandsMap.set(v.marka, {
          marka: v.marka,
          vehicleCount: 0,
          operationCount: 0,
          totalCiro: 0,
          kms: [],
          vehicles: [],
          segmentCounts: {}
        });
      }
      const b = brandsMap.get(v.marka)!;
      b.vehicleCount += 1;
      b.operationCount += v.operationCount;
      b.totalCiro += v.totalCiro;
      if (v.km > 0) b.kms.push(v.km);
      b.vehicles.push(v);

      const matchedSeg = KM_SEGMENTS.find(s => v.km >= s.minKm && v.km <= s.maxKm) || KM_SEGMENTS[0];
      if (!b.segmentCounts[matchedSeg.label]) {
        b.segmentCounts[matchedSeg.label] = { vehicles: 0, ciro: 0 };
      }
      b.segmentCounts[matchedSeg.label].vehicles += 1;
      b.segmentCounts[matchedSeg.label].ciro += v.totalCiro;
    });

    return Array.from(brandsMap.values()).map(b => {
      const avgKm = b.kms.length > 0 ? Math.round(b.kms.reduce((a, s) => a + s, 0) / b.kms.length) : 0;
      const ciroShare = fleetTotals.totalCiro > 0 ? ((b.totalCiro / fleetTotals.totalCiro) * 100).toFixed(1) : '0';
      const vehicleShare = fleetTotals.totalVehicles > 0 ? ((b.vehicleCount / fleetTotals.totalVehicles) * 100).toFixed(1) : '0';
      const avgCiroPerVehicle = b.vehicleCount > 0 ? Math.round(b.totalCiro / b.vehicleCount) : 0;
      return {
        ...b,
        avgKm,
        ciroShare,
        vehicleShare,
        avgCiroPerVehicle
      };
    }).sort((a, b) => b.totalCiro - a.totalCiro);
  }, [vehicleStats, fleetTotals]);

  // 4. Model-level KM & Ciro Aggregates
  const modelKmCiroStats = useMemo(() => {
    const modelsMap = new Map<string, {
      key: string;
      marka: string;
      model: string;
      vehicleCount: number;
      operationCount: number;
      totalCiro: number;
      kms: number[];
      vehicles: typeof vehicleStats;
      topItems: { name: string; count: number; ciro: number }[];
    }>();

    vehicleStats.forEach(v => {
      const key = `${v.marka}__${v.model}`;
      if (!modelsMap.has(key)) {
        modelsMap.set(key, {
          key,
          marka: v.marka,
          model: v.model,
          vehicleCount: 0,
          operationCount: 0,
          totalCiro: 0,
          kms: [],
          vehicles: [],
          topItems: []
        });
      }
      const m = modelsMap.get(key)!;
      m.vehicleCount += 1;
      m.operationCount += v.operationCount;
      m.totalCiro += v.totalCiro;
      if (v.km > 0) m.kms.push(v.km);
      m.vehicles.push(v);
    });

    // Also collect top parts for each model
    data.forEach(item => {
      const marka = item.aracMarka || 'Diğer Marka';
      const model = item.aracModel || 'Genel Model';
      const key = `${marka}__${model}`;
      const m = modelsMap.get(key);
      if (m) {
        const itemName = item.eslesenKatalog !== 'Eşleşmedi' ? item.eslesenKatalog : item.orijinalKodAd;
        const ciro = item.tutar || 0;
        const existing = m.topItems.find(i => i.name === itemName);
        if (existing) {
          existing.count += 1;
          existing.ciro += ciro;
        } else {
          m.topItems.push({ name: itemName, count: 1, ciro });
        }
      }
    });

    return Array.from(modelsMap.values()).map(m => {
      const avgKm = m.kms.length > 0 ? Math.round(m.kms.reduce((a, s) => a + s, 0) / m.kms.length) : 0;
      const ciroShare = fleetTotals.totalCiro > 0 ? ((m.totalCiro / fleetTotals.totalCiro) * 100).toFixed(1) : '0';
      const avgCiroPerVehicle = m.vehicleCount > 0 ? Math.round(m.totalCiro / m.vehicleCount) : 0;
      m.topItems.sort((a, b) => b.ciro - a.ciro);
      return {
        ...m,
        avgKm,
        ciroShare,
        avgCiroPerVehicle
      };
    }).sort((a, b) => b.totalCiro - a.totalCiro);
  }, [vehicleStats, data, fleetTotals]);

  // Filtered vehicles for Stage 1 table
  const filteredVehicles = useMemo(() => {
    if (!searchTerm) return vehicleStats;
    const term = searchTerm.toLowerCase();
    return vehicleStats.filter(v => 
      v.plaka.toLowerCase().includes(term) ||
      v.marka.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      String(v.km).includes(term)
    );
  }, [vehicleStats, searchTerm]);

  // Filtered models for Stage 3
  const filteredModels = useMemo(() => {
    let list = modelKmCiroStats;
    if (selectedBrand !== 'ALL') {
      list = list.filter(m => m.marka === selectedBrand);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(m => 
        m.marka.toLowerCase().includes(term) || 
        m.model.toLowerCase().includes(term) ||
        m.vehicles.some(v => v.plaka.toLowerCase().includes(term))
      );
    }
    return list;
  }, [modelKmCiroStats, selectedBrand, searchTerm]);

  // Selected model details for modal
  const activeModelDetails = useMemo(() => {
    if (!activeModelModal) return null;
    return modelKmCiroStats.find(m => m.marka === activeModelModal.marka && m.model === activeModelModal.model) || null;
  }, [activeModelModal, modelKmCiroStats]);

  const getKmSegment = (km: number) => {
    return KM_SEGMENTS.find(s => km >= s.minKm && km <= s.maxKm) || KM_SEGMENTS[0];
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & 3-Stage Progress Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Gauge className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-800">KM & Ciro Analizi (3 Kademeli)</h2>
                <p className="text-sm text-slate-500">
                  Kilometre aralıkları, araç sayıları ve üretilen toplam ciroların hiyerarşik 3 aşamalı görünümü.
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Buttons */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => { setStage(1); setSelectedBrand('ALL'); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                stage === 1 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${stage === 1 ? 'bg-white text-blue-600 font-bold' : 'bg-slate-300 text-slate-700'}`}>1</span>
              <span>Tüm Araçlar</span>
            </button>

            <ChevronRight className="w-4 h-4 text-slate-400 mx-0.5" />

            <button
              onClick={() => { setStage(2); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                stage === 2 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${stage === 2 ? 'bg-white text-blue-600 font-bold' : 'bg-slate-300 text-slate-700'}`}>2</span>
              <span>Araç Markası</span>
            </button>

            <ChevronRight className="w-4 h-4 text-slate-400 mx-0.5" />

            <button
              onClick={() => { setStage(3); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                stage === 3 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${stage === 3 ? 'bg-white text-blue-600 font-bold' : 'bg-slate-300 text-slate-700'}`}>3</span>
              <span>Marka - Model</span>
            </button>
          </div>
        </div>

        {/* Global Key Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Toplam Ciro</div>
            <div className="text-lg font-bold text-blue-700 mt-0.5">
              {fleetTotals.totalCiro.toLocaleString('tr-TR')} ₺
            </div>
            <div className="text-[10px] text-slate-400">Tüm Filo Hacmi</div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gelen Araç</div>
            <div className="text-lg font-bold text-slate-800 mt-0.5">
              {fleetTotals.totalVehicles} Araç
            </div>
            <div className="text-[10px] text-slate-400">Tekil Plaka</div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">İşlem / Parça</div>
            <div className="text-lg font-bold text-slate-800 mt-0.5">
              {fleetTotals.totalOperations} Adet
            </div>
            <div className="text-[10px] text-slate-400">Faturalanan Kalem</div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Filo Ort. KM</div>
            <div className="text-lg font-bold text-emerald-600 mt-0.5">
              {fleetTotals.avgKm.toLocaleString('tr-TR')} KM
            </div>
            <div className="text-[10px] text-slate-400">Ağırlıklı Ortalama</div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Araç Başı Ciro</div>
            <div className="text-lg font-bold text-indigo-600 mt-0.5">
              {fleetTotals.avgCiroPerVehicle.toLocaleString('tr-TR')} ₺
            </div>
            <div className="text-[10px] text-slate-400">Ort. Harcama</div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">İşlem Başı Ciro</div>
            <div className="text-lg font-bold text-amber-600 mt-0.5">
              {fleetTotals.avgCiroPerOperation.toLocaleString('tr-TR')} ₺
            </div>
            <div className="text-[10px] text-slate-400">Kalem Başı Tutar</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. AŞAMA: TÜM ARAÇLAR İÇİNDEKİ TOPLAM SAYI VE CİROLAR */}
      {/* ========================================================================= */}
      {stage === 1 && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl p-6 text-white shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-800 text-blue-200 mb-2 border border-blue-700">
                  1. Aşama Raporu
                </span>
                <h3 className="text-2xl font-bold">Tüm Araçlar İçindeki Toplam Sayı ve Cirolar</h3>
                <p className="text-blue-200 text-sm mt-1 max-w-2xl">
                  Servise giriş yapan tüm araçların kilometre bantlarına göre dağılımı, her banttaki tekil araç sayısı, işlem hacmi ve oluşturulan toplam ciro dökümü.
                </p>
              </div>
              <button
                onClick={() => setStage(2)}
                className="self-start md:self-auto flex items-center gap-2 bg-white text-blue-900 hover:bg-blue-50 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
              >
                <span>2. Aşamaya Geç (Marka Bazında)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* KM Aralıklarına Göre Ciro ve Sayı Tablosu & Grafiği */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart: KM Aralıklarına Göre Ciro ve Araç Sayısı */}
            <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  KM Aralıklarına Göre Ciro (₺) ve Araç Sayısı
                </h4>
                <span className="text-xs text-slate-400">Kilometre Bantları</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={segmentStats} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#64748b', fontSize: 11 }} 
                      angle={-15} 
                      textAnchor="end"
                    />
                    <YAxis 
                      yAxisId="left" 
                      orientation="left" 
                      tick={{ fill: '#3b82f6', fontSize: 11 }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k ₺`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tick={{ fill: '#10b981', fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      formatter={(val: any, name?: any) => {
                        if (name === 'Toplam Ciro') return [`${Number(val).toLocaleString('tr-TR')} ₺`, name || ''];
                        if (name === 'Araç Sayısı') return [`${val} Araç`, name || ''];
                        return [val, name || ''];
                      }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar yAxisId="left" dataKey="totalCiro" name="Toplam Ciro" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="vehicleCount" name="Araç Sayısı" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* KM Bantları Kartları Listesi */}
            <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  KM Aralıkları Dağılım Özeti
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Her kilometre bandındaki ciro ve araç yoğunluğu.
                </p>
                <div className="space-y-3">
                  {segmentStats.map(seg => (
                    <div key={seg.id} className="p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${seg.badgeColor}`}>
                            {seg.label}
                          </span>
                          <span className="text-xs text-slate-500 hidden sm:inline">{seg.description}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-blue-700">
                            {seg.totalCiro.toLocaleString('tr-TR')} ₺
                          </span>
                          <span className="text-xs text-slate-400 ml-1.5">
                            (%{seg.ciroShare})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                        <span>{seg.vehicleCount} Araç (%{seg.vehicleShare})</span>
                        <span>{seg.totalOps} İşlem</span>
                        <span>Ort. Araç: {seg.avgCiro.toLocaleString('tr-TR')} ₺</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Gelen Tüm Araçların KM ve Ciro Tablosu */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Car className="w-5 h-5 text-blue-600" />
                  Tüm Araçların KM ve Ciro Listesi ({filteredVehicles.length} Araç)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Her tekil aracın servisteki kilometre bilgisi, yapılan işlem adedi ve toplam üretilen ciro.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Plaka, marka, model veya KM ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-4 py-3">Plaka</th>
                    <th scope="col" className="px-4 py-3">Araç Marka & Model</th>
                    <th scope="col" className="px-4 py-3 text-right">Mevcut KM</th>
                    <th scope="col" className="px-4 py-3">KM Aralığı</th>
                    <th scope="col" className="px-4 py-3 text-center">İşlem Adedi</th>
                    <th scope="col" className="px-4 py-3 text-right">Toplam Ciro (₺)</th>
                    <th scope="col" className="px-4 py-3 text-right">Ciro Payı</th>
                    <th scope="col" className="px-4 py-3 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVehicles.map((v) => {
                    const seg = getKmSegment(v.km);
                    const ciroShare = fleetTotals.totalCiro > 0 ? ((v.totalCiro / fleetTotals.totalCiro) * 100).toFixed(1) : '0';
                    return (
                      <tr key={v.plaka} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          <span className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded text-xs">
                            {v.plaka}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{v.marka}</div>
                          <div className="text-xs text-slate-500">{v.model} • {v.filo}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                          {v.km.toLocaleString('tr-TR')} KM
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${seg.badgeColor}`}>
                            {seg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {v.operationCount} İşlem
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {v.totalCiro.toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500">
                          %{ciroShare}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedBrand(v.marka);
                              setStage(2);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline flex items-center justify-center gap-1"
                          >
                            <span>Markayı İncele</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. AŞAMA: ARAÇ MARKASI BAZINDA TOPLAM SAYI VE CİROLAR */}
      {/* ========================================================================= */}
      {stage === 2 && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl p-6 text-white shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setStage(1)}
                    className="p-1 rounded-md bg-white/10 hover:bg-white/20 transition-all text-white flex items-center text-xs gap-1 px-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>1. Aşama</span>
                  </button>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-800 text-indigo-200 border border-indigo-700">
                    2. Aşama Raporu
                  </span>
                </div>
                <h3 className="text-2xl font-bold">Araç Markası Bazında Toplam Sayı ve Cirolar</h3>
                <p className="text-indigo-200 text-sm mt-1 max-w-2xl">
                  Marka düzeyinde toplam tekil araç sayısı, üretilen ciro, ortalama araç kilometresi ve marka bazında KM segmentasyonu dökümü.
                </p>
              </div>
              <button
                onClick={() => setStage(3)}
                className="self-start md:self-auto flex items-center gap-2 bg-white text-indigo-900 hover:bg-indigo-50 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
              >
                <span>3. Aşamaya Geç (Marka-Model)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Marka Ciro ve Araç Sayısı Karşılaştırma Grafiği */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Araç Markalarına Göre Toplam Ciro (₺) ve Araç Sayısı
              </h4>
              <span className="text-xs text-slate-400">Marka Karşılaştırması</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brandKmCiroStats} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="marka" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    tick={{ fill: '#6366f1', fontSize: 11 }}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k ₺`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tick={{ fill: '#10b981', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    formatter={(val: any, name?: any) => {
                      if (name === 'Toplam Ciro') return [`${Number(val).toLocaleString('tr-TR')} ₺`, name || ''];
                      if (name === 'Gelen Araç') return [`${val} Araç`, name || ''];
                      return [val, name || ''];
                    }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar yAxisId="left" dataKey="totalCiro" name="Toplam Ciro" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="vehicleCount" name="Gelen Araç" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Marka Kartları Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brandKmCiroStats.map((brand) => (
              <div 
                key={brand.marka}
                className="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Araç Markası</span>
                      <h4 className="text-xl font-bold text-slate-800">{brand.marka}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-indigo-600">
                        {brand.totalCiro.toLocaleString('tr-TR')} ₺
                      </div>
                      <div className="text-xs text-slate-500 font-medium">Filo Payı: %{brand.ciroShare}</div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 my-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-500">Gelen Araç Sayısı</div>
                      <div className="text-base font-bold text-slate-800 mt-0.5">{brand.vehicleCount} Araç</div>
                      <div className="text-[10px] text-slate-400">Filo Payı: %{brand.vehicleShare}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-500">Toplam İşlem Adedi</div>
                      <div className="text-base font-bold text-slate-800 mt-0.5">{brand.operationCount} İşlem</div>
                      <div className="text-[10px] text-slate-400">Faturalanan Parça</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-500">Ortalama Araç KM</div>
                      <div className="text-base font-bold text-emerald-700 mt-0.5">{brand.avgKm.toLocaleString('tr-TR')} KM</div>
                      <div className="text-[10px] text-slate-400">Ağırlıklı KM</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-500">Araç Başı Ciro</div>
                      <div className="text-base font-bold text-indigo-700 mt-0.5">{brand.avgCiroPerVehicle.toLocaleString('tr-TR')} ₺</div>
                      <div className="text-[10px] text-slate-400">Ort. Harcama</div>
                    </div>
                  </div>

                  {/* Brand KM Breakdown */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-600 mb-2">KM Bantları Kırılımı:</div>
                    <div className="space-y-1.5">
                      {Object.entries(brand.segmentCounts).map(([segLabel, segData]) => (
                        <div key={segLabel} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50">
                          <span className="font-medium text-slate-700">{segLabel}</span>
                          <span className="text-slate-500">
                            {segData.vehicles} Araç • <strong className="text-slate-800">{segData.ciro.toLocaleString('tr-TR')} ₺</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Marka ve Model Kırılımı</span>
                  <button
                    onClick={() => {
                      setSelectedBrand(brand.marka);
                      setStage(3);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    <span>Modelleri Gör (3. Aşama)</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AŞAMA: ARAÇ MARKA-MODEL BAZINDA TOPLAM SAYI VE CİROLAR */}
      {/* ========================================================================= */}
      {stage === 3 && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-teal-900 to-emerald-900 rounded-xl p-6 text-white shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setStage(2)}
                    className="p-1 rounded-md bg-white/10 hover:bg-white/20 transition-all text-white flex items-center text-xs gap-1 px-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>2. Aşama (Markalar)</span>
                  </button>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-800 text-emerald-200 border border-emerald-700">
                    3. Aşama Raporu
                  </span>
                </div>
                <h3 className="text-2xl font-bold">Araç Marka-Model Bazında Toplam Sayı ve Cirolar</h3>
                <p className="text-emerald-200 text-sm mt-1 max-w-2xl">
                  Marka ve model kırılımında tekil araç sayısı, üretilen ciro, araçların bireysel kilometre bilgileri ve en çok ciro üreten parça kalemleri.
                </p>
              </div>
              <button
                onClick={() => { setStage(1); setSelectedBrand('ALL'); }}
                className="self-start md:self-auto flex items-center gap-2 bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
              >
                <span>Başa Dön (1. Aşama)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-semibold text-slate-500 mr-2">Marka Filtresi:</span>
              <button
                onClick={() => setSelectedBrand('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedBrand === 'ALL' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                Tüm Markalar ({modelKmCiroStats.length} Model)
              </button>
              {brandKmCiroStats.map(b => (
                <button
                  key={b.marka}
                  onClick={() => setSelectedBrand(b.marka)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedBrand === b.marka 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {b.marka} ({b.totalCiro.toLocaleString('tr-TR')} ₺)
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Model veya plaka ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Model Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModels.map((model) => (
              <div 
                key={model.key}
                className="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6">
                  {/* Model Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
                        {model.marka}
                      </span>
                      <h4 className="text-xl font-bold text-slate-800">{model.model}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-600">
                        {model.totalCiro.toLocaleString('tr-TR')} ₺
                      </div>
                      <div className="text-xs text-slate-500 font-medium">Filo Payı: %{model.ciroShare}</div>
                    </div>
                  </div>

                  {/* Model Metrics */}
                  <div className="grid grid-cols-3 gap-2 my-4">
                    <div className="bg-slate-50 p-2.5 rounded-lg text-center border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium">Gelen Araç</div>
                      <div className="text-base font-bold text-slate-800">{model.vehicleCount}</div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg text-center border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium">İşlem Adedi</div>
                      <div className="text-base font-bold text-slate-800">{model.operationCount}</div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg text-center border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium">Ortalama KM</div>
                      <div className="text-sm font-bold text-emerald-700">{model.avgKm.toLocaleString('tr-TR')}</div>
                    </div>
                  </div>

                  {/* Vehicles of this model with KM and Ciro */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
                      <span>Bu Modele Ait Gelen Araçlar:</span>
                      <span className="text-[11px] text-slate-400">{model.vehicles.length} Araç</span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {model.vehicles.map(v => (
                        <div key={v.plaka} className="flex items-center justify-between p-2 rounded bg-slate-50 text-xs border border-slate-100">
                          <span className="font-mono font-bold text-slate-800">{v.plaka}</span>
                          <span className="font-mono font-semibold text-emerald-700">{v.km.toLocaleString('tr-TR')} KM</span>
                          <span className="font-bold text-slate-900">{v.totalCiro.toLocaleString('tr-TR')} ₺</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer Button: Show Part Breakdown */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{model.topItems.length} Farklı Kalem</span>
                  <button
                    onClick={() => setActiveModelModal({ marka: model.marka, model: model.model })}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
                  >
                    <span>En Çok Ciro Getiren Parçalar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model Parça & Ciro Dağılım Modalı */}
      {activeModelModal && activeModelDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {activeModelDetails.marka}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{activeModelDetails.model} Parça ve Ciro Dağılımı</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Bu modelde faturalanan en yüksek tutarlı parçalar ve işlem kalemleri.
                </p>
              </div>
              <button
                onClick={() => setActiveModelModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
                  <div className="text-[10px] font-semibold text-emerald-700 uppercase">Toplam Model Cirosu</div>
                  <div className="text-lg font-black text-emerald-800 mt-0.5">
                    {activeModelDetails.totalCiro.toLocaleString('tr-TR')} ₺
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                  <div className="text-[10px] font-semibold text-blue-700 uppercase">Gelen Araç</div>
                  <div className="text-lg font-black text-blue-800 mt-0.5">
                    {activeModelDetails.vehicleCount} Araç
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-center">
                  <div className="text-[10px] font-semibold text-purple-700 uppercase">Ortalama KM</div>
                  <div className="text-lg font-black text-purple-800 mt-0.5">
                    {activeModelDetails.avgKm.toLocaleString('tr-TR')} KM
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  En Yüksek Ciro Üreten Parça ve İşlem Kalemleri
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Parça / İşlem Adı</th>
                        <th className="px-3 py-2 text-center">Adet</th>
                        <th className="px-3 py-2 text-right">Toplam Ciro (₺)</th>
                        <th className="px-3 py-2 text-right">Model Payı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeModelDetails.topItems.map((item, idx) => {
                        const itemShare = activeModelDetails.totalCiro > 0 
                          ? ((item.ciro / activeModelDetails.totalCiro) * 100).toFixed(1) 
                          : '0';
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              {item.name}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-600 font-mono">
                              {item.count}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-900 font-mono">
                              {item.ciro.toLocaleString('tr-TR')} ₺
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-500 font-mono">
                              %{itemShare}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setActiveModelModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-all"
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
