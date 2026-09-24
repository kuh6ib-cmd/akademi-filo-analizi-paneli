import React, { useState, useEffect, useMemo } from 'react';
import DataTable from './components/DataTable';
import Hierarchy from './components/Hierarchy';
import Dashboard from './components/Dashboard';
import BrandModelView from './components/BrandModelView';
import FleetView from './components/FleetView';
import ServisView from './components/ServisView';
import KmCiroView from './components/KmCiroView';
import BrandRevenueAnalysisView from './components/BrandRevenueAnalysisView';
import BcsRevenueAnalysisView from './components/BcsRevenueAnalysisView';
import FleetRevenueAnalysisView from './components/FleetRevenueAnalysisView';
import MasterAnalysisView from './components/MasterAnalysisView';
import WarrantyAnalysisView from './components/WarrantyAnalysisView';
import Uploader from './components/Uploader';
import GlobalCategoryFilterBar from './components/GlobalCategoryFilterBar';
import { LayoutDashboard, FileSpreadsheet, Network, Wrench, UploadCloud, Layers, Car, Building2, Store, Gauge, Coins, PieChart, Sparkles, ShieldCheck } from 'lucide-react';
import { processExcelData, generateStats, ProcessedRecord, ProcessProgress } from './lib/engine';
import { getFileFromIDB } from './lib/idb';
import { 
  processedData as mockData, 
  brandDistribution as mockBrands, 
  topCategories as mockCats, 
  categoryTopItems as mockCategoryTopItems, 
  brandModelData as mockBrandModelData, 
  fleetData as mockFleetData, 
  servisData as mockServisData,
  hierarchicalData as mockHierarchy 
} from './data';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'derli-toplu' | 'garanti' | 'table' | 'hierarchy' | 'dashboard' | 'bcs-ciro' | 'filo-ciro' | 'marka-ciro' | 'km-ciro' | 'brands' | 'fleets' | 'servisler'>('upload');
  
  // State for real processed data
  const [data, setData] = useState<ProcessedRecord[]>(mockData);
  const [brands, setBrands] = useState<any[]>(mockBrands);
  const [categories, setCategories] = useState<any[]>(mockCats);
  const [categoryTopItems, setCategoryTopItems] = useState<Record<string, { name: string; count: number }[]>>(mockCategoryTopItems);
  const [brandModelData, setBrandModelData] = useState<any[]>(mockBrandModelData);
  const [fleetData, setFleetData] = useState<any[]>(mockFleetData);
  const [servisData, setServisData] = useState<any[]>(mockServisData);
  const [hierarchy, setHierarchy] = useState<any>(mockHierarchy);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [categoryFilters, setCategoryFilters] = useState<{
    bosch: boolean;
    diger: boolean;
    yag: boolean;
    iscilik: boolean;
  }>({
    bosch: true,
    diger: true,
    yag: true,
    iscilik: true
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    let result = data;

    if (!categoryFilters.bosch || !categoryFilters.diger || !categoryFilters.yag || !categoryFilters.iscilik) {
      result = result.filter(r => {
        const nameUpper = (r.ph3Type || r.eslesenKatalog || r.orijinalKodAd || '').toUpperCase();
        const isYag = r.isYag || nameUpper.includes('YAĞ') || nameUpper.includes('OIL') || nameUpper.includes('0W') || nameUpper.includes('5W');
        const isIscilik = r.isIscilik || nameUpper.includes('İŞÇİLİK') || nameUpper.includes('BAKIM İŞÇİLİĞİ') || nameUpper.includes('MONTAJ');
        const isBosch = r.isBosch || nameUpper.includes('BOSCH');
        const isDiger = !isBosch && !isYag && !isIscilik;

        if (isBosch && !categoryFilters.bosch) return false;
        if (isDiger && !categoryFilters.diger) return false;
        if (isYag && !categoryFilters.yag) return false;
        if (isIscilik && !categoryFilters.iscilik) return false;
        return true;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(r => 
        (r.ph3Type && r.ph3Type.toLowerCase().includes(term)) ||
        (r.eslesenKatalog && r.eslesenKatalog.toLowerCase().includes(term)) ||
        (r.orijinalKodAd && r.orijinalKodAd.toLowerCase().includes(term)) ||
        (r.ph3Code && r.ph3Code.toLowerCase().includes(term)) ||
        (r.plaka && r.plaka.toLowerCase().includes(term)) ||
        (r.aracMarka && r.aracMarka.toLowerCase().includes(term)) ||
        (r.aracModel && r.aracModel.toLowerCase().includes(term))
      );
    }

    return result;
  }, [data, categoryFilters, searchTerm]);

  const currentStats = useMemo(() => {
    return generateStats(filteredData);
  }, [filteredData]);

  const handleDataProcessed = async (
    filo: File, 
    bosch: File, 
    diger: File, 
    onProgress?: (p: ProcessProgress) => void
  ) => {
    try {
      const processed = await processExcelData(filo, bosch, diger, onProgress);
      const stats = generateStats(processed);
      
      setData(processed);
      setBrands(stats.brandDistribution);
      setCategories(stats.topCategories);
      setCategoryTopItems(stats.categoryTopItems);
      setBrandModelData(stats.brandModelData);
      setFleetData(stats.fleetData);
      setServisData(stats.servisData);
      setHierarchy(stats.hierarchicalData);
      setIsDataLoaded(true);
      setActiveTab('derli-toplu');
    } catch (error) {
      console.error("Veri işlenirken hata oluştu:", error);
      alert("Dosyalar işlenirken bir hata oluştu. Lütfen formatları kontrol edin.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            {/* Logo ve Başlık (Kompakt / Küçültülmüş) */}
            <div className="flex items-center gap-2 shrink-0 pr-2 border-r border-slate-200/80">
              <div className="bg-blue-600 p-1.5 rounded-md shadow-xs">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <div className="whitespace-nowrap">
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">Yedek Parça Analiz</h1>
                <p className="text-[10px] text-slate-500 font-medium leading-none">İş Zekası & Eşleştirme</p>
              </div>
            </div>

            {/* Yatay Kaydırılabilir Sekmeler (Scrollbar Eklenmiş) */}
            <div className="flex items-center space-x-1.5 overflow-x-auto py-2 custom-scrollbar min-w-0 flex-1">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'upload' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Dosya Yükle</span>
              </button>
              <button
                onClick={() => setActiveTab('derli-toplu')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shadow-xs shrink-0 ${
                  activeTab === 'derli-toplu' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/25 ring-2 ring-blue-400/30' 
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 hover:text-blue-900 border border-blue-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>Bütünleşik Analiz</span>
              </button>
              <button
                onClick={() => setActiveTab('garanti')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shadow-xs shrink-0 ${
                  activeTab === 'garanti' 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-emerald-600/25 ring-2 ring-emerald-400/30' 
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Garanti Analizi (2 Yıl / 60k KM)</span>
              </button>
              <button
                onClick={() => setActiveTab('filo-ciro')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'filo-ciro' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>Filo Ciro & Parça</span>
              </button>
              <button
                onClick={() => setActiveTab('bcs-ciro')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'bcs-ciro' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-amber-300" />
                <span>BCS Ciro & Parça</span>
              </button>
              <button
                onClick={() => setActiveTab('marka-ciro')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'marka-ciro' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-blue-600" />
                <span>Marka Parça & Ciro</span>
              </button>
              <button
                onClick={() => setActiveTab('km-ciro')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'km-ciro' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>KM & Ciro</span>
              </button>
              <button
                onClick={() => setActiveTab('brands')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'brands' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Gelen Araçlar</span>
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Grafikler</span>
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'table' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Eşleştirme Özeti</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">
            {activeTab === 'upload' 
              ? 'Lütfen analizi yapılacak güncel veri setlerini sisteme tanımlayın.'
              : (isDataLoaded 
                  ? 'Yüklenen dosyalar başarıyla analiz edildi. Veriler koşullu dallanma, metin normalizasyonu ve esnek eşleme yöntemleriyle işlenmiştir.'
                  : 'Sağlanan örneklem verilerle analiz sonuçları görüntülenmektedir. Gerçek dosyalarınızı "Dosya Yükle" sekmesinden aktarabilirsiniz.')}
          </p>
        </div>

        {activeTab !== 'upload' && (
          <GlobalCategoryFilterBar
            data={data}
            categoryFilters={categoryFilters}
            setCategoryFilters={setCategoryFilters}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        )}

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'derli-toplu' && <MasterAnalysisView data={filteredData} />}
          {activeTab === 'garanti' && <WarrantyAnalysisView data={filteredData} />}
          {activeTab === 'upload' && <Uploader onProcessFiles={handleDataProcessed} />}
          {activeTab === 'dashboard' && <Dashboard brandDistribution={currentStats.brandDistribution} topCategories={currentStats.topCategories} categoryTopItems={currentStats.categoryTopItems} data={filteredData} />}
          {activeTab === 'bcs-ciro' && <BcsRevenueAnalysisView data={filteredData} />}
          {activeTab === 'filo-ciro' && <FleetRevenueAnalysisView data={filteredData} />}
          {activeTab === 'marka-ciro' && <BrandRevenueAnalysisView data={filteredData} />}
          {activeTab === 'km-ciro' && <KmCiroView data={filteredData} brandModelData={currentStats.brandModelData} />}
          {activeTab === 'brands' && <BrandModelView brandModelData={currentStats.brandModelData} data={filteredData} />}
          {activeTab === 'fleets' && <FleetView fleetData={currentStats.fleetData} data={filteredData} />}
          {activeTab === 'servisler' && <ServisView servisData={currentStats.servisData} data={filteredData} />}
          {activeTab === 'table' && <DataTable data={filteredData} />}
          {activeTab === 'hierarchy' && <Hierarchy hierarchicalData={currentStats.hierarchicalData} />}
        </div>
      </main>

      <footer id="app-footer" className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="font-semibold text-slate-700 tracking-wide">
            Bosch © telif hakları saklıdır.
          </div>
          <div className="text-slate-400 font-medium">
            Filo & Parça Veri Eşleştirme ve Garanti Analiz Platformu
          </div>
        </div>
      </footer>
    </div>
  );
}
