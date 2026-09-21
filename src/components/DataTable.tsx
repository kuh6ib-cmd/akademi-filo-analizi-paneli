import React, { useState } from 'react';
import { FileText, CheckCircle2, Search } from 'lucide-react';
import { ProcessedRecord } from '../lib/engine';

interface DataTableProps {
  data: ProcessedRecord[];
}

export default function DataTable({ data }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BOSCH' | 'DIGER' | 'YAG' | 'ISCILIK'>('ALL');
  const [filterIslem, setFilterIslem] = useState<'ALL' | 'Bakım' | 'Arıza' | 'Hasar' | 'Dış İşçilikler'>('ALL');

  const filteredData = data.filter(row => {
    const rowType = row.anaTur || (row.isBosch ? 'BOSCH' : (row.isYag ? 'YAG' : (row.isIscilik ? 'ISCILIK' : 'DIGER')));
    if (filterType !== 'ALL' && rowType !== filterType) return false;
    if (filterIslem !== 'ALL' && (row.islemTuru || 'Bakım') !== filterIslem) return false;

    if (!searchTerm) return true;
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getBadgeClass = (row: ProcessedRecord) => {
    const type = row.anaTur || (row.isBosch ? 'BOSCH' : (row.isYag ? 'YAG' : (row.isIscilik ? 'ISCILIK' : 'DIGER')));
    switch (type) {
      case 'BOSCH':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'YAG':
        return 'bg-cyan-100 text-cyan-800 border border-cyan-200';
      case 'ISCILIK':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      default:
        return 'bg-amber-100 text-amber-800 border border-amber-200';
    }
  };

  const getBadgeLabel = (row: ProcessedRecord) => {
    const type = row.anaTur || (row.isBosch ? 'BOSCH' : (row.isYag ? 'YAG' : (row.isIscilik ? 'ISCILIK' : 'DIGER')));
    switch (type) {
      case 'BOSCH':
        return 'Bosch';
      case 'YAG':
        return 'Motor Yağı';
      case 'ISCILIK':
        return 'İşçilik / Hizmet';
      default:
        return 'Diğer Parça';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Eşleştirme ve Normalizasyon Özeti
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Filo tablosundaki kayıtların Bosch, Diğer Parça, Motor Yağı ve İşçilik olarak sınıflandırılmış detaylı görünümü.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-md transition-all ${filterType === 'ALL' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Tümü
              </button>
              <button
                onClick={() => setFilterType('BOSCH')}
                className={`px-2.5 py-1 rounded-md transition-all ${filterType === 'BOSCH' ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Bosch
              </button>
              <button
                onClick={() => setFilterType('DIGER')}
                className={`px-2.5 py-1 rounded-md transition-all ${filterType === 'DIGER' ? 'bg-amber-500 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Diğer
              </button>
              <button
                onClick={() => setFilterType('YAG')}
                className={`px-2.5 py-1 rounded-md transition-all ${filterType === 'YAG' ? 'bg-cyan-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Motor Yağı
              </button>
              <button
                onClick={() => setFilterType('ISCILIK')}
                className={`px-2.5 py-1 rounded-md transition-all ${filterType === 'ISCILIK' ? 'bg-emerald-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                İşçilik
              </button>
            </div>

            {/* İşlem Türü Filtresi */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setFilterIslem('ALL')}
                className={`px-2 py-1 rounded-md transition-all ${filterIslem === 'ALL' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Tüm İşlemler
              </button>
              <button
                onClick={() => setFilterIslem('Bakım')}
                className={`px-2 py-1 rounded-md transition-all ${filterIslem === 'Bakım' ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Bakım
              </button>
              <button
                onClick={() => setFilterIslem('Arıza')}
                className={`px-2 py-1 rounded-md transition-all ${filterIslem === 'Arıza' ? 'bg-amber-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Arıza
              </button>
              <button
                onClick={() => setFilterIslem('Hasar')}
                className={`px-2 py-1 rounded-md transition-all ${filterIslem === 'Hasar' ? 'bg-rose-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Hasar
              </button>
              <button
                onClick={() => setFilterIslem('Dış İşçilikler')}
                className={`px-2 py-1 rounded-md transition-all ${filterIslem === 'Dış İşçilikler' ? 'bg-purple-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Dış İşçilik
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tabloda ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-green-200 flex items-center gap-1.5 whitespace-nowrap">
            <CheckCircle2 className="w-4 h-4" />
            <span>{filteredData.length} / {data.length} Kayıt</span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[600px]">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">#</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">İşlem Türü</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Kategori / Tür</th>
              <th scope="col" className="px-4 py-3 min-w-[180px]">Orijinal Parça / İşlem</th>
              <th scope="col" className="px-4 py-3 min-w-[140px]">Eşleşen Katalog / Ürün</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Seviye 1-2-3 (Kategori)</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Araç & Plaka</th>
              <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">KM</th>
              <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">Tutar (₺)</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Filo / Firma</th>
              <th scope="col" className="px-4 py-3 whitespace-nowrap">Servis Noktası</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((row) => (
              <tr key={row.satirNo} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-500">{row.satirNo}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    row.islemTuru === 'Bakım' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                    row.islemTuru === 'Arıza' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    row.islemTuru === 'Hasar' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    'bg-purple-100 text-purple-800 border border-purple-200'
                  }`}>
                    {row.islemTuru || 'Bakım'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getBadgeClass(row)}`}>
                    {getBadgeLabel(row)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700 truncate max-w-[200px]" title={row.orijinalKodAd}>
                  {row.orijinalKodAd}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  <div>{row.eslesenKatalog}</div>
                  {row.ph3Code && (
                    <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      PH3: {row.ph3Code}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-xs font-medium text-slate-900">{row.seviye1}</div>
                  <div className="text-[11px] text-slate-500">{row.seviye2}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-xs font-medium text-slate-900">{row.plaka || '-'}</div>
                  <div className="text-[11px] text-slate-500">{row.aracMarka} {row.aracModel}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-emerald-700 whitespace-nowrap">
                  {row.km ? `${row.km.toLocaleString('tr-TR')} KM` : '-'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                  {row.tutar ? `${row.tutar.toLocaleString('tr-TR')} ₺` : '-'}
                </td>
                <td className="px-4 py-3 text-slate-700 font-medium text-xs">
                  <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-semibold">{row.filoAdi || 'Ana Filo'}</span>
                </td>
                <td className="px-4 py-3 text-slate-700 font-medium text-xs">
                  <span className="bg-amber-50 text-amber-900 px-2 py-1 rounded border border-amber-200 font-semibold">{row.servisIsmi || 'Merkez Servis'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
