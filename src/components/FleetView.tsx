import React, { useState } from 'react';
import { Building2, Search, Truck, Award, Car, X, Tag, ChevronRight } from 'lucide-react';
import { ProcessedRecord } from '../lib/engine';

interface FleetViewProps {
  fleetData: { filo: string; count: number }[];
  data: ProcessedRecord[];
}

export default function FleetView({ fleetData, data }: FleetViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFleet, setSelectedFleet] = useState<string | null>(null);

  const filteredData = fleetData.filter(item => 
    item.filo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRecords = fleetData.reduce((acc, curr) => acc + curr.count, 0);

  // Compute fleet details when selected
  const fleetRecords = selectedFleet ? data.filter(r => (r.filoAdi || 'Ana Filo') === selectedFleet) : [];
  const uniqueVehiclesCount = new Set(fleetRecords.map(r => r.plaka).filter(Boolean)).size;

  const getTopItemsByType = (type: 'BOSCH' | 'DIGER' | 'YAG' | 'ISCILIK') => {
    const map: Record<string, { count: number; ph3Codes: Set<string>; partCodes: Set<string>; categories: Set<string>; subcategories: Set<string> }> = {};
    fleetRecords.filter(r => {
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

  // Top vehicle models in this fleet
  const getTopVehiclesForFleet = () => {
    const map: Record<string, number> = {};
    fleetRecords.forEach(r => {
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

  const topBoschParts = selectedFleet ? getTopItemsByType('BOSCH') : [];
  const topOtherParts = selectedFleet ? getTopItemsByType('DIGER') : [];
  const topYagItems = selectedFleet ? getTopItemsByType('YAG') : [];
  const topIscilikItems = selectedFleet ? getTopItemsByType('ISCILIK') : [];
  const topVehicles = selectedFleet ? getTopVehiclesForFleet() : [];

  const fleetBoschCount = fleetRecords.filter(r => r.anaTur === 'BOSCH' || r.isBosch).length;
  const fleetDigerCount = fleetRecords.filter(r => r.anaTur === 'DIGER' || (r.isDiger && !r.isBosch && !r.isYag && !r.isIscilik)).length;
  const fleetYagCount = fleetRecords.filter(r => r.anaTur === 'YAG' || r.isYag).length;
  const fleetIscilikCount = fleetRecords.filter(r => r.anaTur === 'ISCILIK' || r.isIscilik).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-500" />
            Filo ve Grup Dağılımı
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Sistemdeki tüm aktif filoların parça ve işlem yoğunlukları. Detaylı analiz için filo kartına tıklayın.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filo ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.map((item, idx) => {
          const percentage = totalRecords > 0 ? ((item.count / totalRecords) * 100).toFixed(1) : '0';
          return (
            <div 
              key={idx} 
              onClick={() => setSelectedFleet(item.filo)}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:border-emerald-400 hover:shadow-md transition-all flex flex-col cursor-pointer group"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30 group-hover:bg-emerald-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{item.filo}</h3>
                    <span className="text-xs text-slate-500">Aktif Filo Grubu</span>
                  </div>
                </div>
                <span className="bg-emerald-600 text-white font-bold px-3 py-1 rounded-full text-xs">
                  {item.count} İşlem
                </span>
              </div>

              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Toplam Pay:</span>
                  <span className="font-semibold text-slate-800">%{percentage}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="pt-2 flex items-center justify-between text-xs text-emerald-700 font-medium">
                  <span>Detaylı Analizi Gör</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fleet Detail Modal */}
      {selectedFleet && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{selectedFleet} - Filo Detaylı Analizi</h3>
                  <span className="text-xs text-emerald-700 font-medium">Araç ve Parça Tüketim İstatistikleri</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedFleet(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 block font-medium">Toplam İşlem</span>
                  <span className="text-base font-bold text-slate-900">{fleetRecords.length}</span>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                  <span className="text-[11px] text-blue-600 block font-medium">Bosch</span>
                  <span className="text-base font-bold text-blue-700">{fleetBoschCount}</span>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center">
                  <span className="text-[11px] text-amber-600 block font-medium">Diğer Parça</span>
                  <span className="text-base font-bold text-amber-700">{fleetDigerCount}</span>
                </div>
                <div className="bg-cyan-50 p-3 rounded-xl border border-cyan-100 text-center">
                  <span className="text-[11px] text-cyan-600 block font-medium">Motor Yağı</span>
                  <span className="text-base font-bold text-cyan-700">{fleetYagCount}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[11px] text-emerald-600 block font-medium">İşçilik</span>
                  <span className="text-base font-bold text-emerald-700">{fleetIscilikCount}</span>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
                  <span className="text-[11px] text-purple-600 block font-medium">Araç Sayısı</span>
                  <span className="text-base font-bold text-purple-700">{uniqueVehiclesCount} Plaka</span>
                </div>
              </div>

              {/* Top Bosch Parts Used in this Fleet */}
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
                              {/* Hover'da beliren PH3 Kodu rozeti */}
                              <span className="opacity-0 group-hover/boschItem:opacity-100 transition-all duration-200 text-[11px] font-mono font-semibold text-blue-700 bg-blue-100/90 border border-blue-300 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                <Tag className="w-3 h-3 text-blue-600" />
                                PH3: {ph3CodeText}
                              </span>
                            </div>
                          </div>

                          <span className="bg-blue-100 text-blue-800 font-semibold px-2.5 py-1 rounded-lg text-xs shrink-0">
                            {item.count} Adet
                          </span>

                          {/* Hover Tooltip Balonu */}
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

              {/* Top Other Parts Used in this Fleet */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  Diğer / Bosch Olmayan Parçalar - En Çok Kullanılan İlk 5 Kalem
                </h4>
                {topOtherParts.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Diğer parça verisi bulunamadı.</p>
                ) : (
                  <div className="space-y-2">
                    {topOtherParts.map((item, idx) => {
                      const ph3CodeText = item.ph3Codes.length > 0 ? item.ph3Codes.join(', ') : '';
                      const categoryText = item.categories.length > 0 ? item.categories.join(', ') : '';
                      const subcategoryText = item.subcategories.length > 0 ? item.subcategories.join(', ') : '';

                      return (
                        <div 
                          key={idx} 
                          title={`Parça Grubu: ${item.name}${ph3CodeText ? ` | Kod: ${ph3CodeText}` : ''}${categoryText ? ` | Kategori: ${categoryText}` : ''}`}
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
                              {/* Hover'da beliren PH3 Kodu / İsmi rozeti */}
                              <span className="opacity-0 group-hover/otherItem:opacity-100 transition-all duration-200 text-[11px] font-mono font-semibold text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                <Tag className="w-3 h-3 text-amber-600" />
                                {ph3CodeText ? `Kod: ${ph3CodeText}` : item.name}
                              </span>
                            </div>
                          </div>

                          <span className="bg-amber-100 text-amber-900 font-semibold px-2.5 py-1 rounded-lg text-xs shrink-0">
                            {item.count} Adet
                          </span>

                          {/* Hover Tooltip Balonu */}
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
                              <div className="text-[11px] text-slate-300 mb-0.5">
                                <span className="text-slate-400">Ana Kategori: </span>
                                <span className="font-medium text-white">{categoryText}</span>
                              </div>
                            )}
                            {subcategoryText && (
                              <div className="text-[11px] text-slate-300">
                                <span className="text-slate-400">Alt Kategori: </span>
                                <span className="font-medium text-slate-200">{subcategoryText}</span>
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

              {/* Top Motor Oils Used in this Fleet */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-600" />
                  Motor Yağları & Sıvılar - En Çok Kullanılan İlk 5 Kalem
                </h4>
                {topYagItems.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Bu filoda motor yağı verisi bulunamadı.</p>
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

              {/* Top Labor Used in this Fleet */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  İşçilik & Bakım Hizmetleri - En Çok Uygulanan İlk 5 İşlem
                </h4>
                {topIscilikItems.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Bu filoda işçilik verisi bulunamadı.</p>
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

              {/* Top Vehicle Models in this Fleet */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-500" />
                  Bu Filoda En Yoğun Bulunan Araç Modelleri
                </h4>
                {topVehicles.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Araç modeli verisi bulunamadı.</p>
                ) : (
                  <div className="space-y-2">
                    {topVehicles.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                        <div className="flex items-center gap-3">
                          <Tag className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-slate-800">{item.model}</span>
                        </div>
                        <span className="bg-blue-100 text-blue-800 font-semibold px-2.5 py-1 rounded-lg text-xs">
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
                onClick={() => setSelectedFleet(null)}
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
