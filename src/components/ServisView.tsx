import React, { useState } from 'react';
import { Wrench, Search, ShieldCheck, ShieldAlert, Award, ChevronRight, X, Car, Tag } from 'lucide-react';
import { ProcessedRecord } from '../lib/engine';

interface ServisItem {
  servis: string;
  total: number;
  bosch: number;
  diger: number;
  yag?: number;
  iscilik?: number;
  topItems: { name: string; count: number }[];
}

interface ServisViewProps {
  servisData: ServisItem[];
  data: ProcessedRecord[];
}

export default function ServisView({ servisData, data }: ServisViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServis, setSelectedServis] = useState<ServisItem | null>(null);

  const filteredData = servisData.filter(item => 
    item.servis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const servisRecords = selectedServis ? data.filter(r => (r.servisIsmi || 'Merkez Servis') === selectedServis.servis) : [];
  const uniqueVehiclesCount = new Set(servisRecords.map(r => r.plaka).filter(Boolean)).size;

  const getTopItemsByType = (type: 'BOSCH' | 'DIGER' | 'YAG' | 'ISCILIK') => {
    const map: Record<string, { count: number; ph3Codes: Set<string>; partCodes: Set<string>; categories: Set<string>; subcategories: Set<string> }> = {};
    servisRecords.filter(r => {
      if (type === 'BOSCH') return r.anaTur === 'BOSCH' || r.isBosch;
      if (type === 'YAG') return r.anaTur === 'YAG' || r.isYag;
      if (type === 'ISCILIK') return r.anaTur === 'ISCILIK' || r.isIscilik;
      return r.anaTur === 'DIGER' || (r.isDiger && !r.isBosch && !r.isYag && !r.isIscilik);
    }).forEach(r => {
      const partName = r.ph3Type || (r.eslesenKatalog !== 'Eşleşmedi' ? r.eslesenKatalog : r.orijinalKodAd);
      if (partName) {
        if (!map[partName]) {
          map[partName] = { count: 0, ph3Codes: new Set(), partCodes: new Set(), categories: new Set(), subcategories: new Set() };
        }
        map[partName].count += 1;
        if (r.ph3Code && r.ph3Code.trim()) {
          map[partName].ph3Codes.add(r.ph3Code.trim());
        }
        if (r.orijinalKodAd && r.orijinalKodAd.trim()) {
          map[partName].partCodes.add(r.orijinalKodAd.trim());
        }
        if (r.seviye1 && r.seviye1.trim() && !r.seviye1.includes('Diğer Marka Parçalar')) {
          map[partName].categories.add(r.seviye1.trim());
        }
        if (r.seviye2 && r.seviye2.trim() && !r.seviye2.includes('Genel Parçalar')) {
          map[partName].subcategories.add(r.seviye2.trim());
        }
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, val]) => ({
        name,
        count: val.count,
        ph3Codes: Array.from(val.ph3Codes),
        partCodes: Array.from(val.partCodes),
        categories: Array.from(val.categories),
        subcategories: Array.from(val.subcategories)
      }));
  };

  const getTopVehiclesForServis = () => {
    const map: Record<string, number> = {};
    servisRecords.forEach(r => {
      const vehicleKey = `${r.aracMarka || 'Diğer'} ${r.aracModel || ''}`.trim();
      if (vehicleKey) {
        map[vehicleKey] = (map[vehicleKey] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([model, count]) => ({ model, count }));
  };

  const topBoschParts = selectedServis ? getTopItemsByType('BOSCH') : [];
  const topOtherParts = selectedServis ? getTopItemsByType('DIGER') : [];
  const topYagItems = selectedServis ? getTopItemsByType('YAG') : [];
  const topIscilikItems = selectedServis ? getTopItemsByType('ISCILIK') : [];
  const topVehicles = selectedServis ? getTopVehiclesForServis() : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            Servis Analitiği (Servis İsmi - Kolon L)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Servislerin kullandığı Bosch ve Bosch olmayan parça dağılımları ile detaylı ürün ve araç analizleri.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Servis adı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.map((item, idx) => {
          const boschPercent = item.total > 0 ? Math.round((item.bosch / item.total) * 100) : 0;
          const digerPercent = item.total > 0 ? Math.round((item.diger / item.total) * 100) : 0;
          const yagPercent = item.total > 0 ? Math.round(((item.yag || 0) / item.total) * 100) : 0;
          const iscilikPercent = Math.max(0, 100 - (boschPercent + digerPercent + yagPercent));

          return (
            <div 
              key={idx} 
              onClick={() => setSelectedServis(item)}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:border-amber-400 hover:shadow-md transition-all flex flex-col cursor-pointer group"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{item.servis}</h3>
                    <span className="text-xs text-slate-500">Aktif Servis Noktası</span>
                  </div>
                </div>
                <span className="bg-amber-600 text-white font-bold px-3 py-1 rounded-full text-xs">
                  {item.total} Kalem
                </span>
              </div>

              <div className="p-5 flex-1 space-y-4">
                {/* 4-way Category distribution bar */}
                <div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold text-slate-600 mb-1.5">
                    <span className="flex items-center gap-1 text-blue-600 truncate">
                      <ShieldCheck className="w-3 h-3 shrink-0" /> Bosch: {item.bosch} (%{boschPercent})
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 truncate">
                      <ShieldAlert className="w-3 h-3 shrink-0" /> Diğer: {item.diger} (%{digerPercent})
                    </span>
                    <span className="flex items-center gap-1 text-cyan-600 truncate">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" /> Yağ: {item.yag || 0} (%{yagPercent})
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> İşçilik: {item.iscilik || 0} (%{iscilikPercent})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-blue-600 h-full transition-all" style={{ width: `${boschPercent}%` }} title={`Bosch: %${boschPercent}`} />
                    <div className="bg-amber-500 h-full transition-all" style={{ width: `${digerPercent}%` }} title={`Diğer: %${digerPercent}`} />
                    <div className="bg-cyan-500 h-full transition-all" style={{ width: `${yagPercent}%` }} title={`Motor Yağı: %${yagPercent}`} />
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${iscilikPercent}%` }} title={`İşçilik: %${iscilikPercent}`} />
                  </div>
                </div>

                {/* Top 3 Preview */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" /> En Çok Kullanılan Ürünler
                  </span>
                  {item.topItems.slice(0, 3).map((ti, tIdx) => (
                    <div key={tIdx} className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <span className="text-slate-700 truncate max-w-[180px]">{ti.name}</span>
                      <span className="font-semibold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {ti.count} ad.
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-amber-700 font-medium group-hover:bg-amber-50/60 transition-colors">
                <span>Detaylı Analizi Gör</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Servis Detail Modal */}
      {selectedServis && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{selectedServis.servis} - Servis Detaylı Analizi</h3>
                  <span className="text-xs text-amber-700 font-medium">Araç, Yedek Parça, Motor Yağı ve İşçilik Dağılımları</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedServis(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 block font-medium">Toplam Kalem</span>
                  <span className="text-base font-bold text-slate-900">{selectedServis.total}</span>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100 text-center">
                  <span className="text-[11px] text-blue-600 block font-medium">Bosch</span>
                  <span className="text-base font-bold text-blue-700">{selectedServis.bosch}</span>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 text-center">
                  <span className="text-[11px] text-amber-600 block font-medium">Diğer</span>
                  <span className="text-base font-bold text-amber-700">{selectedServis.diger}</span>
                </div>
                <div className="bg-cyan-50 p-2.5 rounded-xl border border-cyan-100 text-center">
                  <span className="text-[11px] text-cyan-600 block font-medium">Motor Yağı</span>
                  <span className="text-base font-bold text-cyan-700">{selectedServis.yag || 0}</span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[11px] text-emerald-600 block font-medium">İşçilik</span>
                  <span className="text-base font-bold text-emerald-700">{selectedServis.iscilik || 0}</span>
                </div>
              </div>

              {/* Top Bosch Parts */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  Bosch Parçaları - En Çok Kullanılan İlk 5 Kalem
                </h4>
                {topBoschParts.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Bosch parça verisi bulunamadı.</p>
                ) : (
                  <div className="space-y-2">
                    {topBoschParts.map((item, idx) => {
                      const ph3CodeText = item.ph3Codes.length > 0 
                        ? item.ph3Codes.join(', ') 
                        : (item.partCodes.length > 0 ? `Ref: ${item.partCodes.slice(0, 2).join(', ')}` : 'PH3');

                      return (
                        <div 
                          key={idx} 
                          title={`PH3 Kodu: ${ph3CodeText}`}
                          className="relative group/boschItem flex items-center justify-between p-3 bg-blue-50/40 hover:bg-blue-100/70 rounded-xl border border-blue-100 hover:border-blue-300 transition-all text-sm cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              idx === 0 ? 'bg-blue-600 text-white' :
                              idx === 1 ? 'bg-blue-500 text-white' :
                              idx === 2 ? 'bg-blue-400 text-white' : 'bg-blue-200 text-blue-900'
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                              <span className="font-semibold text-slate-800">{item.name}</span>
                              <span className="opacity-0 group-hover/boschItem:opacity-100 transition-all duration-200 text-[11px] font-mono font-semibold text-blue-700 bg-blue-100/90 border border-blue-300 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                <Tag className="w-3 h-3 text-blue-600" />
                                PH3: {ph3CodeText}
                              </span>
                            </div>
                          </div>

                          <span className="bg-blue-100 text-blue-800 font-semibold px-2.5 py-1 rounded-lg text-xs shrink-0">
                            {item.count} Adet
                          </span>

                          <div className="opacity-0 pointer-events-none group-hover/boschItem:opacity-100 transition-all duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-slate-900 text-white text-xs rounded-xl py-2 px-3 shadow-2xl border border-slate-700 min-w-[200px] max-w-xs">
                            <div className="flex items-center justify-between gap-2 font-semibold text-blue-300 border-b border-slate-700 pb-1 mb-1">
                              <span className="flex items-center gap-1">
                                <Tag className="w-3.5 h-3.5 text-blue-400" /> PH3 Kodu:
                              </span>
                              <span className="font-mono bg-blue-950 text-blue-200 px-2 py-0.5 rounded border border-blue-800 font-bold">
                                {ph3CodeText}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300">
                              <span className="text-slate-400">Parça: </span>
                              <span className="font-medium text-white">{item.name}</span>
                            </div>
                            {item.partCodes.length > 0 && (
                              <div className="mt-1 text-[11px] text-slate-300">
                                <span className="text-slate-400">10-Digit: </span>
                                <span className="font-mono text-slate-200">{item.partCodes.slice(0, 3).join(', ')}{item.partCodes.length > 3 ? '...' : ''}</span>
                              </div>
                            )}
                            <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r border-b border-slate-700"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top Other Parts */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  Diğer Parçalar - En Çok Kullanılan İlk 5 Kalem
                </h4>
                {topOtherParts.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Diğer parça verisi bulunamadı.</p>
                ) : (
                  <div className="space-y-2">
                    {topOtherParts.map((item, idx) => {
                      const ph3CodeText = item.ph3Codes.length > 0 ? item.ph3Codes.join(', ') : '';
                      const categoryText = item.categories.length > 0 ? item.categories.join(', ') : '';

                      return (
                        <div 
                          key={idx} 
                          title={`Parça Grubu: ${item.name}${ph3CodeText ? ` | Kod: ${ph3CodeText}` : ''}`}
                          className="relative group/otherItem flex items-center justify-between p-3 bg-amber-50/40 hover:bg-amber-100/60 rounded-xl border border-amber-100 hover:border-amber-300 transition-all text-sm cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              idx === 0 ? 'bg-amber-600 text-white' :
                              idx === 1 ? 'bg-amber-500 text-white' :
                              idx === 2 ? 'bg-amber-400 text-white' : 'bg-amber-200 text-amber-900'
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                              <span className="font-semibold text-slate-800">{item.name}</span>
                              <span className="opacity-0 group-hover/otherItem:opacity-100 transition-all duration-200 text-[11px] font-mono font-semibold text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                <Tag className="w-3 h-3 text-amber-600" />
                                {ph3CodeText ? `Kod: ${ph3CodeText}` : item.name}
                              </span>
                            </div>
                          </div>

                          <span className="bg-amber-100 text-amber-900 font-semibold px-2.5 py-1 rounded-lg text-xs shrink-0">
                            {item.count} Adet
                          </span>

                          <div className="opacity-0 pointer-events-none group-hover/otherItem:opacity-100 transition-all duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-slate-900 text-white text-xs rounded-xl py-2 px-3 shadow-2xl border border-slate-700 min-w-[240px] max-w-xs">
                            <div className="flex items-center justify-between gap-2 font-semibold text-amber-300 border-b border-slate-700 pb-1 mb-1">
                              <span className="flex items-center gap-1">
                                <Tag className="w-3.5 h-3.5 text-amber-400" /> Parça Grubu:
                              </span>
                              <span className="font-medium bg-amber-950 text-amber-200 px-2 py-0.5 rounded border border-amber-800 text-[11px]">
                                {item.name}
                              </span>
                            </div>
                            {ph3CodeText && (
                              <div className="text-[11px] text-slate-300 mb-0.5">
                                <span className="text-slate-400">Ürün Kodu: </span>
                                <span className="font-mono text-amber-300">{ph3CodeText}</span>
                              </div>
                            )}
                            {categoryText && (
                              <div className="text-[11px] text-slate-300">
                                <span className="text-slate-400">Kategori: </span>
                                <span className="font-medium text-white">{categoryText}</span>
                              </div>
                            )}
                            <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r border-b border-slate-700"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top Motor Oils */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-600" />
                  Motor Yağları & Sıvılar - En Çok Kullanılan İlk 5 Kalem
                </h4>
                {topYagItems.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Bu serviste motor yağı verisi bulunamadı.</p>
                ) : (
                  <div className="space-y-2">
                    {topYagItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-cyan-50/40 rounded-xl border border-cyan-100 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-800">{item.name}</span>
                        </div>
                        <span className="bg-cyan-100 text-cyan-900 font-semibold px-2.5 py-1 rounded-lg text-xs">
                          {item.count} Adet
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Labor / İşçilik */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  İşçilik & Bakım Hizmetleri - En Çok Yapılan İlk 5 İşlem
                </h4>
                {topIscilikItems.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Bu serviste işçilik verisi bulunamadı.</p>
                ) : (
                  <div className="space-y-2">
                    {topIscilikItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-800">{item.name}</span>
                        </div>
                        <span className="bg-emerald-100 text-emerald-900 font-semibold px-2.5 py-1 rounded-lg text-xs">
                          {item.count} İşlem
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Vehicles in this Servis */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Car className="w-4 h-4 text-amber-600" />
                  Bu Serviste En Yoğun Bulunan Araç Modelleri
                </h4>
                {topVehicles.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Araç modeli verisi bulunamadı.</p>
                ) : (
                  <div className="space-y-2">
                    {topVehicles.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                        <div className="flex items-center gap-3">
                          <Tag className="w-4 h-4 text-amber-600" />
                          <span className="font-medium text-slate-800">{item.model}</span>
                        </div>
                        <span className="bg-amber-100 text-amber-900 font-semibold px-2.5 py-1 rounded-lg text-xs">
                          {item.count} İşlem
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedServis(null)}
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
