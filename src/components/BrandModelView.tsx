import React, { useState, useMemo } from 'react';
import { 
  Car, 
  Search, 
  ChevronRight, 
  Tag, 
  ArrowLeft, 
  Award, 
  X, 
  Layers, 
  Wrench, 
  BarChart2, 
  CheckCircle2, 
  Filter,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell 
} from 'recharts';
import { ProcessedRecord, normalizeVehicleBrand, normalizeVehicleModel } from '../lib/engine';

export interface BrandModelItem {
  marka: string;
  total: number;
  vehicleCount?: number;
  totalCiro?: number;
  avgKm?: number;
  models: {
    model: string;
    count: number;
    vehicleCount?: number;
    plates?: string[];
    totalCiro?: number;
    avgKm?: number;
  }[];
}

interface BrandModelViewProps {
  brandModelData: BrandModelItem[];
  data: ProcessedRecord[];
}

export default function BrandModelView({ brandModelData, data }: BrandModelViewProps) {
  // Stage control: 1 = Tüm Araçlar, 2 = Marka, 3 = Marka Model
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [brandSortBy, setBrandSortBy] = useState<'vehicles' | 'items' | 'name'>('vehicles');
  const [modalFilter, setModalFilter] = useState<'all' | 'bosch' | 'non-bosch' | 'yag' | 'iscilik'>('all');

  // Compute unique vehicles across all records
  const uniqueVehiclesMap = useMemo(() => {
    const map = new Map<string, {
      plaka: string;
      marka: string;
      model: string;
      filo: string;
      servis: string;
      km: number;
      totalCiro: number;
      itemCount: number;
      items: string[];
    }>();

    data.forEach((r, idx) => {
      const plakaClean = (r.plaka || '').trim().toUpperCase();
      const normBrand = normalizeVehicleBrand(r.aracMarka || 'Diğer Marka');
      const normModel = normalizeVehicleModel(normBrand, r.aracModel || 'Genel Model');
      const key = plakaClean || `ARAC_${normBrand}_${normModel}_${r.satirNo || idx}`;
      const displayPlate = plakaClean || `Plakasız (${normBrand} ${normModel})`;
      const ciro = r.tutar || 0;
      const km = r.km || 0;

      if (!map.has(key)) {
        map.set(key, {
          plaka: displayPlate,
          marka: normBrand,
          model: normModel,
          filo: r.filoAdi || 'Ana Filo',
          servis: r.servisIsmi || 'Merkez Servis',
          km: km,
          totalCiro: ciro,
          itemCount: 0,
          items: []
        });
      }

      const entry = map.get(key)!;
      entry.itemCount += 1;
      entry.totalCiro += ciro;
      if (km > entry.km) entry.km = km;
      const itemName = r.ph3Type || (r.eslesenKatalog !== 'Eşleşmedi' ? r.eslesenKatalog : r.orijinalKodAd);
      if (itemName && !entry.items.includes(itemName) && entry.items.length < 4) {
        entry.items.push(itemName);
      }
    });

    return map;
  }, [data]);

  const allVehiclesList = useMemo(() => {
    return Array.from(uniqueVehiclesMap.values());
  }, [uniqueVehiclesMap]);

  const totalUniqueVehicles = allVehiclesList.length || 1;
  const totalItemRecords = data.length || 1;
  const totalCiroAll = allVehiclesList.reduce((sum, v) => sum + v.totalCiro, 0);
  const kmsAll = allVehiclesList.map(v => v.km).filter(k => k > 0);
  const avgKmAll = kmsAll.length > 0 ? Math.round(kmsAll.reduce((a, b) => a + b, 0) / kmsAll.length) : 0;
  const avgItemsPerVehicle = (totalItemRecords / totalUniqueVehicles).toFixed(1);

  // Compute enriched brands data
  const enrichedBrands = useMemo(() => {
    return brandModelData.map(b => {
      // Find actual vehicles belonging to this brand
      const brandVehicles = allVehiclesList.filter(v => v.marka === b.marka);
      const vehicleCount = brandVehicles.length || b.vehicleCount || 1;
      const brandTotalCiro = brandVehicles.reduce((sum, v) => sum + v.totalCiro, 0) || b.totalCiro || 0;
      const brandKms = brandVehicles.map(v => v.km).filter(k => k > 0);
      const brandAvgKm = brandKms.length > 0 ? Math.round(brandKms.reduce((s, k) => s + k, 0) / brandKms.length) : (b.avgKm || 0);

      const enrichedModels = b.models.map(m => {
        const modelVehicles = brandVehicles.filter(v => v.model === m.model);
        const mVehicleCount = modelVehicles.length || m.vehicleCount || 1;
        const plates = modelVehicles.map(v => v.plaka).filter(Boolean);
        const modelTotalCiro = modelVehicles.reduce((sum, v) => sum + v.totalCiro, 0) || m.totalCiro || 0;
        const modelKms = modelVehicles.map(v => v.km).filter(k => k > 0);
        const modelAvgKm = modelKms.length > 0 ? Math.round(modelKms.reduce((s, k) => s + k, 0) / modelKms.length) : (m.avgKm || 0);
        return {
          ...m,
          vehicleCount: mVehicleCount,
          totalCiro: modelTotalCiro,
          avgKm: modelAvgKm,
          plates: plates.length > 0 ? plates : (m.plates || [])
        };
      }).sort((a, b) => (b.vehicleCount || 0) - (a.vehicleCount || 0));

      return {
        ...b,
        vehicleCount,
        totalCiro: brandTotalCiro,
        avgKm: brandAvgKm,
        percentage: Math.round((vehicleCount / totalUniqueVehicles) * 100),
        models: enrichedModels
      };
    });
  }, [brandModelData, allVehiclesList, totalUniqueVehicles]);

  // Sorted brands for Stage 2
  const sortedBrands = useMemo(() => {
    return [...enrichedBrands].sort((a, b) => {
      if (brandSortBy === 'vehicles') return b.vehicleCount - a.vehicleCount;
      if (brandSortBy === 'items') return b.total - a.total;
      return a.marka.localeCompare(b.marka, 'tr');
    });
  }, [enrichedBrands, brandSortBy]);

  // Filtered brands for search
  const filteredBrands = useMemo(() => {
    return sortedBrands.filter(item => 
      item.marka.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedBrands, searchTerm]);

  // Stage 1: Filtered vehicles list
  const filteredVehicles = useMemo(() => {
    if (!searchTerm) return allVehiclesList;
    const term = searchTerm.toLowerCase();
    return allVehiclesList.filter(v => 
      v.plaka.toLowerCase().includes(term) ||
      v.marka.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.filo.toLowerCase().includes(term) ||
      v.servis.toLowerCase().includes(term)
    );
  }, [allVehiclesList, searchTerm]);

  // Stage 3: Models list
  const activeBrandObj = useMemo(() => {
    if (!selectedBrand) return null;
    return enrichedBrands.find(b => b.marka === selectedBrand) || null;
  }, [enrichedBrands, selectedBrand]);

  const displayedModels = useMemo(() => {
    let list: {
      marka: string;
      model: string;
      count: number;
      vehicleCount: number;
      totalCiro: number;
      avgKm: number;
      plates: string[];
      topItems: { name: string; count: number; ph3Code?: string; category?: string }[];
      stats: {
        bosch: { count: number; ciro: number };
        nonBosch: { count: number; ciro: number };
        yag: { count: number; ciro: number };
        iscilik: { count: number; ciro: number };
      };
    }[] = [];

    const getModelDetails = (brand: string, model: string) => {
      let boschCount = 0, boschCiro = 0;
      let nonBoschCount = 0, nonBoschCiro = 0;
      let yagCount = 0, yagCiro = 0;
      let iscilikCount = 0, iscilikCiro = 0;
      const map: Record<string, { count: number; ph3Code?: string; category?: string }> = {};

      data.forEach(r => {
        if (r.aracMarka === brand && r.aracModel === model) {
          const ciro = r.tutar || 0;
          const itemName = r.ph3Type || (r.eslesenKatalog !== 'Eşleşmedi' ? r.eslesenKatalog : r.orijinalKodAd);
          const nameUpper = (itemName || '').toUpperCase();
          const isYag = r.isYag || nameUpper.includes('YAĞ') || nameUpper.includes('OIL') || nameUpper.includes('0W') || nameUpper.includes('5W');
          const isIscilik = r.isIscilik || nameUpper.includes('İŞÇİLİK') || nameUpper.includes('BAKIM İŞÇİLİĞİ') || nameUpper.includes('MONTAJ');
          const isBosch = r.isBosch || nameUpper.includes('BOSCH');

          if (isIscilik) {
            iscilikCount += 1;
            iscilikCiro += ciro;
          } else if (isYag) {
            yagCount += 1;
            yagCiro += ciro;
          } else if (isBosch) {
            boschCount += 1;
            boschCiro += ciro;
          } else {
            nonBoschCount += 1;
            nonBoschCiro += ciro;
          }

          if (itemName) {
            if (!map[itemName]) {
              map[itemName] = { count: 0, ph3Code: r.ph3Code, category: r.seviye1 };
            }
            map[itemName].count += 1;
          }
        }
      });

      const topItems = Object.entries(map)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([name, val]) => ({ name, count: val.count, ph3Code: val.ph3Code, category: val.category }));

      return {
        topItems,
        stats: {
          bosch: { count: boschCount, ciro: boschCiro },
          nonBosch: { count: nonBoschCount, ciro: nonBoschCiro },
          yag: { count: yagCount, ciro: yagCiro },
          iscilik: { count: iscilikCount, ciro: iscilikCiro }
        }
      };
    };

    if (selectedBrand && activeBrandObj) {
      list = activeBrandObj.models.map(m => {
        const details = getModelDetails(selectedBrand, m.model);
        return {
          marka: selectedBrand,
          model: m.model,
          count: m.count,
          vehicleCount: m.vehicleCount || 1,
          totalCiro: m.totalCiro || 0,
          avgKm: m.avgKm || 0,
          plates: m.plates || [],
          topItems: details.topItems,
          stats: details.stats
        };
      });
    } else {
      // Show all models across all brands
      enrichedBrands.forEach(b => {
        b.models.forEach(m => {
          const details = getModelDetails(b.marka, m.model);
          list.push({
            marka: b.marka,
            model: m.model,
            count: m.count,
            vehicleCount: m.vehicleCount || 1,
            totalCiro: m.totalCiro || 0,
            avgKm: m.avgKm || 0,
            plates: m.plates || [],
            topItems: details.topItems,
            stats: details.stats
          });
        });
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(item => 
        item.model.toLowerCase().includes(term) || 
        item.marka.toLowerCase().includes(term) ||
        item.plates.some(p => p.toLowerCase().includes(term))
      );
    }

    return list.sort((a, b) => b.vehicleCount - a.vehicleCount);
  }, [selectedBrand, activeBrandObj, enrichedBrands, searchTerm, data]);

  // Top 5 items for a model modal
  const getTopItemsForModel = (brand: string, model: string) => {
    const map: Record<string, { count: number; ph3Code?: string; category?: string }> = {};
    data.forEach(r => {
      if (r.aracMarka === brand && r.aracModel === model) {
        const itemName = r.ph3Type || (r.eslesenKatalog !== 'Eşleşmedi' ? r.eslesenKatalog : r.orijinalKodAd);
        if (itemName) {
          if (!map[itemName]) {
            map[itemName] = { count: 0, ph3Code: r.ph3Code, category: r.seviye1 };
          }
          map[itemName].count += 1;
        }
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, val]) => ({ name, count: val.count, ph3Code: val.ph3Code, category: val.category }));
  };

  const topItemsForActiveModel = selectedBrand && selectedModel ? getTopItemsForModel(selectedBrand, selectedModel) : [];

  const activeModelRecords = useMemo(() => {
    if (!selectedBrand || !selectedModel) return [];
    return data.filter(r => r.aracMarka === selectedBrand && r.aracModel === selectedModel);
  }, [data, selectedBrand, selectedModel]);

  const modelCategorySummary = useMemo(() => {
    let boschCount = 0, boschCiro = 0;
    let nonBoschCount = 0, nonBoschCiro = 0;
    let yagCount = 0, yagCiro = 0;
    let iscilikCount = 0, iscilikCiro = 0;

    activeModelRecords.forEach(r => {
      const ciro = r.tutar || 0;
      const nameUpper = (r.ph3Type || r.eslesenKatalog || r.orijinalKodAd || '').toUpperCase();
      const isYag = r.isYag || nameUpper.includes('YAĞ') || nameUpper.includes('OIL') || nameUpper.includes('0W') || nameUpper.includes('5W');
      const isIscilik = r.isIscilik || nameUpper.includes('İŞÇİLİK') || nameUpper.includes('BAKIM İŞÇİLİĞİ') || nameUpper.includes('MONTAJ');
      const isBosch = r.isBosch || nameUpper.includes('BOSCH');

      if (isIscilik) {
        iscilikCount += 1;
        iscilikCiro += ciro;
      } else if (isYag) {
        yagCount += 1;
        yagCiro += ciro;
      } else if (isBosch) {
        boschCount += 1;
        boschCiro += ciro;
      } else {
        nonBoschCount += 1;
        nonBoschCiro += ciro;
      }
    });

    return {
      bosch: { count: boschCount, ciro: boschCiro },
      nonBosch: { count: nonBoschCount, ciro: nonBoschCiro },
      yag: { count: yagCount, ciro: yagCiro },
      iscilik: { count: iscilikCount, ciro: iscilikCiro }
    };
  }, [activeModelRecords]);

  const filteredModalItems = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalCiro: number; ph3Code?: string; category?: string; type: 'bosch' | 'non-bosch' | 'yag' | 'iscilik' }> = {};
    
    activeModelRecords.forEach(r => {
      const name = r.ph3Type || (r.eslesenKatalog !== 'Eşleşmedi' ? r.eslesenKatalog : r.orijinalKodAd) || 'Diğer Kalem';
      const nameUpper = name.toUpperCase();
      const isYag = r.isYag || nameUpper.includes('YAĞ') || nameUpper.includes('OIL') || nameUpper.includes('0W') || nameUpper.includes('5W');
      const isIscilik = r.isIscilik || nameUpper.includes('İŞÇİLİK') || nameUpper.includes('BAKIM İŞÇİLİĞİ') || nameUpper.includes('MONTAJ');
      const isBosch = r.isBosch || nameUpper.includes('BOSCH');

      let itemType: 'bosch' | 'non-bosch' | 'yag' | 'iscilik' = 'non-bosch';
      if (isIscilik) itemType = 'iscilik';
      else if (isYag) itemType = 'yag';
      else if (isBosch) itemType = 'bosch';

      if (!map[name]) {
        map[name] = { name, count: 0, totalCiro: 0, ph3Code: r.ph3Code, category: r.seviye1, type: itemType };
      }
      map[name].count += 1;
      map[name].totalCiro += (r.tutar || 0);
    });

    let items = Object.values(map);
    if (modalFilter === 'bosch') items = items.filter(i => i.type === 'bosch');
    if (modalFilter === 'non-bosch') items = items.filter(i => i.type === 'non-bosch');
    if (modalFilter === 'yag') items = items.filter(i => i.type === 'yag');
    if (modalFilter === 'iscilik') items = items.filter(i => i.type === 'iscilik');

    return items.sort((a, b) => b.totalCiro - a.totalCiro);
  }, [activeModelRecords, modalFilter]);

  // Chart data for brand vehicle distribution
  const chartData = useMemo(() => {
    return enrichedBrands.slice(0, 8).map(b => ({
      name: b.marka,
      aracSayisi: b.vehicleCount,
      parcaSayisi: b.total
    }));
  }, [enrichedBrands]);

  return (
    <div className="space-y-6">
      {/* 3-Stage Interactive Stepper Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-1.5">
              <Car className="w-3.5 h-3.5" />
              Gelen Araç Analiz Sistemi
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Gelen Araç Sayısı (3 Aşamalı Görünüm)
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Servis ve filo verilerini 3 kademede inceleyin: Tüm Araçlar, Marka ve Marka Model kırılımları.
            </p>
          </div>

          {/* Direct Stage Navigation Tabs */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl text-xs font-semibold self-start md:self-center">
            <button
              onClick={() => { setStage(1); setSearchTerm(''); }}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 ${
                stage === 1 
                  ? 'bg-white text-blue-700 shadow-xs font-bold border border-slate-200/60' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">1</span>
              <span>Tüm Araçlar</span>
              <span className="bg-slate-200/80 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {totalUniqueVehicles}
              </span>
            </button>

            <button
              onClick={() => { setStage(2); setSearchTerm(''); }}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 ${
                stage === 2 
                  ? 'bg-white text-blue-700 shadow-xs font-bold border border-slate-200/60' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">2</span>
              <span>Marka</span>
              <span className="bg-slate-200/80 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {enrichedBrands.length}
              </span>
            </button>

            <button
              onClick={() => { setStage(3); setSearchTerm(''); }}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 ${
                stage === 3 
                  ? 'bg-white text-blue-700 shadow-xs font-bold border border-slate-200/60' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">3</span>
              <span>Marka Model</span>
              {selectedBrand && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {selectedBrand}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Breadcrumb & Quick Filter Header */}
        <div className="pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span 
              onClick={() => { setStage(1); setSelectedBrand(null); setSelectedModel(null); }}
              className="hover:text-blue-600 cursor-pointer flex items-center gap-1"
            >
              <Car className="w-3.5 h-3.5 text-blue-600" />
              Tüm Araçlar ({totalUniqueVehicles})
            </span>

            {stage >= 2 && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span 
                  onClick={() => { setStage(2); }}
                  className={`cursor-pointer ${stage === 2 ? 'font-bold text-blue-700' : 'hover:text-blue-600'}`}
                >
                  Markalar ({enrichedBrands.length})
                </span>
              </>
            )}

            {stage === 3 && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-blue-700">
                  {selectedBrand ? `${selectedBrand} Modelleri` : 'Tüm Modeller'}
                </span>
              </>
            )}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                stage === 1 
                  ? "Plaka, marka, filo ara..." 
                  : stage === 2 
                    ? "Marka ara..." 
                    : "Model veya plaka ara..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 1. AŞAMA: TÜM ARAÇLAR (Genel Araç Hacmi & Tekil Araç Listesi) */}
      {/* ================================================================ */}
      {stage === 1 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top KPI Cards for All Vehicles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Toplam Gelen Araç */}
            <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  Toplam Gelen Araç
                </span>
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                  <Car className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{totalUniqueVehicles}</div>
              <div className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tekil Plaka / Servis Girişi</span>
              </div>
            </div>

            {/* Card 2: Toplam Parça / İşlem */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Toplam Yapılan İşlem
                </span>
                <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
                  <Wrench className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{totalItemRecords}</div>
              <div className="text-xs text-slate-500 mt-1">
                Faturalanan parça & hizmet satırı
              </div>
            </div>

            {/* Card 3: Araç Başına Ortalama İşlem */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ortalama İşlem / Araç
                </span>
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{avgItemsPerVehicle}</div>
              <div className="text-xs text-slate-500 mt-1">
                Her araca uygulanan ort. parça/işçilik
              </div>
            </div>

            {/* Card 4: Farklı Marka Sayısı */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Hizmet Verilen Marka
                </span>
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{enrichedBrands.length}</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">
                Aktif araç markası çeşitliliği
              </div>
            </div>
          </div>

          {/* Quick Stage 2 Callout Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-200" />
                2. Aşamaya Geçin: Marka Bazında Araç Sayıları
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Her markadan gelen tekil araç sayısını ve filo paylarını detaylı grafiklerle karşılaştırın.
              </p>
            </div>
            <button
              onClick={() => setStage(2)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition-colors shadow-xs whitespace-nowrap self-start sm:self-auto"
            >
              <span>2. Aşama (Markalar)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Marka Dağılım Çubukları & Hızlı Bakış */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  Markalara Göre Gelen Araç Dağılımı
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Her markanın toplam gelen araçlar içerisindeki payı ve tekil araç sayısı.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Toplam: {totalUniqueVehicles} Araç
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {enrichedBrands.map((b, idx) => (
                <div 
                  key={idx}
                  onClick={() => { setSelectedBrand(b.marka); setStage(3); }}
                  className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                      {b.marka}
                    </span>
                    <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      {b.vehicleCount} Araç
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(b.percentage, 8)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Filo Payı: %{b.percentage}</span>
                    <span className="flex items-center gap-1 text-blue-600 group-hover:translate-x-0.5 transition-transform">
                      <span>Modeller</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tüm Gelen Araçlar Listesi Tablosu */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  Sisteme Gelen Tüm Araçların Listesi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Her tekil araç, modeli, bağlı olduğu filo ve yapılan işlem adedi.
                </p>
              </div>
              <div className="text-xs font-bold bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200">
                {filteredVehicles.length} Araç Listeleniyor
              </div>
            </div>

            <div className="overflow-x-auto max-h-[440px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Plaka</th>
                    <th className="px-4 py-3">Marka & Model</th>
                    <th className="px-4 py-3 text-right">KM</th>
                    <th className="px-4 py-3 text-right">Ciro (₺)</th>
                    <th className="px-4 py-3">Yapılan İşlem / Parça</th>
                    <th className="px-4 py-3">Uygulanan Kalemler (Örnek)</th>
                    <th className="px-4 py-3">Filo & Servis</th>
                    <th className="px-4 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVehicles.map((v, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          {v.plaka}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{v.marka}</div>
                        <div className="text-slate-500">{v.model}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {v.km ? `${v.km.toLocaleString('tr-TR')} KM` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {v.totalCiro ? `${v.totalCiro.toLocaleString('tr-TR')} ₺` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {v.itemCount} Kalem İşlem
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="flex flex-wrap gap-1">
                          {v.items.map((it, itIdx) => (
                            <span key={itIdx} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] truncate max-w-[140px]" title={it}>
                              {it}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-medium text-slate-800">{v.filo}</div>
                        <div className="text-[11px] text-slate-400">{v.servis}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setSelectedBrand(v.marka); setStage(2); }}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-semibold transition-colors text-[11px]"
                        >
                          Markayı İncele →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 2. AŞAMA: MARKA (Markalara Göre Gelen Araç Sayısı) */}
      {/* ================================================================ */}
      {stage === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Stage 2 Controls & Sorting */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStage(1)}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="1. Aşama Tüm Araçlara Geri Dön"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  2. Aşama: Markalara Göre Gelen Araç Sayısı
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  İncelemek istediğiniz markayı seçerek o markanın model kırılımına (3. Aşama) geçebilirsiniz.
                </p>
              </div>
            </div>

            {/* Sort options */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Sırala:</span>
              <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setBrandSortBy('vehicles')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    brandSortBy === 'vehicles' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Araç Sayısı
                </button>
                <button
                  onClick={() => setBrandSortBy('items')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    brandSortBy === 'items' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  İşlem Sayısı
                </button>
                <button
                  onClick={() => setBrandSortBy('name')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    brandSortBy === 'name' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Alfabetik
                </button>
              </div>
            </div>
          </div>

          {/* Bar Chart: Marka Karşılaştırması */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
              <h4 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                Markalara Göre Gelen Araç Sayısı Karşılaştırması
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Mavi çubuklar gelen tekil araç sayısını, amber çubuklar faturalanan toplam parça/işlem sayısını gösterir.
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any, name: any) => [
                        `${val} ${name === 'aracSayisi' ? 'Araç' : 'İşlem/Parça'}`,
                        name === 'aracSayisi' ? 'Gelen Araç Sayısı' : 'Yapılan İşlem Adedi'
                      ]}
                    />
                    <Bar dataKey="aracSayisi" name="aracSayisi" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="parcaSayisi" name="parcaSayisi" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Brand Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBrands.map((b, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedBrand(b.marka);
                  setStage(3);
                }}
                className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/20 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-xs">
                        {b.marka.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg group-hover:text-blue-700 transition-colors">
                          {b.marka}
                        </h4>
                        <span className="text-xs text-slate-500 font-medium">
                          {b.models.length} Farklı Model
                        </span>
                      </div>
                    </div>

                    {/* Vurgulu Gelen Araç Sayısı Rozeti */}
                    <div className="text-right">
                      <div className="bg-blue-600 text-white font-extrabold px-3 py-1 rounded-full text-xs shadow-xs inline-block">
                        {b.vehicleCount} Araç
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Gelen Araç</div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    {/* Progress of vehicle share */}
                    <div>
                      <div className="flex justify-between text-xs mb-1 font-medium">
                        <span className="text-slate-600">Filo Araç Payı</span>
                        <span className="font-bold text-slate-900">%{b.percentage}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(b.percentage, 8)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats table row */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-500 text-[11px] block">Toplam Ciro</span>
                        <span className="font-bold text-blue-700">
                          {b.totalCiro ? `${b.totalCiro.toLocaleString('tr-TR')} ₺` : '-'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-500 text-[11px] block">Ortalama KM</span>
                        <span className="font-bold text-emerald-700">
                          {b.avgKm ? `${b.avgKm.toLocaleString('tr-TR')} KM` : '-'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-500 text-[11px] block">Toplam İşlem</span>
                        <span className="font-bold text-slate-800">{b.total} Kayıt</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-500 text-[11px] block">İşlem / Araç</span>
                        <span className="font-bold text-slate-800">
                          {(b.total / (b.vehicleCount || 1)).toFixed(1)} Adet
                        </span>
                      </div>
                    </div>

                    {/* Model pills preview */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                        İçerdiği Modeller:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {b.models.slice(0, 4).map((m, mIdx) => (
                          <span key={mIdx} className="bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded font-medium">
                            {m.model} ({m.vehicleCount} araç)
                          </span>
                        ))}
                        {b.models.length > 4 && (
                          <span className="bg-slate-200 text-slate-600 text-[11px] px-1.5 py-0.5 rounded font-medium">
                            +{b.models.length - 4} diğer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:bg-blue-50 transition-colors">
                  <span>Modelleri İncele (3. Aşama)</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 3. AŞAMA: MARKA MODEL (Marka ve Modellere Göre Gelen Araç Sayısı) */}
      {/* ================================================================ */}
      {stage === 3 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Stage 3 Controls & Brand Filter Pills */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStage(2)}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="2. Aşama Markalara Geri Dön"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600" />
                    3. Aşama: Marka Model Kırılımında Gelen Araç Sayısı
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modeller bazında gelen araç sayıları, ciro dağılımı ve uygulanan ilk 5 parçayı görüntüleyin.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {displayedModels.length} Model Listeleniyor
                </span>
              </div>
            </div>

            {/* Brand Filter Pills */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Marka:
              </span>
              <button
                onClick={() => setSelectedBrand(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedBrand === null 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tüm Markalar ({totalUniqueVehicles} Araç)
              </button>
              {enrichedBrands.map((b, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedBrand(b.marka)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedBrand === b.marka 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{b.marka}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedBrand === b.marka ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {b.vehicleCount}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Model Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedModels.map((m, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-teal-50/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-2xs">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                          {m.marka}
                        </span>
                        <h4 className="font-bold text-slate-900 text-base">
                          {m.model}
                        </h4>
                      </div>
                    </div>

                    {/* Vurgulu Gelen Araç Rozeti */}
                    <div className="text-right">
                      <span className="bg-emerald-600 text-white font-extrabold px-3 py-1 rounded-full text-xs shadow-xs inline-block">
                        {m.vehicleCount} Araç
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">Tekil Araç</div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    {/* Model KPI Row */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-500 text-[10px] block font-medium">Toplam Ciro</span>
                        <span className="font-bold text-emerald-700 text-xs">
                          {m.totalCiro ? `${m.totalCiro.toLocaleString('tr-TR')} ₺` : '-'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-500 text-[10px] block font-medium">Ortalama KM</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {m.avgKm ? `${m.avgKm.toLocaleString('tr-TR')} KM` : '-'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-500 text-[10px] block font-medium">İşlem / Parça</span>
                        <span className="font-bold text-slate-900 text-xs">{m.count} Adet</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-500 text-[10px] block font-medium">Ort. İşlem/Araç</span>
                        <span className="font-bold text-slate-900 text-xs">
                          {(m.count / (m.vehicleCount || 1)).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Bosch, Diğer Parça, Motor Yağı, İşçilik Kırılımı */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 block">Kategori / Parça Dağılımı:</span>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className="bg-blue-50/70 p-1.5 rounded border border-blue-100 flex flex-col">
                          <span className="text-blue-800 font-bold">Bosch Parça</span>
                          <span className="font-mono text-blue-900 font-semibold">{m.stats.bosch.count} Adet ({m.stats.bosch.ciro.toLocaleString('tr-TR')} ₺)</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded border border-slate-200 flex flex-col">
                          <span className="text-slate-700 font-bold">Diğer Parça</span>
                          <span className="font-mono text-slate-800 font-semibold">{m.stats.nonBosch.count} Adet ({m.stats.nonBosch.ciro.toLocaleString('tr-TR')} ₺)</span>
                        </div>
                        <div className="bg-amber-50/70 p-1.5 rounded border border-amber-100 flex flex-col">
                          <span className="text-amber-800 font-bold">Motor Yağı</span>
                          <span className="font-mono text-amber-900 font-semibold">{m.stats.yag.count} Adet ({m.stats.yag.ciro.toLocaleString('tr-TR')} ₺)</span>
                        </div>
                        <div className="bg-emerald-50/70 p-1.5 rounded border border-emerald-100 flex flex-col">
                          <span className="text-emerald-800 font-bold">İşçilik</span>
                          <span className="font-mono text-emerald-900 font-semibold">{m.stats.iscilik.count} Adet ({m.stats.iscilik.ciro.toLocaleString('tr-TR')} ₺)</span>
                        </div>
                      </div>
                    </div>

                    {/* Kullanılan Malzemeler & Parçalar (Hover ile Kod / Ad) */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-600">Kullanılan Başlıca Malzemeler:</span>
                        <span className="text-[10px] text-slate-400 font-medium">(Üzerine gelip kod/ad gör)</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.topItems && m.topItems.length > 0 ? (
                          m.topItems.map((item, itIdx) => (
                            <span 
                              key={itIdx}
                              className="bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 cursor-help transition-colors truncate max-w-full"
                              title={`Parça / İşlem Adı: ${item.name}${item.ph3Code ? `\nParça Kodu (PH3): ${item.ph3Code}` : ''}${item.category ? `\nKategori: ${item.category}` : ''}\nKullanım Adedi: ${item.count} kez`}
                            >
                              {item.name} <span className="text-[10px] text-slate-400 font-mono font-bold">({item.count})</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400">Malzeme bilgisi bulunamadı</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top 5 Parts Action Button */}
                <div className="p-4 bg-slate-50/60 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedBrand(m.marka);
                      setSelectedModel(m.model);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-600 hover:text-white text-emerald-700 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 group"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white transition-colors" />
                    <span>En Çok Kullanılan İlk 5 Parçayı Gör</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Top Parts & Category Breakdown Modal for Selected Model */}
      {/* ================================================================ */}
      {selectedModel && selectedBrand && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedBrand} {selectedModel} - Malzeme & Ciro Kırılımı
                  </h3>
                  <p className="text-xs text-emerald-700">Bosch, Bosch Olmayan, Motor Yağı ve İşçilik Dağılımı</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedModel(null); setModalFilter('all'); }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Summary Quick Cards */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => setModalFilter('bosch')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  modalFilter === 'bosch' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 text-slate-800'
                }`}
              >
                <div className={`text-[10px] font-bold uppercase tracking-wider ${modalFilter === 'bosch' ? 'text-blue-100' : 'text-slate-500'}`}>Bosch Parça</div>
                <div className="font-extrabold text-sm mt-0.5">{modelCategorySummary.bosch.count} Adet</div>
                <div className={`text-[11px] font-mono mt-0.5 ${modalFilter === 'bosch' ? 'text-blue-50' : 'text-blue-600'}`}>
                  {modelCategorySummary.bosch.ciro.toLocaleString('tr-TR')} ₺
                </div>
              </button>

              <button
                onClick={() => setModalFilter('non-bosch')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  modalFilter === 'non-bosch' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 text-slate-800'
                }`}
              >
                <div className={`text-[10px] font-bold uppercase tracking-wider ${modalFilter === 'non-bosch' ? 'text-blue-100' : 'text-slate-500'}`}>Diğer Parça</div>
                <div className="font-extrabold text-sm mt-0.5">{modelCategorySummary.nonBosch.count} Adet</div>
                <div className={`text-[11px] font-mono mt-0.5 ${modalFilter === 'non-bosch' ? 'text-blue-50' : 'text-slate-600'}`}>
                  {modelCategorySummary.nonBosch.ciro.toLocaleString('tr-TR')} ₺
                </div>
              </button>

              <button
                onClick={() => setModalFilter('yag')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  modalFilter === 'yag' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 text-slate-800'
                }`}
              >
                <div className={`text-[10px] font-bold uppercase tracking-wider ${modalFilter === 'yag' ? 'text-blue-100' : 'text-slate-500'}`}>Motor Yağı</div>
                <div className="font-extrabold text-sm mt-0.5">{modelCategorySummary.yag.count} Adet</div>
                <div className={`text-[11px] font-mono mt-0.5 ${modalFilter === 'yag' ? 'text-blue-50' : 'text-amber-600'}`}>
                  {modelCategorySummary.yag.ciro.toLocaleString('tr-TR')} ₺
                </div>
              </button>

              <button
                onClick={() => setModalFilter('iscilik')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  modalFilter === 'iscilik' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 text-slate-800'
                }`}
              >
                <div className={`text-[10px] font-bold uppercase tracking-wider ${modalFilter === 'iscilik' ? 'text-blue-100' : 'text-slate-500'}`}>İşçilik</div>
                <div className="font-extrabold text-sm mt-0.5">{modelCategorySummary.iscilik.count} Adet</div>
                <div className={`text-[11px] font-mono mt-0.5 ${modalFilter === 'iscilik' ? 'text-blue-50' : 'text-emerald-600'}`}>
                  {modelCategorySummary.iscilik.ciro.toLocaleString('tr-TR')} ₺
                </div>
              </button>
            </div>

            {/* Filter bar */}
            <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Filtre:</span>
                <button
                  onClick={() => setModalFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    modalFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tümü ({filteredModalItems.length})
                </button>
                <button
                  onClick={() => setModalFilter('bosch')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    modalFilter === 'bosch' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Bosch Parçalar
                </button>
                <button
                  onClick={() => setModalFilter('yag')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    modalFilter === 'yag' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Motor Yağı
                </button>
                <button
                  onClick={() => setModalFilter('iscilik')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    modalFilter === 'iscilik' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  İşçilik
                </button>
              </div>
              <span className="text-xs text-slate-400 font-medium">Toplam {filteredModalItems.length} Kalem</span>
            </div>
            
            <div className="p-6 space-y-3 max-h-[360px] overflow-y-auto">
              {filteredModalItems.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Bu filtreye uygun parça veya işlem kaydı bulunamadı.</p>
              ) : (
                filteredModalItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition-colors cursor-help"
                    title={`Parça / İşlem Adı: ${item.name}\nTürü: ${item.type === 'bosch' ? 'Bosch Parça' : item.type === 'yag' ? 'Motor Yağı' : item.type === 'iscilik' ? 'İşçilik' : 'Diğer Parça'}${item.ph3Code ? `\nParça Kodu (PH3): ${item.ph3Code}` : ''}\nToplam Tutar: ${item.totalCiro.toLocaleString('tr-TR')} ₺`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        item.type === 'bosch' ? 'bg-blue-600 text-white' :
                        item.type === 'yag' ? 'bg-amber-500 text-white' :
                        item.type === 'iscilik' ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            item.type === 'bosch' ? 'bg-blue-100 text-blue-800' :
                            item.type === 'yag' ? 'bg-amber-100 text-amber-800' :
                            item.type === 'iscilik' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {item.type === 'bosch' ? 'Bosch' : item.type === 'yag' ? 'Motor Yağı' : item.type === 'iscilik' ? 'İşçilik' : 'Diğer'}
                          </span>
                        </div>
                        {item.category && (
                          <div className="text-[11px] text-slate-500">{item.category}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-xs font-mono">
                        {item.totalCiro.toLocaleString('tr-TR')} ₺
                      </div>
                      <div className="flex items-center gap-2 justify-end mt-0.5">
                        <span className="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                          {item.count} Adet
                        </span>
                        {item.ph3Code && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.ph3Code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {selectedBrand} {selectedModel} araçlarına uygulanan malzeme ve hizmet dağılımı
              </span>
              <button
                onClick={() => { setSelectedModel(null); setModalFilter('all'); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors"
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
