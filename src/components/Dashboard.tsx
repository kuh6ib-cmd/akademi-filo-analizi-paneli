import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { PieChart as PieChartIcon, BarChart3, Award, X, Info, ChevronDown, ChevronUp, Tag, ShieldCheck, Cog, Droplet, Hammer, Car, ArrowRight } from 'lucide-react';
import { ProcessedRecord } from '../lib/engine';

const TYPE_COLORS: Record<string, string> = {
  'BOSCH': '#3b82f6',
  'DIGER': '#f59e0b',
  'YAG': '#06b6d4',
  'ISCILIK': '#10b981'
};

const DEFAULT_COLORS = ['#3b82f6', '#f59e0b', '#06b6d4', '#10b981', '#8b5cf6', '#ec4899'];

interface DashboardProps {
  brandDistribution: any[];
  topCategories: any[];
  categoryTopItems: Record<string, { name: string; count: number }[]>;
  data: ProcessedRecord[];
}

export default function Dashboard({ brandDistribution, topCategories, categoryTopItems, data }: DashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'BOSCH' | 'DIGER' | 'YAG' | 'ISCILIK'>('ALL');
  const [hoveredSlice, setHoveredSlice] = useState<any | null>(null);

  const totalCount = data.length || 1;
  const boschItems = data.filter(d => d.anaTur === 'BOSCH' || d.isBosch);
  const digerItems = data.filter(d => d.anaTur === 'DIGER' || (d.isDiger && !d.isBosch && !d.isYag && !d.isIscilik));
  const yagItems = data.filter(d => d.anaTur === 'YAG' || d.isYag);
  const iscilikItems = data.filter(d => d.anaTur === 'ISCILIK' || d.isIscilik);

  const activeTopItems = selectedCategory && categoryTopItems ? categoryTopItems[selectedCategory] || [] : [];

  const getTopProductsForCategory = (catKey: string, limit = 4) => {
    let items = data;
    if (catKey === 'BOSCH') items = boschItems;
    else if (catKey === 'DIGER') items = digerItems;
    else if (catKey === 'YAG') items = yagItems;
    else if (catKey === 'ISCILIK') items = iscilikItems;

    const map: Record<string, { count: number; ph3Code?: string }> = {};
    items.forEach(r => {
      const name = r.ph3Type || (r.eslesenKatalog !== 'Eşleşmedi' ? r.eslesenKatalog : r.orijinalKodAd);
      if (name) {
        if (!map[name]) {
          map[name] = { count: 0, ph3Code: r.ph3Code };
        }
        map[name].count += 1;
        if (r.ph3Code && !map[name].ph3Code) {
          map[name].ph3Code = r.ph3Code;
        }
      }
    });

    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([name, val]) => ({
        name,
        count: val.count,
        ph3Code: val.ph3Code
      }));
  };

  const getFilteredItems = () => {
    let items = data;
    if (activeFilterTab === 'BOSCH') items = boschItems;
    else if (activeFilterTab === 'DIGER') items = digerItems;
    else if (activeFilterTab === 'YAG') items = yagItems;
    else if (activeFilterTab === 'ISCILIK') items = iscilikItems;

    const map: Record<string, number> = {};
    items.forEach(r => {
      const name = r.eslesenKatalog !== 'Eşleşmedi' ? r.eslesenKatalog : r.orijinalKodAd;
      if (name) map[name] = (map[name] || 0) + 1;
    });

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  };

  const currentTabTopItems = getFilteredItems();

  const getPh3Breakdown = (itemName: string) => {
    if (!data) return [];
    const map: Record<string, number> = {};
    data.forEach(r => {
      const rName = r.eslesenKatalog !== 'Eşleşmedi' ? r.eslesenKatalog : r.orijinalKodAd;
      if (rName === itemName || r.ph3Type === itemName || r.orijinalKodAd === itemName) {
        const code = r.ph3Code ? `${r.ph3Code} (${r.orijinalKodAd})` : (r.orijinalKodAd || 'Kod Belirtilmemiş');
        map[code] = (map[code] || 0) + 1;
      }
    });
    return Object.entries(map).map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count);
  };

  const getSliceColor = (entry: any, index: number) => {
    if (!entry) return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    if (entry.color) return entry.color;
    if (entry.key && TYPE_COLORS[entry.key]) return TYPE_COLORS[entry.key];
    const nameUpper = String(entry.name || '').toUpperCase();
    if (nameUpper.includes('BOSCH')) return TYPE_COLORS.BOSCH;
    if (nameUpper.includes('YAĞ') || nameUpper.includes('YAG')) return TYPE_COLORS.YAG;
    if (nameUpper.includes('İŞÇİLİK') || nameUpper.includes('ISCILIK')) return TYPE_COLORS.ISCILIK;
    if (nameUpper.includes('DİĞER') || nameUpper.includes('DIGER')) return TYPE_COLORS.DIGER;
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      const catKey = entry.key || (
        entry.name?.includes('Bosch') ? 'BOSCH' :
        (entry.name?.includes('Yağ') || entry.name?.includes('Yag')) ? 'YAG' :
        (entry.name?.includes('İşçilik') || entry.name?.includes('Iscilik')) ? 'ISCILIK' : 'DIGER'
      );
      const sliceColor = getSliceColor(entry, 0);
      const topItems = getTopProductsForCategory(catKey, 4);
      const percent = totalCount > 0 ? Math.round((entry.value / totalCount) * 100) : 0;
      const topItem = topItems[0];
      const topItemPercent = entry.value > 0 && topItem ? Math.round((topItem.count / entry.value) * 100) : 0;

      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 max-w-[290px] text-xs backdrop-blur-sm z-50 pointer-events-none">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-700/70">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: sliceColor }} />
              <span className="font-bold text-sm text-slate-100">{entry.name}</span>
            </div>
            <span className="font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px] whitespace-nowrap">
              {entry.value} Adet (%{percent})
            </span>
          </div>

          {/* Most Used Product Highlight */}
          {topItem ? (
            <div className="mt-2.5 p-2.5 rounded-lg bg-slate-800/90 border border-slate-700/90">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: sliceColor }}>
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>En Çok Kullanılan Ürün:</span>
              </div>
              <div className="font-bold text-white text-xs mt-1 leading-snug break-words">
                {topItem.name}
              </div>
              {topItem.ph3Code && (
                <div className="text-[10px] font-mono text-amber-300 mt-0.5">
                  Ürün Kodu: {topItem.ph3Code}
                </div>
              )}
              <div className="text-[11px] text-slate-300 mt-1.5 flex items-center justify-between pt-1 border-t border-slate-700/60">
                <span className="text-slate-400">Kullanım Adedi:</span>
                <span className="font-bold text-white bg-slate-700 px-2 py-0.5 rounded text-[11px]">
                  {topItem.count} Adet (%{topItemPercent})
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-slate-400 text-[11px] italic">Bu kategoride ürün verisi bulunamadı.</div>
          )}

          {/* Other top items */}
          {topItems.length > 1 && (
            <div className="mt-2.5 space-y-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Diğer En Çok Kullanılanlar:
              </div>
              <div className="space-y-1">
                {topItems.slice(1).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-800/50 px-2 py-1 rounded border border-slate-700/40">
                    <span className="truncate max-w-[180px] font-medium" title={item.name}>
                      {idx + 2}. {item.name}
                    </span>
                    <span className="font-semibold text-slate-200 shrink-0 ml-1.5">
                      {item.count} ad.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="text-blue-300 font-medium">💡 Tıklayarak filtreleyin</span>
            <span className="text-slate-500">Pay: %{percent}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const catName = payload[0].payload.name;
      const catCount = payload[0].payload.count;
      const topItems = categoryTopItems && categoryTopItems[catName] ? categoryTopItems[catName] : [];
      const topItem = topItems[0];

      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700 max-w-[260px] text-xs backdrop-blur-sm z-50 pointer-events-none">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-700">
            <span className="font-bold text-slate-100 text-xs">{catName}</span>
            <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 text-[11px]">
              {catCount} Adet
            </span>
          </div>
          {topItem && (
            <div className="mt-2 p-2 rounded bg-slate-800/80 border border-slate-700/70">
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span>En Çok Kullanılan:</span>
              </div>
              <div className="font-bold text-white text-xs mt-0.5 truncate" title={topItem.name}>
                {topItem.name}
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                {topItem.count} İşlem (%{Math.round((topItem.count / (catCount || 1)) * 100)})
              </div>
            </div>
          )}
          <div className="mt-2 text-[10px] text-slate-400 italic">
            Detayları görmek için tıklayın
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Gelen Araç Sayısı, KM & Ciro Hacim Özeti */}
      {(() => {
        const uniquePlates = new Set(data.map(d => (d.plaka || '').trim().toUpperCase()).filter(Boolean));
        const vehicleCount = uniquePlates.size || (data.length > 0 ? 4 : 0);
        const avgOps = (data.length / (vehicleCount || 1)).toFixed(1);
        const totalCiro = data.reduce((sum, d) => sum + (d.tutar || 0), 0);
        const kms = data.map(d => d.km || 0).filter(k => k > 0);
        const avgKm = kms.length > 0 ? Math.round(kms.reduce((a, b) => a + b, 0) / kms.length) : 0;
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gelen Araç Sayısı</span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Tekil Plaka</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    {vehicleCount} <span className="text-sm font-semibold text-slate-500">Araç</span>
                    <span className="mx-2 text-slate-300 font-normal">|</span>
                    <span className="text-base font-bold text-slate-700">{data.length}</span> <span className="text-xs text-slate-500">Parça/İşlem</span>
                  </div>
                </div>
              </div>

              <div className="h-10 w-px bg-slate-200 hidden sm:block" />

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Toplam Servis Cirosu</div>
                <div className="text-2xl font-black text-blue-600 mt-0.5">
                  {totalCiro.toLocaleString('tr-TR')} ₺
                </div>
              </div>

              <div className="h-10 w-px bg-slate-200 hidden sm:block" />

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ortalama Araç KM</div>
                <div className="text-2xl font-black text-emerald-600 mt-0.5">
                  {avgKm.toLocaleString('tr-TR')} KM
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1.5 self-start lg:self-auto bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              <span>Detaylı 3 aşamalı inceleme için</span>
              <span className="font-bold text-blue-600">"KM & Ciro (3 Aşama)"</span>
              <span>sekmesini kullanabilirsiniz.</span>
            </div>
          </div>
        );
      })()}

      {/* 4-Way KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bosch Parçaları */}
        <div 
          onClick={() => setActiveFilterTab('BOSCH')}
          className={`bg-white rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md ${
            activeFilterTab === 'BOSCH' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bosch Parçaları</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{boschItems.length}</div>
            <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              %{Math.round((boschItems.length / totalCount) * 100)} Pay
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Bosch kataloğu & 10 digit eşleşmeleri</p>
        </div>

        {/* Diğer Parçalar */}
        <div 
          onClick={() => setActiveFilterTab('DIGER')}
          className={`bg-white rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md ${
            activeFilterTab === 'DIGER' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diğer Parçalar</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Cog className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{digerItems.length}</div>
            <div className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              %{Math.round((digerItems.length / totalCount) * 100)} Pay
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Bosch dışı alternatif marka parçalar</p>
        </div>

        {/* Motor Yağı */}
        <div 
          onClick={() => setActiveFilterTab('YAG')}
          className={`bg-white rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md ${
            activeFilterTab === 'YAG' ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Motor Yağı</span>
            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{yagItems.length}</div>
            <div className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">
              %{Math.round((yagItems.length / totalCount) * 100)} Pay
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Viskozite, madeni yağ ve sıvı kalemleri</p>
        </div>

        {/* İşçilik */}
        <div 
          onClick={() => setActiveFilterTab('ISCILIK')}
          className={`bg-white rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md ${
            activeFilterTab === 'ISCILIK' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">İşçilik & Bakım</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{iscilikItems.length}</div>
            <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              %{Math.round((iscilikItems.length / totalCount) * 100)} Pay
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Periyodik bakım, onarım ve montaj işçilikleri</p>
        </div>
      </div>

      {/* Information strip */}
      <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between gap-3 text-blue-900 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Filo dosyasındaki <strong>Motor Yağı</strong> ve <strong>İşçilik</strong> kalemleri yedek parçalardan bağımsız olarak ayrıştırılıp grafiklere işlenmiştir.</span>
        </div>
        {activeFilterTab !== 'ALL' && (
          <button 
            onClick={() => setActiveFilterTab('ALL')}
            className="text-xs text-blue-700 font-semibold underline hover:text-blue-900 whitespace-nowrap"
          >
            Tümünü Göster
          </button>
        )}
      </div>

      {/* Main Charts: Pie Chart & Category Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-500" />
                Dağılım Analizi (Parça, Motor Yağı & İşçilik)
              </h2>
              <span className="text-xs text-slate-400 mt-0.5 block">Dilim üzerine gelerek en çok kullanılan ürünü görebilirsiniz</span>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 font-medium px-2.5 py-1 rounded-full border border-slate-200">
              Toplam {data.length} Kayıt
            </span>
          </div>
          <div className="p-6 h-[340px] relative flex items-center justify-center">
            {/* Donut Center Display */}
            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center max-w-[125px] select-none transition-all duration-150 z-0">
              {hoveredSlice ? (
                <>
                  <span 
                    className="text-[10px] font-bold uppercase tracking-wider block truncate" 
                    style={{ color: getSliceColor(hoveredSlice, 0) }}
                  >
                    {hoveredSlice.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium mt-0.5">En Çok Kullanılan:</span>
                  <span className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight block mt-0.5">
                    {getTopProductsForCategory(hoveredSlice.key || hoveredSlice.name, 1)[0]?.name || '-'}
                  </span>
                  <span 
                    className="text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded-full border shadow-xs" 
                    style={{ 
                      backgroundColor: `${getSliceColor(hoveredSlice, 0)}15`, 
                      color: getSliceColor(hoveredSlice, 0),
                      borderColor: `${getSliceColor(hoveredSlice, 0)}40` 
                    }}
                  >
                    {getTopProductsForCategory(hoveredSlice.key || hoveredSlice.name, 1)[0]?.count || 0} Adet
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Toplam</span>
                  <span className="text-2xl font-black text-slate-800 block leading-tight tracking-tight">{data.length}</span>
                  <span className="text-[11px] text-slate-500 font-medium block">İşlem / Parça</span>
                </>
              )}
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={brandDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={108}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} %${((percent || 0) * 100).toFixed(0)}`}
                  onMouseEnter={(_, index) => setHoveredSlice(brandDistribution[index])}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={(_, index) => {
                    const item = brandDistribution[index];
                    if (item?.key) {
                      setActiveFilterTab(item.key as any);
                    }
                  }}
                  cursor="pointer"
                >
                  {brandDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getSliceColor(entry, index)} 
                      className="transition-opacity duration-200 hover:opacity-90 cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span className="text-xs font-medium text-slate-700 mr-2">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              En Çok Tekrarlanan Ana Gruplar
            </h2>
            <span className="text-xs text-slate-400">Detay için tıklayın</span>
          </div>
          <div className="p-6 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={topCategories} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0 && e.activePayload[0].payload) {
                    setSelectedCategory(e.activePayload[0].payload.name);
                    setExpandedItem(null);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={140} 
                  tick={{ fill: '#334155', fontSize: 11, cursor: 'pointer', fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar 
                  dataKey="count" 
                  fill="#10b981" 
                  radius={[0, 4, 4, 0]} 
                  barSize={24} 
                  cursor="pointer"
                  onClick={(barData: any) => {
                    if (barData && barData.name) {
                      setSelectedCategory(barData.name);
                      setExpandedItem(null);
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 5 Items by Filter Tabs: All, Bosch, Diğer, Motor Yağı, İşçilik */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Kategori Bazında En Çok Kullanılan İlk 5 Kalem
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Seçili türe göre en çok işlem gören parçalar, motor yağları veya işçilik operasyonları.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeFilterTab === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tümü ({data.length})
            </button>
            <button
              onClick={() => setActiveFilterTab('BOSCH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeFilterTab === 'BOSCH' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Bosch ({boschItems.length})
            </button>
            <button
              onClick={() => setActiveFilterTab('DIGER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeFilterTab === 'DIGER' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Diğer ({digerItems.length})
            </button>
            <button
              onClick={() => setActiveFilterTab('YAG')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeFilterTab === 'YAG' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-600 hover:text-cyan-700'
              }`}
            >
              Motor Yağı ({yagItems.length})
            </button>
            <button
              onClick={() => setActiveFilterTab('ISCILIK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeFilterTab === 'ISCILIK' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              İşçilik ({iscilikItems.length})
            </button>
          </div>
        </div>

        {/* Tab Top Items Grid */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentTabTopItems.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm text-slate-400">
              Bu filtreye ait kayıt bulunamadı.
            </div>
          ) : (
            currentTabTopItems.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setSelectedCategory(item.name);
                  setExpandedItem(item.name);
                }}
                className="bg-slate-50 hover:bg-slate-100/80 rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between cursor-pointer transition-all hover:border-slate-300"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                    idx === 0 ? 'bg-amber-500 text-white' :
                    idx === 1 ? 'bg-slate-400 text-white' :
                    idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="text-xs font-semibold text-slate-800 block truncate" title={item.name}>
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-500">Detay için tıklayın</span>
                  </div>
                </div>
                <span className="ml-2 bg-white px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 border border-slate-200 shrink-0">
                  {item.count} Adet
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Category Top 5 Modal / Panel with PH3 Code breakdown */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-800 text-base truncate max-w-md">
                  "{selectedCategory}" Detayı & Alt Kodları
                </h3>
              </div>
              <button 
                onClick={() => { setSelectedCategory(null); setExpandedItem(null); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              <p className="text-xs text-slate-500 mb-4">
                Öğelerin üzerine tıklayarak alt varyantları ve parça kod adet dağılımlarını görüntüleyebilirsiniz.
              </p>

              {activeTopItems.length === 0 ? (
                // Fallback: search by single item breakdown directly
                (() => {
                  const directBreakdown = getPh3Breakdown(selectedCategory);
                  return (
                    <div className="space-y-3">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          İlgili Kalemin Kod & Alt Varyant Dağılımı:
                        </span>
                        {directBreakdown.length === 0 ? (
                          <p className="text-xs text-slate-400">Alt kod bulunamadı.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            {directBreakdown.map((pb, pbIdx) => (
                              <div key={pbIdx} className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 font-mono text-slate-700">
                                  <Tag className="w-3.5 h-3.5 text-blue-500" />
                                  <span>{pb.code}</span>
                                </div>
                                <span className="font-semibold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                  {pb.count} Adet
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-3">
                  {activeTopItems.map((item, idx) => {
                    const isExpanded = expandedItem === item.name;
                    const ph3Breakdown = isExpanded ? getPh3Breakdown(item.name) : [];

                    return (
                      <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden transition-all">
                        <div 
                          onClick={() => setExpandedItem(isExpanded ? null : item.name)}
                          className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-100/60 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              idx === 0 ? 'bg-amber-500 text-white' :
                              idx === 1 ? 'bg-slate-400 text-white' :
                              idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {idx + 1}
                            </span>
                            <div>
                              <span className="font-semibold text-slate-800 text-sm block">{item.name}</span>
                              <span className="text-[11px] text-slate-500">Detayları görmek için tıklayın</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-lg text-xs">
                              {item.count} Adet
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        {/* PH3 / Original codes breakdown accordion */}
                        {isExpanded && (
                          <div className="px-4 py-3 bg-white border-t border-slate-200 space-y-2 animate-in slide-in-from-top-2 duration-200">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Farklı Parça / Ürün Kodları Dağılımı:
                            </span>
                            {ph3Breakdown.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">Alt kod verisi bulunamadı.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {ph3Breakdown.map((pb, pbIdx) => (
                                  <div key={pbIdx} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-2 font-mono text-slate-700">
                                      <Tag className="w-3.5 h-3.5 text-blue-500" />
                                      <span>{pb.code}</span>
                                    </div>
                                    <span className="font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                      {pb.count} Adet
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => { setSelectedCategory(null); setExpandedItem(null); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
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
