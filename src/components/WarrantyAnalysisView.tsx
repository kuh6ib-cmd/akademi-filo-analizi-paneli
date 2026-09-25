import React, { useState, useMemo } from 'react';
import { ProcessedRecord, GarantiDurumu, calculateGarantiStatus } from '../lib/engine';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Car, 
  Gauge, 
  Coins, 
  Calendar, 
  Layers, 
  Search, 
  Filter, 
  Download, 
  ArrowUpDown, 
  ChevronRight, 
  Info, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Building2,
  Store,
  PieChart as PieChartIcon,
  BarChart3,
  Sparkles,
  ChevronDown,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface WarrantyAnalysisViewProps {
  data: ProcessedRecord[];
}

export default function WarrantyAnalysisView({ data }: WarrantyAnalysisViewProps) {
  // Filtre State'leri
  const [selectedGarantiFilter, setSelectedGarantiFilter] = useState<'ALL' | 'GARANTI_ICI' | 'GARANTI_DISI'>('ALL');
  const [selectedMarka, setSelectedMarka] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'overall' | 'brand' | 'brand-model' | 'vehicles'>('overall');
  const [selectedVehicleModal, setSelectedVehicleModal] = useState<string | null>(null);

  // Sıralama State'leri
  const [sortField, setSortField] = useState<'totalCiro' | 'aracSayisi' | 'garantiIciCiro' | 'garantiDisiCiro' | 'garantiIciOran'>('totalCiro');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Para formatlayıcı
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('tr-TR').format(val);
  };

  // Veri Setindeki Tüm Kayıtların Garanti Durumunu Teyit Et
  const enrichedData = useMemo(() => {
    return data.map(item => {
      if (item.garantiDurumu && item.garantiNedeni) {
        return item;
      }
      const w = calculateGarantiStatus(item.modelYili, item.km || 0, item.islemYili || 2024);
      return {
        ...item,
        garantiDurumu: w.garantiDurumu,
        garantiNedeni: w.garantiNedeni,
        aracYasi: w.aracYasi,
        modelYili: w.modelYili
      };
    });
  }, [data]);

  // Marka Listesi
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    enrichedData.forEach(r => {
      if (r.aracMarka && r.aracMarka !== 'Diğer Marka') set.add(r.aracMarka);
    });
    return Array.from(set).sort();
  }, [enrichedData]);

  // Filtrelenmiş Ana Veri
  const filteredData = useMemo(() => {
    return enrichedData.filter(r => {
      // Garanti Durumu Filtresi
      if (selectedGarantiFilter === 'GARANTI_ICI' && r.garantiDurumu !== 'Garanti İçi') return false;
      if (selectedGarantiFilter === 'GARANTI_DISI' && r.garantiDurumu !== 'Garanti Dışı') return false;

      // Marka Filtresi
      if (selectedMarka !== 'ALL' && r.aracMarka !== selectedMarka) return false;

      // Arama
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchPlaka = (r.plaka || '').toLowerCase().includes(q);
        const matchMarka = (r.aracMarka || '').toLowerCase().includes(q);
        const matchModel = (r.aracModel || '').toLowerCase().includes(q);
        const matchFilo = (r.filoAdi || '').toLowerCase().includes(q);
        const matchServis = (r.servisIsmi || '').toLowerCase().includes(q);
        if (!matchPlaka && !matchMarka && !matchModel && !matchFilo && !matchServis) return false;
      }

      return true;
    });
  }, [enrichedData, selectedGarantiFilter, selectedMarka, searchTerm]);

  // 1. GENEL ANALİZ HESAPLAMALARI (Tüm Araçlar İçindeki Toplam Sayı ve Cirolar)
  const overallStats = useMemo(() => {
    const totalRecords = enrichedData.length;
    const totalCiro = enrichedData.reduce((acc, r) => acc + (r.tutar || 0), 0);

    // Plakalar bazında tekil araçlar
    const allPlakalar = new Set<string>();
    const garantiIciPlakalar = new Set<string>();
    const garantiDisiPlakalar = new Set<string>();

    let garantiIciCiro = 0;
    let garantiDisiCiro = 0;
    let garantiIciKayitSayisi = 0;
    let garantiDisiKayitSayisi = 0;

    // Garanti Dışına Çıkma Nedenleri
    let reasonKmAşımıCount = 0;
    let reasonKmAşımıCiro = 0;
    let reasonYasAşımıCount = 0;
    let reasonYasAşımıCiro = 0;
    let reasonBothCount = 0;
    let reasonBothCiro = 0;

    // İşlem Türü Dağılımı (Bakım, Arıza, Hasar, Dış İşçilik)
    const islemIci: Record<string, { count: number; ciro: number }> = {
      'Bakım': { count: 0, ciro: 0 },
      'Arıza': { count: 0, ciro: 0 },
      'Hasar': { count: 0, ciro: 0 },
      'Dış İşçilikler': { count: 0, ciro: 0 }
    };

    const islemDisi: Record<string, { count: number; ciro: number }> = {
      'Bakım': { count: 0, ciro: 0 },
      'Arıza': { count: 0, ciro: 0 },
      'Hasar': { count: 0, ciro: 0 },
      'Dış İşçilikler': { count: 0, ciro: 0 }
    };

    // Parça & İşçilik Dağılımı
    const parcaIci: Record<string, number> = { BOSCH: 0, DIGER: 0, YAG: 0, ISCILIK: 0 };
    const parcaDisi: Record<string, number> = { BOSCH: 0, DIGER: 0, YAG: 0, ISCILIK: 0 };

    enrichedData.forEach(r => {
      const plk = r.plaka || `PLK-${r.satirNo}`;
      allPlakalar.add(plk);
      const tutar = r.tutar || 0;
      const islem = r.islemTuru || 'Bakım';
      const anaTur = r.anaTur || 'DIGER';

      if (r.garantiDurumu === 'Garanti İçi') {
        garantiIciPlakalar.add(plk);
        garantiIciCiro += tutar;
        garantiIciKayitSayisi++;
        if (islemIci[islem]) {
          islemIci[islem].count++;
          islemIci[islem].ciro += tutar;
        }
        parcaIci[anaTur] = (parcaIci[anaTur] || 0) + tutar;
      } else {
        garantiDisiPlakalar.add(plk);
        garantiDisiCiro += tutar;
        garantiDisiKayitSayisi++;
        if (islemDisi[islem]) {
          islemDisi[islem].count++;
          islemDisi[islem].ciro += tutar;
        }
        parcaDisi[anaTur] = (parcaDisi[anaTur] || 0) + tutar;

        // Neden analizi
        const km = r.km || 0;
        const yas = r.aracYasi || 0;
        if (km > 100000 && yas > 3) {
          reasonBothCount++;
          reasonBothCiro += tutar;
        } else if (km > 100000) {
          reasonKmAşımıCount++;
          reasonKmAşımıCiro += tutar;
        } else {
          reasonYasAşımıCount++;
          reasonYasAşımıCiro += tutar;
        }
      }
    });

    const totalVehicles = allPlakalar.size || 1;
    const garantiIciVehicles = garantiIciPlakalar.size;
    const garantiDisiVehicles = garantiDisiPlakalar.size;

    return {
      totalVehicles,
      totalRecords,
      totalCiro,
      garantiIciVehicles,
      garantiDisiVehicles,
      garantiIciVehiclesPct: (garantiIciVehicles / totalVehicles) * 100,
      garantiDisiVehiclesPct: (garantiDisiVehicles / totalVehicles) * 100,
      garantiIciCiro,
      garantiDisiCiro,
      garantiIciCiroPct: totalCiro > 0 ? (garantiIciCiro / totalCiro) * 100 : 0,
      garantiDisiCiroPct: totalCiro > 0 ? (garantiDisiCiro / totalCiro) * 100 : 0,
      garantiIciKayitSayisi,
      garantiDisiKayitSayisi,
      avgCiroPerVehicleIci: garantiIciVehicles > 0 ? garantiIciCiro / garantiIciVehicles : 0,
      avgCiroPerVehicleDisi: garantiDisiVehicles > 0 ? garantiDisiCiro / garantiDisiVehicles : 0,
      reasons: {
        kmAsimi: { count: reasonKmAşımıCount, ciro: reasonKmAşımıCiro },
        yasAsimi: { count: reasonYasAşımıCount, ciro: reasonYasAşımıCiro },
        both: { count: reasonBothCount, ciro: reasonBothCiro }
      },
      islemIci,
      islemDisi,
      parcaIci,
      parcaDisi
    };
  }, [enrichedData]);

  // 2. MARKA BAZINDA GARANTİ İÇİ / DIŞI ANALİZİ
  const brandWarrantyStats = useMemo(() => {
    const map = new Map<string, {
      marka: string;
      totalCiro: number;
      garantiIciCiro: number;
      garantiDisiCiro: number;
      plakalar: Set<string>;
      garantiIciPlakalar: Set<string>;
      garantiDisiPlakalar: Set<string>;
      kmSum: number;
      kmCount: number;
      yasSum: number;
      models: Set<string>;
      kayitSayisi: number;
      islemTurleri: Record<string, number>;
    }>();

    enrichedData.forEach(r => {
      const marka = r.aracMarka || 'Diğer Marka';
      const plk = r.plaka || `PLK-${r.satirNo}`;
      const tutar = r.tutar || 0;
      const km = r.km || 0;
      const yas = r.aracYasi || 0;
      const islem = r.islemTuru || 'Bakım';

      if (!map.has(marka)) {
        map.set(marka, {
          marka,
          totalCiro: 0,
          garantiIciCiro: 0,
          garantiDisiCiro: 0,
          plakalar: new Set(),
          garantiIciPlakalar: new Set(),
          garantiDisiPlakalar: new Set(),
          kmSum: 0,
          kmCount: 0,
          yasSum: 0,
          models: new Set(),
          kayitSayisi: 0,
          islemTurleri: { 'Bakım': 0, 'Arıza': 0, 'Hasar': 0, 'Dış İşçilikler': 0 }
        });
      }

      const item = map.get(marka)!;
      item.totalCiro += tutar;
      item.kayitSayisi++;
      item.plakalar.add(plk);
      item.kmSum += km;
      item.kmCount++;
      item.yasSum += yas;
      if (r.aracModel) item.models.add(r.aracModel);
      item.islemTurleri[islem] = (item.islemTurleri[islem] || 0) + tutar;

      if (r.garantiDurumu === 'Garanti İçi') {
        item.garantiIciCiro += tutar;
        item.garantiIciPlakalar.add(plk);
      } else {
        item.garantiDisiCiro += tutar;
        item.garantiDisiPlakalar.add(plk);
      }
    });

    const list = Array.from(map.values()).map(b => {
      const totalVehicles = b.plakalar.size || 1;
      const garantiIciVehicles = b.garantiIciPlakalar.size;
      const garantiDisiVehicles = b.garantiDisiPlakalar.size;

      return {
        marka: b.marka,
        totalCiro: b.totalCiro,
        aracSayisi: totalVehicles,
        garantiIciCiro: b.garantiIciCiro,
        garantiDisiCiro: b.garantiDisiCiro,
        garantiIciVehicles,
        garantiDisiVehicles,
        garantiIciOran: (garantiIciVehicles / totalVehicles) * 100,
        garantiDisiOran: (garantiDisiVehicles / totalVehicles) * 100,
        garantiIciCiroOran: b.totalCiro > 0 ? (b.garantiIciCiro / b.totalCiro) * 100 : 0,
        garantiDisiCiroOran: b.totalCiro > 0 ? (b.garantiDisiCiro / b.totalCiro) * 100 : 0,
        avgKm: b.kmCount > 0 ? Math.round(b.kmSum / b.kmCount) : 0,
        avgAge: b.kmCount > 0 ? Number((b.yasSum / b.kmCount).toFixed(1)) : 0,
        modelCount: b.models.size,
        kayitSayisi: b.kayitSayisi,
        islemTurleri: b.islemTurleri
      };
    });

    // Sıralama
    return list.sort((a, b) => {
      let vA = a[sortField] ?? 0;
      let vB = b[sortField] ?? 0;
      if (sortOrder === 'desc') return (vB as number) - (vA as number);
      return (vA as number) - (vB as number);
    });
  }, [enrichedData, sortField, sortOrder]);

  // 3. MARKA-MODEL BAZINDA GARANTİ İÇİ / DIŞI ANALİZİ
  const brandModelWarrantyStats = useMemo(() => {
    const map = new Map<string, {
      key: string;
      marka: string;
      model: string;
      totalCiro: number;
      garantiIciCiro: number;
      garantiDisiCiro: number;
      plakalar: Set<string>;
      garantiIciPlakalar: Set<string>;
      garantiDisiPlakalar: Set<string>;
      kmSum: number;
      kmCount: number;
      yasSum: number;
      modelYears: Set<number>;
      kayitSayisi: number;
      dominantIslem: string;
      islemCounts: Record<string, number>;
    }>();

    enrichedData.forEach(r => {
      const marka = r.aracMarka || 'Diğer Marka';
      const model = r.aracModel || 'Genel Model';
      const key = `${marka} - ${model}`;
      const plk = r.plaka || `PLK-${r.satirNo}`;
      const tutar = r.tutar || 0;
      const km = r.km || 0;
      const yas = r.aracYasi || 0;
      const islem = r.islemTuru || 'Bakım';

      if (!map.has(key)) {
        map.set(key, {
          key,
          marka,
          model,
          totalCiro: 0,
          garantiIciCiro: 0,
          garantiDisiCiro: 0,
          plakalar: new Set(),
          garantiIciPlakalar: new Set(),
          garantiDisiPlakalar: new Set(),
          kmSum: 0,
          kmCount: 0,
          yasSum: 0,
          modelYears: new Set(),
          kayitSayisi: 0,
          dominantIslem: 'Bakım',
          islemCounts: { 'Bakım': 0, 'Arıza': 0, 'Hasar': 0, 'Dış İşçilikler': 0 }
        });
      }

      const item = map.get(key)!;
      item.totalCiro += tutar;
      item.kayitSayisi++;
      item.plakalar.add(plk);
      item.kmSum += km;
      item.kmCount++;
      item.yasSum += yas;
      if (r.modelYili) item.modelYears.add(r.modelYili);
      item.islemCounts[islem] = (item.islemCounts[islem] || 0) + 1;

      if (r.garantiDurumu === 'Garanti İçi') {
        item.garantiIciCiro += tutar;
        item.garantiIciPlakalar.add(plk);
      } else {
        item.garantiDisiCiro += tutar;
        item.garantiDisiPlakalar.add(plk);
      }
    });

    const list = Array.from(map.values()).map(bm => {
      const totalVehicles = bm.plakalar.size || 1;
      const garantiIciVehicles = bm.garantiIciPlakalar.size;
      const garantiDisiVehicles = bm.garantiDisiPlakalar.size;

      // Dominant işlem
      let maxCount = -1;
      let dominant = 'Bakım';
      Object.entries(bm.islemCounts).forEach(([islem, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominant = islem;
        }
      });

      const sortedYears = Array.from(bm.modelYears).sort();
      const yearsText = sortedYears.length > 0 
        ? (sortedYears.length > 3 ? `${sortedYears[0]} - ${sortedYears[sortedYears.length - 1]}` : sortedYears.join(', '))
        : '-';

      return {
        key: bm.key,
        marka: bm.marka,
        model: bm.model,
        totalCiro: bm.totalCiro,
        aracSayisi: totalVehicles,
        garantiIciCiro: bm.garantiIciCiro,
        garantiDisiCiro: bm.garantiDisiCiro,
        garantiIciVehicles,
        garantiDisiVehicles,
        garantiIciOran: (garantiIciVehicles / totalVehicles) * 100,
        garantiDisiOran: (garantiDisiVehicles / totalVehicles) * 100,
        garantiIciCiroOran: bm.totalCiro > 0 ? (bm.garantiIciCiro / bm.totalCiro) * 100 : 0,
        garantiDisiCiroOran: bm.totalCiro > 0 ? (bm.garantiDisiCiro / bm.totalCiro) * 100 : 0,
        avgKm: bm.kmCount > 0 ? Math.round(bm.kmSum / bm.kmCount) : 0,
        avgAge: bm.kmCount > 0 ? Number((bm.yasSum / bm.kmCount).toFixed(1)) : 0,
        yearsText,
        kayitSayisi: bm.kayitSayisi,
        dominantIslem: dominant
      };
    });

    // Marka ve Arama Filtresi Uygula
    return list.filter(bm => {
      if (selectedMarka !== 'ALL' && bm.marka !== selectedMarka) return false;
      if (selectedGarantiFilter === 'GARANTI_ICI' && bm.garantiIciVehicles === 0) return false;
      if (selectedGarantiFilter === 'GARANTI_DISI' && bm.garantiDisiVehicles === 0) return false;
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        if (!bm.key.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      let vA = a[sortField] ?? 0;
      let vB = b[sortField] ?? 0;
      if (sortOrder === 'desc') return (vB as number) - (vA as number);
      return (vA as number) - (vB as number);
    });
  }, [enrichedData, selectedMarka, selectedGarantiFilter, searchTerm, sortField, sortOrder]);

  // Tekil Araçlar Listesi (Vehicles view)
  const vehicleList = useMemo(() => {
    const vehicleMap = new Map<string, {
      plaka: string;
      marka: string;
      model: string;
      modelYili: number;
      aracYasi: number;
      km: number;
      garantiDurumu: GarantiDurumu;
      garantiNedeni: string;
      filoAdi: string;
      servisIsmi: string;
      totalCiro: number;
      kayitSayisi: number;
      records: ProcessedRecord[];
    }>();

    enrichedData.forEach(r => {
      const plk = r.plaka || `PLK-${r.satirNo}`;
      if (!vehicleMap.has(plk)) {
        vehicleMap.set(plk, {
          plaka: plk,
          marka: r.aracMarka || 'Diğer Marka',
          model: r.aracModel || 'Genel Model',
          modelYili: r.modelYili || 2023,
          aracYasi: r.aracYasi || 1,
          km: r.km || 0,
          garantiDurumu: r.garantiDurumu || 'Garanti İçi',
          garantiNedeni: r.garantiNedeni || '',
          filoAdi: r.filoAdi || 'Belirtilmemiş',
          servisIsmi: r.servisIsmi || 'Servis',
          totalCiro: 0,
          kayitSayisi: 0,
          records: []
        });
      }

      const v = vehicleMap.get(plk)!;
      v.totalCiro += (r.tutar || 0);
      v.kayitSayisi++;
      v.records.push(r);
      // En güncel KM ve Yıl
      if (r.km && r.km > v.km) v.km = r.km;
    });

    return Array.from(vehicleMap.values()).filter(v => {
      if (selectedGarantiFilter === 'GARANTI_ICI' && v.garantiDurumu !== 'Garanti İçi') return false;
      if (selectedGarantiFilter === 'GARANTI_DISI' && v.garantiDurumu !== 'Garanti Dışı') return false;
      if (selectedMarka !== 'ALL' && v.marka !== selectedMarka) return false;
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        if (!v.plaka.toLowerCase().includes(q) && 
            !v.marka.toLowerCase().includes(q) && 
            !v.model.toLowerCase().includes(q) && 
            !v.filoAdi.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => b.totalCiro - a.totalCiro);
  }, [enrichedData, selectedGarantiFilter, selectedMarka, searchTerm]);

  // Seçilen Aracın Detay Modalı İçin Kayıtlar
  const selectedVehicleData = useMemo(() => {
    if (!selectedVehicleModal) return null;
    return vehicleList.find(v => v.plaka === selectedVehicleModal) || null;
  }, [selectedVehicleModal, vehicleList]);

  // CSV Dışa Aktarma
  const exportToCSV = () => {
    let headers = '';
    let rows: string[] = [];

    if (activeSubTab === 'brand') {
      headers = 'Marka,Toplam Araç,Toplam Ciro (TL),Garanti İçi Araç,Garanti İçi Ciro (TL),Garanti İçi %,Garanti Dışı Araç,Garanti Dışı Ciro (TL),Garanti Dışı %,Ortalama KM,Ortalama Yaş\n';
      rows = brandWarrantyStats.map(b => 
        `"${b.marka}",${b.aracSayisi},${b.totalCiro},${b.garantiIciVehicles},${b.garantiIciCiro},${b.garantiIciOran.toFixed(1)}%,${b.garantiDisiVehicles},${b.garantiDisiCiro},${b.garantiDisiOran.toFixed(1)}%,${b.avgKm},${b.avgAge}`
      );
    } else if (activeSubTab === 'brand-model') {
      headers = 'Marka,Model,Model Yılları,Toplam Araç,Toplam Ciro (TL),Garanti İçi Araç,Garanti İçi Ciro (TL),Garanti İçi %,Garanti Dışı Araç,Garanti Dışı Ciro (TL),Garanti Dışı %,Ortalama KM,Hakim İşlem\n';
      rows = brandModelWarrantyStats.map(bm => 
        `"${bm.marka}","${bm.model}","${bm.yearsText}",${bm.aracSayisi},${bm.totalCiro},${bm.garantiIciVehicles},${bm.garantiIciCiro},${bm.garantiIciOran.toFixed(1)}%,${bm.garantiDisiVehicles},${bm.garantiDisiCiro},${bm.garantiDisiOran.toFixed(1)}%,${bm.avgKm},"${bm.dominantIslem}"`
      );
    } else {
      headers = 'Plaka,Marka,Model,Model Yılı,Araç Yaşı,KM,Garanti Durumu,Garanti Nedeni,Filo Adı,Servis İsmi,Toplam Ciro (TL),İşlem Sayısı\n';
      rows = vehicleList.map(v => 
        `"${v.plaka}","${v.marka}","${v.model}",${v.modelYili},${v.aracYasi},${v.km},"${v.garantiDurumu}","${v.garantiNedeni}","${v.filoAdi}","${v.servisIsmi}",${v.totalCiro},${v.kayitSayisi}`
      );
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + headers + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Garanti_Analiz_Raporu_${activeSubTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pasta Grafiği Renkleri
  const pieData = [
    { name: 'Garanti İçi Araçlar', value: overallStats.garantiIciCiro, count: overallStats.garantiIciVehicles, color: '#10B981' },
    { name: 'Garanti Dışı Araçlar', value: overallStats.garantiDisiCiro, count: overallStats.garantiDisiVehicles, color: '#EF4444' }
  ];

  // Garanti Dışına Çıkma Nedenleri Verisi
  const reasonsData = [
    { name: 'KM Aşımı (>60k KM)', ciro: overallStats.reasons.kmAsimi.ciro, count: overallStats.reasons.kmAsimi.count, fill: '#F59E0B' },
    { name: 'Yaş Aşımı (>2 Yıl)', ciro: overallStats.reasons.yasAsimi.ciro, count: overallStats.reasons.yasAsimi.count, fill: '#3B82F6' },
    { name: 'Hem Yaş Hem KM Aşımı', ciro: overallStats.reasons.both.ciro, count: overallStats.reasons.both.count, fill: '#EF4444' }
  ];

  return (
    <div id="warranty-analysis-root" className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. ÜST BİLGİLENDİRME & KURAL TANIMI BANNER'I */}
      <div id="warranty-rule-banner" className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Resmi Garanti Kriteri Tanımlandı</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Araç Garanti İçi / Dışı Analiz Paneli</span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              <strong className="text-amber-300">Garanti Kuralı:</strong> Araç garantisi üretildiği yıldan itibaren <strong className="text-white underline decoration-emerald-400 font-bold">2 yıldır</strong> veya <strong className="text-white underline decoration-emerald-400 font-bold">60.000 KM</strong>'dir. Yaşı 2 yıldan büyük veya kilometresi 60.000 km'yi aşan araçlar <span className="text-rose-300 font-semibold">Garanti Dışı</span> olarak sınıflandırılır.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto self-end lg:self-center">
            <button
              onClick={exportToCSV}
              id="export-warranty-csv-btn"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/20 backdrop-blur transition-all shadow-sm w-full sm:w-auto"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Raporu Dışa Aktar (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. ANALİZ MODU SEKME SEÇİCİ (Görseldeki 3 Ana Analiz + Araç Listesi) */}
      <div id="warranty-tab-selectors" className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveSubTab('overall')}
            id="tab-btn-overall"
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'overall'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            <span>1. Tüm Araçlar (Toplam Sayı & Ciro)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('brand')}
            id="tab-btn-brand"
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'brand'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>2. Araç Markası Bazında</span>
          </button>

          <button
            onClick={() => setActiveSubTab('brand-model')}
            id="tab-btn-brand-model"
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'brand-model'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. Araç Marka-Model Bazında</span>
          </button>

          <button
            onClick={() => setActiveSubTab('vehicles')}
            id="tab-btn-vehicles"
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'vehicles'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Tekil Araç & Plaka Dökümü</span>
          </button>
        </div>

        {/* Garanti Durumu Hızlı Filtre Butonları */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setSelectedGarantiFilter('ALL')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              selectedGarantiFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setSelectedGarantiFilter('GARANTI_ICI')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
              selectedGarantiFilter === 'GARANTI_ICI' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Garanti İçi</span>
          </button>
          <button
            onClick={() => setSelectedGarantiFilter('GARANTI_DISI')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
              selectedGarantiFilter === 'GARANTI_DISI' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Garanti Dışı</span>
          </button>
        </div>
      </div>

      {/* 3. ARAMA & MARKA FİLTRE ÇUBUĞU */}
      <div id="warranty-filter-bar" className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Plaka, marka, model, filo veya servis adı ile arayın..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div>
          <select
            value={selectedMarka}
            onChange={(e) => setSelectedMarka(e.target.value)}
            className="w-full py-2 px-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="ALL">Tüm Araç Markaları ({availableBrands.length})</option>
            {availableBrands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. KPI ÖZET KARTLARI (GÖRSELDEKİ ROW 1: TÜM ARAÇLAR İÇİNDEKİ TOPLAM SAYI VE CİROLAR) */}
      <div id="warranty-kpi-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Kart 1: Garanti İçi Araçlar */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Garanti İçi Araçlar</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-200/80 text-emerald-800">
              %{overallStats.garantiIciVehiclesPct.toFixed(1)} Pay
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950">
            {formatNumber(overallStats.garantiIciVehicles)} <span className="text-xs font-medium text-emerald-700">Araç</span>
          </div>
          <div className="mt-2 text-sm font-bold text-emerald-800">
            {formatCurrency(overallStats.garantiIciCiro)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 flex items-center justify-between">
            <span>Ortalama Araç Başı:</span>
            <span className="font-semibold">{formatCurrency(overallStats.avgCiroPerVehicleIci)}</span>
          </div>
        </div>

        {/* Kart 2: Garanti Dışı Araçlar */}
        <div className="bg-gradient-to-br from-rose-50 to-rose-100/40 p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Garanti Dışı Araçlar</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-200/80 text-rose-800">
              %{overallStats.garantiDisiVehiclesPct.toFixed(1)} Pay
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-950">
            {formatNumber(overallStats.garantiDisiVehicles)} <span className="text-xs font-medium text-rose-700">Araç</span>
          </div>
          <div className="mt-2 text-sm font-bold text-rose-800">
            {formatCurrency(overallStats.garantiDisiCiro)}
          </div>
          <div className="mt-1 text-[11px] text-rose-600 flex items-center justify-between">
            <span>Ortalama Araç Başı:</span>
            <span className="font-semibold">{formatCurrency(overallStats.avgCiroPerVehicleDisi)}</span>
          </div>
        </div>

        {/* Kart 3: Toplam Ciro Payı */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-blue-600" />
              <span>Toplam Filo Cirosu</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">{formatNumber(overallStats.totalRecords)} Kalem</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {formatCurrency(overallStats.totalCiro)}
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2.5 flex overflow-hidden">
            <div 
              style={{ width: `${overallStats.garantiIciCiroPct}%` }} 
              className="bg-emerald-500 h-full" 
              title={`Garanti İçi Ciro: %${overallStats.garantiIciCiroPct.toFixed(1)}`}
            />
            <div 
              style={{ width: `${overallStats.garantiDisiCiroPct}%` }} 
              className="bg-rose-500 h-full" 
              title={`Garanti Dışı Ciro: %${overallStats.garantiDisiCiroPct.toFixed(1)}`}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 font-medium">
            <span className="text-emerald-700">İçi: %{overallStats.garantiIciCiroPct.toFixed(1)}</span>
            <span className="text-rose-700">Dışı: %{overallStats.garantiDisiCiroPct.toFixed(1)}</span>
          </div>
        </div>

        {/* Kart 4: Toplam Tekil Araç Portföyü */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-4 h-4 text-indigo-600" />
              <span>Toplam Tekil Araç</span>
            </span>
            <span className="text-xs text-indigo-600 font-bold">{availableBrands.length} Marka</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {formatNumber(overallStats.totalVehicles)} <span className="text-xs font-medium text-slate-500">Plaka</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
            <span>Garanti Kuralı:</span>
            <span className="font-bold text-indigo-700">≤3 Yıl veya ≤100k KM</span>
          </div>
        </div>

      </div>

      {/* 5. GÖRSELLEŞTİRME VE ALT TABLOLAR */}
      {activeSubTab === 'overall' && (
        <div id="section-overall-details" className="space-y-6">
          
          {/* Görsel Tablo 1: Tüm Araçlar İçindeki Toplam Sayı ve Cirolar Karşılaştırma Tablosu */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>1. Tablo: Tüm Araçlar İçindeki Toplam Garanti İçi / Dışı Sayı ve Cirolar</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Kullanıcı görselindeki 1. analizin detaylı sayısal dökümü</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px] sm:text-xs uppercase">
                    <th className="py-3 px-4">Garanti Statüsü</th>
                    <th className="py-3 px-4 text-right">Tekil Araç Sayısı</th>
                    <th className="py-3 px-4 text-right">Araç Dağılım Oranı</th>
                    <th className="py-3 px-4 text-right">İşlem / Fatura Kalemleri</th>
                    <th className="py-3 px-4 text-right">Toplam Ciro (₺)</th>
                    <th className="py-3 px-4 text-right">Ciro Payı (%)</th>
                    <th className="py-3 px-4 text-right">Araç Başı Ortalama Ciro</th>
                    <th className="py-3 px-4 text-center">Ana Neden / Kriter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-emerald-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Garanti İçi Araçlar</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      {formatNumber(overallStats.garantiIciVehicles)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                      %{overallStats.garantiIciVehiclesPct.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      {formatNumber(overallStats.garantiIciKayitSayisi)} adet
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-800">
                      {formatCurrency(overallStats.garantiIciCiro)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                      %{overallStats.garantiIciCiroPct.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                      {formatCurrency(overallStats.avgCiroPerVehicleIci)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        ≤ 2 Yaş ve ≤ 60.000 KM
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-rose-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-rose-700 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Garanti Dışı Araçlar</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      {formatNumber(overallStats.garantiDisiVehicles)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-700">
                      %{overallStats.garantiDisiVehiclesPct.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      {formatNumber(overallStats.garantiDisiKayitSayisi)} adet
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-rose-800">
                      {formatCurrency(overallStats.garantiDisiCiro)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-700">
                      %{overallStats.garantiDisiCiroPct.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                      {formatCurrency(overallStats.avgCiroPerVehicleDisi)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        &gt; 2 Yaş veya &gt; 60.000 KM
                      </span>
                    </td>
                  </tr>

                  {/* Toplam Satırı */}
                  <tr className="bg-slate-50/90 font-bold border-t-2 border-slate-200">
                    <td className="py-3.5 px-4 text-slate-900">Genel Toplam</td>
                    <td className="py-3.5 px-4 text-right text-slate-900">{formatNumber(overallStats.totalVehicles)}</td>
                    <td className="py-3.5 px-4 text-right text-slate-900">%100.0</td>
                    <td className="py-3.5 px-4 text-right text-slate-900">{formatNumber(overallStats.totalRecords)} adet</td>
                    <td className="py-3.5 px-4 text-right text-blue-900">{formatCurrency(overallStats.totalCiro)}</td>
                    <td className="py-3.5 px-4 text-right text-slate-900">%100.0</td>
                    <td className="py-3.5 px-4 text-right text-slate-900">
                      {formatCurrency(overallStats.totalVehicles > 0 ? overallStats.totalCiro / overallStats.totalVehicles : 0)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs text-slate-500">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Grafik ve Nedenler Grid'i */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Grafik 1: Garanti İçi vs Dışı Ciro Dağılımı Donut */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-blue-600" />
                  <span>Garanti İçi vs Dışı Ciro Dağılımı</span>
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name}: %${((percent || 0) * 100).toFixed(0)}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Ciro']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grafik 2: Garanti Dışına Çıkma Nedenleri Dağılımı */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Garanti Dışına Çıkma Nedenleri Dağılımı</span>
                </h3>
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                  {formatNumber(overallStats.garantiDisiVehicles)} Araç
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reasonsData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-10} textAnchor="end" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k ₺`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Ciro']} />
                    <Bar dataKey="ciro" name="Toplam Ciro" radius={[6, 6, 0, 0]}>
                      {reasonsData.map((entry, index) => (
                        <Cell key={`reason-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* 4 İşlem Türü Bazında Garanti İçi vs Dışı Kıyaslaması */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>İşlem Türü Kırılımı (Bakım, Arıza, Hasar, Dış İşçilik) Bazında Garanti Durumu</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {['Bakım', 'Arıza', 'Hasar', 'Dış İşçilikler'].map((islem) => {
                const ici = overallStats.islemIci[islem] || { count: 0, ciro: 0 };
                const disi = overallStats.islemDisi[islem] || { count: 0, ciro: 0 };
                const totalIslemCiro = ici.ciro + disi.ciro;
                const iciPct = totalIslemCiro > 0 ? (ici.ciro / totalIslemCiro) * 100 : 0;

                return (
                  <div key={islem} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 text-sm">{islem}</span>
                      <span className="text-xs font-bold text-blue-700">{formatCurrency(totalIslemCiro)}</span>
                    </div>
                    
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-emerald-800 font-medium">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Garanti İçi:</span>
                        </span>
                        <span className="font-bold">{formatCurrency(ici.ciro)} (%{iciPct.toFixed(0)})</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-800 font-medium">
                        <span className="flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Garanti Dışı:</span>
                        </span>
                        <span className="font-bold">{formatCurrency(disi.ciro)} (%{(100 - iciPct).toFixed(0)})</span>
                      </div>
                    </div>

                    <div className="mt-2.5 w-full bg-slate-200 rounded-full h-1.5 flex overflow-hidden">
                      <div style={{ width: `${iciPct}%` }} className="bg-emerald-500 h-full" />
                      <div style={{ width: `${100 - iciPct}%` }} className="bg-rose-500 h-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* 6. ARAÇ MARKASI BAZINDA GARANTİ ANALİZİ (GÖRSELDEKİ ROW 2) */}
      {activeSubTab === 'brand' && (
        <div id="section-brand-warranty" className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Car className="w-5 h-5 text-blue-600" />
                  <span>2. Tablo: Araç Markası Bazında Garanti İçi / Dışı Toplam Sayı ve Cirolar</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Kullanıcı görselindeki 2. analiz: Marka bazlı garanti içi/dışı dağılımları</p>
              </div>

              {/* Sıralama Seçimi */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Sırala:</span>
                <select
                  value={sortField}
                  onChange={(e: any) => setSortField(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700"
                >
                  <option value="totalCiro">Toplam Ciro (₺)</option>
                  <option value="aracSayisi">Toplam Araç Sayısı</option>
                  <option value="garantiIciCiro">Garanti İçi Ciro</option>
                  <option value="garantiDisiCiro">Garanti Dışı Ciro</option>
                  <option value="garantiIciOran">Garanti İçi Oranı (%)</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="p-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700"
                  title="Sıralama Yönü Değiştir"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px] sm:text-xs uppercase">
                    <th className="py-3 px-4">Araç Markası</th>
                    <th className="py-3 px-4 text-right">Toplam Araç</th>
                    <th className="py-3 px-4 text-right">Toplam Ciro (₺)</th>
                    <th className="py-3 px-4 text-center bg-emerald-50/60 text-emerald-800">Garanti İçi Araç</th>
                    <th className="py-3 px-4 text-right bg-emerald-50/60 text-emerald-800">Garanti İçi Ciro (₺)</th>
                    <th className="py-3 px-4 text-right bg-emerald-50/60 text-emerald-800">Garanti İçi %</th>
                    <th className="py-3 px-4 text-center bg-rose-50/60 text-rose-800">Garanti Dışı Araç</th>
                    <th className="py-3 px-4 text-right bg-rose-50/60 text-rose-800">Garanti Dışı Ciro (₺)</th>
                    <th className="py-3 px-4 text-right bg-rose-50/60 text-rose-800">Garanti Dışı %</th>
                    <th className="py-3 px-4 text-right">Ort. KM</th>
                    <th className="py-3 px-4 text-center">Dağılım Oranı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brandWarrantyStats.map((b) => (
                    <tr key={b.marka} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <span>{b.marka}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({b.modelCount} Model)</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        {formatNumber(b.aracSayisi)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-blue-900">
                        {formatCurrency(b.totalCiro)}
                      </td>

                      {/* Garanti İçi */}
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700 bg-emerald-50/30">
                        {b.garantiIciVehicles > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {formatNumber(b.garantiIciVehicles)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-800 bg-emerald-50/30">
                        {formatCurrency(b.garantiIciCiro)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700 bg-emerald-50/30">
                        %{b.garantiIciOran.toFixed(1)}
                      </td>

                      {/* Garanti Dışı */}
                      <td className="py-3.5 px-4 text-center font-bold text-rose-700 bg-rose-50/30">
                        {b.garantiDisiVehicles > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            {formatNumber(b.garantiDisiVehicles)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-800 bg-rose-50/30">
                        {formatCurrency(b.garantiDisiCiro)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-700 bg-rose-50/30">
                        %{b.garantiDisiOran.toFixed(1)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-600">
                        {formatNumber(b.avgKm)} KM
                      </td>

                      {/* Dağılım Çubuğu */}
                      <td className="py-3.5 px-4 text-center min-w-[120px]">
                        <div className="w-full bg-slate-200 rounded-full h-2 flex overflow-hidden">
                          <div style={{ width: `${b.garantiIciOran}%` }} className="bg-emerald-500 h-full" title={`Garanti İçi: %${b.garantiIciOran.toFixed(1)}`} />
                          <div style={{ width: `${b.garantiDisiOran}%` }} className="bg-rose-500 h-full" title={`Garanti Dışı: %${b.garantiDisiOran.toFixed(1)}`} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. ARAÇ MARKA-MODEL BAZINDA GARANTİ ANALİZİ (GÖRSELDEKİ ROW 3) */}
      {activeSubTab === 'brand-model' && (
        <div id="section-brand-model-warranty" className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <span>3. Tablo: Araç Marka-Model Bazında Garanti İçi / Dışı Toplam Sayı ve Cirolar</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Kullanıcı görselindeki 3. analiz: Model yılından arındırılmış saf modellerin garanti dağılımı</p>
              </div>

              <div className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                Toplam {brandModelWarrantyStats.length} Model Listelendi
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px] sm:text-xs uppercase">
                    <th className="py-3 px-4">Araç Markası</th>
                    <th className="py-3 px-4">Araç Modeli</th>
                    <th className="py-3 px-4 text-center">Model Yılları</th>
                    <th className="py-3 px-4 text-right">Toplam Araç</th>
                    <th className="py-3 px-4 text-right">Toplam Ciro (₺)</th>
                    <th className="py-3 px-4 text-center bg-emerald-50/60 text-emerald-800">Garanti İçi Araç</th>
                    <th className="py-3 px-4 text-right bg-emerald-50/60 text-emerald-800">Garanti İçi Ciro (₺)</th>
                    <th className="py-3 px-4 text-center bg-rose-50/60 text-rose-800">Garanti Dışı Araç</th>
                    <th className="py-3 px-4 text-right bg-rose-50/60 text-rose-800">Garanti Dışı Ciro (₺)</th>
                    <th className="py-3 px-4 text-right">Ort. KM</th>
                    <th className="py-3 px-4 text-center">Hakim İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brandModelWarrantyStats.map((bm) => (
                    <tr key={bm.key} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {bm.marka}
                      </td>
                      <td className="py-3.5 px-4 font-black text-indigo-950">
                        {bm.model}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs text-slate-600 font-medium">
                        {bm.yearsText}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatNumber(bm.aracSayisi)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-blue-900">
                        {formatCurrency(bm.totalCiro)}
                      </td>

                      {/* Garanti İçi */}
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700 bg-emerald-50/30">
                        {bm.garantiIciVehicles > 0 ? (
                          <span className="inline-flex items-center gap-1 font-black">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {formatNumber(bm.garantiIciVehicles)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-800 bg-emerald-50/30">
                        {formatCurrency(bm.garantiIciCiro)}
                      </td>

                      {/* Garanti Dışı */}
                      <td className="py-3.5 px-4 text-center font-bold text-rose-700 bg-rose-50/30">
                        {bm.garantiDisiVehicles > 0 ? (
                          <span className="inline-flex items-center gap-1 font-black">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            {formatNumber(bm.garantiDisiVehicles)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-800 bg-rose-50/30">
                        {formatCurrency(bm.garantiDisiCiro)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                        {formatNumber(bm.avgKm)} KM
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          bm.dominantIslem === 'Bakım' ? 'bg-blue-100 text-blue-800' :
                          bm.dominantIslem === 'Arıza' ? 'bg-amber-100 text-amber-800' :
                          bm.dominantIslem === 'Hasar' ? 'bg-rose-100 text-rose-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {bm.dominantIslem}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. TEKİL ARAÇ VE PLAKA DÖKÜMÜ (Plaka Detayları & Neden İnceleme) */}
      {activeSubTab === 'vehicles' && (
        <div id="section-vehicles-warranty" className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <span>Plaka Bazlı Araç Garanti Dökümü & Durum İncelemesi</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Her aracın model yılı, KM'si ve garanti içi/dışı olma sebebi</p>
              </div>
              <div className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                {vehicleList.length} Araç Bulundu
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px] sm:text-xs uppercase">
                    <th className="py-3 px-4">Plaka</th>
                    <th className="py-3 px-4">Marka & Model</th>
                    <th className="py-3 px-4 text-center">Model Yılı</th>
                    <th className="py-3 px-4 text-center">Araç Yaşı</th>
                    <th className="py-3 px-4 text-right">Son KM</th>
                    <th className="py-3 px-4 text-center">Garanti Durumu</th>
                    <th className="py-3 px-4">Garanti Gerekçesi</th>
                    <th className="py-3 px-4">Filo / Firma Adı</th>
                    <th className="py-3 px-4 text-right">Toplam Harcama (₺)</th>
                    <th className="py-3 px-4 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicleList.map((v) => (
                    <tr key={v.plaka} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 font-mono">
                          {v.plaka}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{v.marka}</div>
                        <div className="text-xs text-slate-500">{v.model}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {v.modelYili}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          v.aracYasi <= 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {v.aracYasi} Yaş
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                        {formatNumber(v.km)} KM
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          v.garantiDurumu === 'Garanti İçi' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {v.garantiDurumu === 'Garanti İçi' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>{v.garantiDurumu}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate" title={v.garantiNedeni}>
                        {v.garantiNedeni}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                        {v.filoAdi}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-blue-900">
                        {formatCurrency(v.totalCiro)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedVehicleModal(v.plaka)}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Detay
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

      {/* 9. ARAÇ DETAY MODALI */}
      {selectedVehicleData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Başlık */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-mono font-bold text-sm">
                  {selectedVehicleData.plaka.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <span>{selectedVehicleData.plaka}</span>
                    <span className="text-xs text-slate-300 font-normal">({selectedVehicleData.marka} {selectedVehicleData.model})</span>
                  </h3>
                  <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                    <span>Model Yılı: {selectedVehicleData.modelYili} ({selectedVehicleData.aracYasi} Yaş)</span>
                    <span>•</span>
                    <span>KM: {formatNumber(selectedVehicleData.km)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedVehicleModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Garanti Statü Bandı */}
            <div className={`p-4 border-b flex items-start gap-3 ${
              selectedVehicleData.garantiDurumu === 'Garanti İçi' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {selectedVehicleData.garantiDurumu === 'Garanti İçi' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs sm:text-sm">
                <div className="font-bold">Garanti Statüsü: {selectedVehicleData.garantiDurumu}</div>
                <div className="text-xs mt-0.5 opacity-90">{selectedVehicleData.garantiNedeni}</div>
              </div>
            </div>

            {/* Modal İçerik (Kayıtlar) */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Araca Ait İşlem ve Parça Geçmişi ({selectedVehicleData.records.length} Kalem)
              </div>
              
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {selectedVehicleData.records.map((r, idx) => (
                  <div key={idx} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{r.eslesenKatalog || r.orijinalKodAd}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-slate-700">{r.servisIsmi}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">{r.islemTuru || 'Bakım'}</span>
                        <span>•</span>
                        <span>{r.anaTurAd}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900">{formatCurrency(r.tutar || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Alt Kısım */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Firma / Filo: <strong className="text-slate-800">{selectedVehicleData.filoAdi}</strong>
              </div>
              <div className="text-sm font-black text-blue-900">
                Toplam: {formatCurrency(selectedVehicleData.totalCiro)}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
