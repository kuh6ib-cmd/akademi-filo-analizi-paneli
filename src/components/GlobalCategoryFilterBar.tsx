import React from 'react';
import { Filter, CheckSquare, Square, RotateCcw, Search, X } from 'lucide-react';
import { ProcessedRecord } from '../lib/engine';

interface GlobalCategoryFilterBarProps {
  data: ProcessedRecord[];
  categoryFilters: {
    bosch: boolean;
    diger: boolean;
    yag: boolean;
    iscilik: boolean;
  };
  setCategoryFilters: React.Dispatch<React.SetStateAction<{
    bosch: boolean;
    diger: boolean;
    yag: boolean;
    iscilik: boolean;
  }>>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export default function GlobalCategoryFilterBar({
  data,
  categoryFilters,
  setCategoryFilters,
  searchTerm,
  setSearchTerm
}: GlobalCategoryFilterBarProps) {
  const stats = React.useMemo(() => {
    let boschC = 0, boschT = 0;
    let digerC = 0, digerT = 0;
    let yagC = 0, yagT = 0;
    let iscilikC = 0, iscilikT = 0;

    data.forEach(r => {
      const ciro = r.tutar || 0;
      const nameUpper = (r.ph3Type || r.eslesenKatalog || r.orijinalKodAd || '').toUpperCase();
      const isYag = r.isYag || nameUpper.includes('YAĞ') || nameUpper.includes('OIL') || nameUpper.includes('0W') || nameUpper.includes('5W');
      const isIscilik = r.isIscilik || nameUpper.includes('İŞÇİLİK') || nameUpper.includes('BAKIM İŞÇİLİĞİ') || nameUpper.includes('MONTAJ');
      const isBosch = r.isBosch || nameUpper.includes('BOSCH');
      const isDiger = !isBosch && !isYag && !isIscilik;

      if (isIscilik) {
        iscilikC++;
        iscilikT += ciro;
      } else if (isYag) {
        yagC++;
        yagT += ciro;
      } else if (isBosch) {
        boschC++;
        boschT += ciro;
      } else if (isDiger) {
        digerC++;
        digerT += ciro;
      }
    });

    return {
      bosch: { count: boschC, ciro: boschT },
      diger: { count: digerC, ciro: digerT },
      yag: { count: yagC, ciro: yagT },
      iscilik: { count: iscilikC, ciro: iscilikT }
    };
  }, [data]);

  const toggle = (key: keyof typeof categoryFilters) => {
    setCategoryFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setCategoryFilters({ bosch: true, diger: true, yag: true, iscilik: true });
  };

  const activeCount = Object.values(categoryFilters).filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 mb-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Global Kategori ve Metin Filtreleri
          </h3>
          <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">
            {activeCount}/4 Kategori Aktif
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeCount < 4 && (
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Tümünü Göster</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar & Category Buttons Row */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Search input for part name, SKU, or original code */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Parça adı, SKU, orijinal kod veya plaka ara..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Toggles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
          {/* Bosch Filter */}
          <button
            onClick={() => toggle('bosch')}
            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
              categoryFilters.bosch 
                ? 'bg-blue-50/70 border-blue-300 shadow-2xs' 
                : 'bg-slate-50 border-slate-200 opacity-50'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                {categoryFilters.bosch ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                <span>Bosch</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                {stats.bosch.count} • {(stats.bosch.ciro / 1000).toFixed(0)}k ₺
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${categoryFilters.bosch ? 'bg-blue-600' : 'bg-slate-300'}`} />
          </button>

          {/* Diğer Parça Filter */}
          <button
            onClick={() => toggle('diger')}
            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
              categoryFilters.diger 
                ? 'bg-slate-100/80 border-slate-300 shadow-2xs' 
                : 'bg-slate-50 border-slate-200 opacity-50'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                {categoryFilters.diger ? <CheckSquare className="w-3.5 h-3.5 text-slate-700" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                <span>Diğer</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                {stats.diger.count} • {(stats.diger.ciro / 1000).toFixed(0)}k ₺
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${categoryFilters.diger ? 'bg-slate-600' : 'bg-slate-300'}`} />
          </button>

          {/* Motor Yağı Filter */}
          <button
            onClick={() => toggle('yag')}
            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
              categoryFilters.yag 
                ? 'bg-amber-50/70 border-amber-300 shadow-2xs' 
                : 'bg-slate-50 border-slate-200 opacity-50'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                {categoryFilters.yag ? <CheckSquare className="w-3.5 h-3.5 text-amber-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                <span>Yağ</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                {stats.yag.count} • {(stats.yag.ciro / 1000).toFixed(0)}k ₺
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${categoryFilters.yag ? 'bg-amber-500' : 'bg-slate-300'}`} />
          </button>

          {/* İşçilik Filter */}
          <button
            onClick={() => toggle('iscilik')}
            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
              categoryFilters.iscilik 
                ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs' 
                : 'bg-slate-50 border-slate-200 opacity-50'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                {categoryFilters.iscilik ? <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                <span>İşçilik</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                {stats.iscilik.count} • {(stats.iscilik.ciro / 1000).toFixed(0)}k ₺
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${categoryFilters.iscilik ? 'bg-emerald-600' : 'bg-slate-300'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
