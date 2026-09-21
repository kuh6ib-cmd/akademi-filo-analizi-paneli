import React, { useState } from 'react';
import { Layers, Search, FolderTree, ArrowRight } from 'lucide-react';

interface HierarchyProps {
  hierarchicalData: any;
}

export default function Hierarchy({ hierarchicalData }: HierarchyProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const s1List = hierarchicalData?.children || [];

  const filteredS1 = s1List.filter((s1: any) => 
    s1.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s1.children?.some((s2: any) => 
      s2.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s2.children?.some((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            Kategori ve Grup Kırılım Özeti
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Ana gruplar, alt gruplar ve içerdiği parça sayıları (Kompakt Görünüm).
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Kategori veya parça ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="p-6">
        {filteredS1.length === 0 ? (
          <div className="text-center py-12 text-slate-400">Aranan kriterlere uygun kategori bulunamadı.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredS1.map((s1: any, idx: number) => {
              const totalItemsInS1 = s1.children?.reduce((acc: number, s2: any) => {
                return acc + (s2.children?.reduce((pAcc: number, p: any) => pAcc + (p.value || 1), 0) || 0);
              }, 0) || 0;

              return (
                <div key={idx} className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <FolderTree className="w-3.5 h-3.5" />
                        Ana Grup
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-full">
                        {totalItemsInS1} Kayıt
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-base mb-3 pb-2 border-b border-slate-200">
                      {s1.name}
                    </h3>

                    <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1 hide-scrollbar">
                      {s1.children?.map((s2: any, s2Idx: number) => {
                        const s2Count = s2.children?.reduce((pAcc: number, p: any) => pAcc + (p.value || 1), 0) || 0;
                        return (
                          <div key={s2Idx} className="bg-white rounded-lg p-3 border border-slate-200/60 shadow-2xs">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                              <span className="truncate pr-2">{s2.name}</span>
                              <span className="shrink-0 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">{s2Count}</span>
                            </div>
                            {s2.children && s2.children.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {s2.children.slice(0, 3).map((p: any, pIdx: number) => (
                                  <span key={pIdx} className="inline-block bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded truncate max-w-[180px]" title={p.name}>
                                    {p.name} {p.value > 1 ? `(${p.value})` : ''}
                                  </span>
                                ))}
                                {s2.children.length > 3 && (
                                  <span className="inline-block bg-slate-200 text-slate-600 text-[11px] px-1.5 py-0.5 rounded font-medium">
                                    +{s2.children.length - 3} diğer
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
