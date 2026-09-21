import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Play, Database, MapPin, Building, ShieldCheck, Trash2, RefreshCw, Zap, Cpu } from 'lucide-react';
import { saveFileToIDB, getFileFromIDB, removeFileFromIDB, saveDataToIDB, getDataFromIDB } from '../lib/idb';
import { parseServisLocationFile, ServisLocationRecord, ProcessProgress } from '../lib/engine';

interface FileState {
  filo: File | null;
  bosch: File | null;
  diger: File | null;
}

interface ServisMatrixInfo {
  fileName: string;
  totalCount: number;
  sehirCount: number;
  bolgeCount: number;
  savedAt: string;
  sampleCities: string[];
}

interface UploaderProps {
  onProcessFiles: (filo: File, bosch: File, diger: File, onProgress?: (p: ProcessProgress) => void) => Promise<void>;
}

export default function Uploader({ onProcessFiles }: UploaderProps) {
  const [files, setFiles] = useState<FileState>({ filo: null, bosch: null, diger: null });
  const [isDragging, setIsDragging] = useState<keyof FileState | 'servis' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState<ProcessProgress | null>(null);
  const [catalogCacheStatus, setCatalogCacheStatus] = useState<{ bosch: boolean; diger: boolean }>({ bosch: false, diger: false });
  
  // Servis şehir ve bölge dosyası state'i
  const [servisMatrixFile, setServisMatrixFile] = useState<File | null>(null);
  const [servisMatrixInfo, setServisMatrixInfo] = useState<ServisMatrixInfo | null>(null);
  const [isSavingServis, setIsSavingServis] = useState(false);

  const fileInputRefs = {
    filo: useRef<HTMLInputElement>(null),
    bosch: useRef<HTMLInputElement>(null),
    diger: useRef<HTMLInputElement>(null),
    servis: useRef<HTMLInputElement>(null),
  };

  // Açılışta daha önce kaydedilmiş Bosch ve Diğer katalogları ile Servis Şehir dosyasını hafızadan yükle
  useEffect(() => {
    async function loadPersistedData() {
      try {
        const [savedBosch, savedDiger, savedServis, savedServisData] = await Promise.all([
          getFileFromIDB('bosch_catalog'),
          getFileFromIDB('diger_catalog'),
          getFileFromIDB('servis_bolge_file'),
          getDataFromIDB<ServisLocationRecord[]>('servis_locations_data')
        ]);

        if (savedBosch || savedDiger) {
          setFiles(prev => ({
            ...prev,
            bosch: savedBosch || prev.bosch,
            diger: savedDiger || prev.diger
          }));
          setCatalogCacheStatus({
            bosch: !!savedBosch,
            diger: !!savedDiger
          });
        }

        if (savedServis) {
          setServisMatrixFile(savedServis);
        }

        if (savedServisData && savedServisData.length > 0) {
          const sehirler = new Set(savedServisData.map(s => s.sehir).filter(Boolean));
          const bolgeler = new Set(savedServisData.map(s => s.bolge).filter(Boolean));
          setServisMatrixInfo({
            fileName: savedServis?.name || 'servis_sehir_bolge.xlsx',
            totalCount: savedServisData.length,
            sehirCount: sehirler.size,
            bolgeCount: bolgeler.size,
            savedAt: new Date().toLocaleDateString('tr-TR'),
            sampleCities: Array.from(sehirler).slice(0, 5)
          });
        }
      } catch (err) {
        console.warn('Hafızadan katalog yüklenirken hata oluştu:', err);
      }
    }

    loadPersistedData();
  }, []);

  const updateFile = async (type: keyof FileState, file: File | null) => {
    setFiles((prev) => ({ ...prev, [type]: file }));
    if (type === 'bosch') {
      if (file) {
        await saveFileToIDB('bosch_catalog', file);
        setCatalogCacheStatus(prev => ({ ...prev, bosch: true }));
      } else {
        await removeFileFromIDB('bosch_catalog');
        setCatalogCacheStatus(prev => ({ ...prev, bosch: false }));
      }
    } else if (type === 'diger') {
      if (file) {
        await saveFileToIDB('diger_catalog', file);
        setCatalogCacheStatus(prev => ({ ...prev, diger: true }));
      } else {
        await removeFileFromIDB('diger_catalog');
        setCatalogCacheStatus(prev => ({ ...prev, diger: false }));
      }
    }
  };

  // Servis şehir ve bölgeleri dosyasını işle ve hafızada kalıcı olarak sakla
  const handleServisLocationUpload = async (file: File) => {
    setIsSavingServis(true);
    try {
      const parsedRecords = await parseServisLocationFile(file);
      await saveFileToIDB('servis_bolge_file', file);
      await saveDataToIDB('servis_locations_data', parsedRecords);

      const sehirler = new Set(parsedRecords.map(s => s.sehir).filter(Boolean));
      const bolgeler = new Set(parsedRecords.map(s => s.bolge).filter(Boolean));

      setServisMatrixFile(file);
      setServisMatrixInfo({
        fileName: file.name,
        totalCount: parsedRecords.length,
        sehirCount: sehirler.size,
        bolgeCount: bolgeler.size,
        savedAt: new Date().toLocaleDateString('tr-TR'),
        sampleCities: Array.from(sehirler).slice(0, 5)
      });
    } catch (error) {
      console.error('Servis dosyasını kaydederken hata:', error);
      alert('Servis şehir ve bölge dosyası kaydedilirken bir hata oluştu.');
    } finally {
      setIsSavingServis(false);
    }
  };

  const clearServisLocationData = async () => {
    await removeFileFromIDB('servis_bolge_file');
    await saveDataToIDB('servis_locations_data', []);
    setServisMatrixFile(null);
    setServisMatrixInfo(null);
  };

  const handleDragOver = (e: React.DragEvent, type: keyof FileState | 'servis') => {
    e.preventDefault();
    setIsDragging(type);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(null);
  };

  const handleDrop = async (e: React.DragEvent, type: keyof FileState | 'servis') => {
    e.preventDefault();
    setIsDragging(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (type === 'servis') {
        await handleServisLocationUpload(file);
      } else {
        await updateFile(type, file);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: keyof FileState | 'servis') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (type === 'servis') {
        await handleServisLocationUpload(file);
      } else {
        await updateFile(type, file);
      }
    }
  };

  const handleProcess = async () => {
    if (!files.filo || !files.bosch || !files.diger) return;
    
    setIsProcessing(true);
    setProcessProgress({ percent: 5, current: 0, total: 100, stage: 'Dosyalar okunuyor...' });
    try {
      await onProcessFiles(files.filo, files.bosch, files.diger, (p) => {
        setProcessProgress(p);
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isAllFilesUploaded = files.filo && files.bosch && files.diger;

  const UploadZone = ({ title, desc, type, isCached }: { title: string; desc: string; type: keyof FileState; isCached?: boolean }) => (
    <div
      className={`relative p-6 border-2 border-dashed rounded-xl transition-all duration-200 ${
        isDragging === type ? 'border-blue-500 bg-blue-50' : 
        files[type] ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
      }`}
      onDragOver={(e) => handleDragOver(e, type)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, type)}
    >
      <input
        type="file"
        ref={fileInputRefs[type]}
        className="hidden"
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        onChange={(e) => handleFileChange(e, type)}
      />
      <div className="flex flex-col items-center justify-center text-center">
        {files[type] ? (
          <>
            <div className="bg-emerald-100 p-3 rounded-full mb-3 relative">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              {isCached && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600"></span>
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span>{title} Hazır</span>
              {isCached && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Hafızada Kayıtlı
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-600 mt-1 font-medium truncate max-w-[220px]">{files[type]?.name}</p>
            <div className="flex items-center gap-3 mt-3">
              <button 
                onClick={() => fileInputRefs[type].current?.click()}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Değiştir
              </button>
              <span className="text-slate-300">|</span>
              <button 
                onClick={() => updateFile(type, null)}
                className="text-xs font-semibold text-rose-500 hover:text-rose-700"
              >
                Kaldır
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-blue-100 p-3 rounded-full mb-3 cursor-pointer" onClick={() => fileInputRefs[type].current?.click()}>
              <UploadCloud className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{desc}</p>
            <button
              onClick={() => fileInputRefs[type].current?.click()}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Dosya Seç veya Sürükle
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Ana Katalog & Filo Eşleştirme Kartı */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              Yedek Parça & Filo Dosyaları
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Bosch kataloğu ve Diğer markalar kataloğu <strong>otomatik olarak sistem hafızasında saklanır</strong>. Yeni analiz için yalnızca güncel <strong>Filo Yedek Parça</strong> tablosunu yüklemeniz yeterlidir.
            </p>
          </div>
          
          {(catalogCacheStatus.bosch || catalogCacheStatus.diger) && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bosch & Diğer Markalar Katalogları Hafızada Hazır</span>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <UploadZone 
              type="filo" 
              title="1. Filo Yedek Parça" 
              desc="Her yeni analizde yüklenecek ana filo parça hareket tablosu (P sütunu KM verisi)" 
            />
            <UploadZone 
              type="bosch" 
              title="2. Bosch Kataloğu" 
              desc="Bosch parça ve referans kataloğu (Hafızada saklanır)" 
              isCached={catalogCacheStatus.bosch}
            />
            <UploadZone 
              type="diger" 
              title="3. Diğer Markalar" 
              desc="Bosch dışı diğer marka parça referans kataloğu (Hafızada saklanır)" 
              isCached={catalogCacheStatus.diger}
            />
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100">
            {isProcessing ? (
              <div className="w-full max-w-xl space-y-4 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                    {processProgress?.stage || 'Büyük veri seti taranıyor ve analiz ediliyor...'}
                  </span>
                  <span className="font-bold text-blue-600 font-mono">
                    %{processProgress?.percent ?? 10}
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden p-0.5 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300 relative"
                    style={{ width: `${Math.max(5, processProgress?.percent ?? 10)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] rounded-full" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-slate-400" />
                    <span>Yüksek Hızlı Akış & Bellek Optimizasyonu Aktif</span>
                  </span>
                  {processProgress && processProgress.total > 0 && (
                    <span className="font-medium text-slate-600">
                      {processProgress.current.toLocaleString('tr-TR')} / {processProgress.total.toLocaleString('tr-TR')} satır
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <>
                {!isAllFilesUploaded ? (
                  <div className="flex items-center gap-2 text-amber-600 mb-4 text-center">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">
                      {!files.filo ? 'Lütfen analizi yapılacak "Filo Yedek Parça" tablosunu yükleyin.' : 'Kataloglar eksik, lütfen ilgili katalog dosyasını yükleyin.'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-700 mb-4 text-center">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                    <span className="text-sm font-semibold">Tüm veri setleri ve kataloglar hazır! Analizi başlatabilirsiniz.</span>
                  </div>
                )}
                
                <button
                  onClick={handleProcess}
                  disabled={!isAllFilesUploaded || isProcessing}
                  className={`flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all shadow-sm ${
                    isAllFilesUploaded && !isProcessing
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Analizi Başlat</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tek Seferlik Servis Şehirleri ve Bölgeleri Matrisi Kartı */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Servislerin Şehirleri ve Bölgeleri Matrisi
              </h2>
              <p className="text-sm text-slate-500">
                Tek seferlik yükleyeceğiniz servis lokasyon, il ve bölge eşleme dosyası. Sistem bu verileri kalıcı olarak kaydeder ve sonraki talimatlarınız için hazır tutar.
              </p>
            </div>
          </div>

          {servisMatrixInfo && (
            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-800 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>{servisMatrixInfo.totalCount} Servis Kayıtlı</span>
            </div>
          )}
        </div>

        <div className="p-6">
          <input
            type="file"
            ref={fileInputRefs.servis}
            className="hidden"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={(e) => handleFileChange(e, 'servis')}
          />

          {servisMatrixInfo ? (
            <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/40 rounded-xl p-5 border border-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-semibold text-slate-800">
                    Servis Şehir ve Bölge Verisi Başarıyla Kaydedildi
                  </h4>
                  <span className="text-[11px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                    Hafızada Hazır
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Dosya: <span className="font-semibold text-slate-800">{servisMatrixInfo.fileName}</span> &bull; 
                  Toplam <span className="font-semibold text-indigo-700">{servisMatrixInfo.totalCount} Servis</span>, <span className="font-semibold text-indigo-700">{servisMatrixInfo.sehirCount} Şehir</span>, <span className="font-semibold text-indigo-700">{servisMatrixInfo.bolgeCount} Bölge</span> verisi sisteme güvenle işlendi.
                </p>
                {servisMatrixInfo.sampleCities && servisMatrixInfo.sampleCities.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">Örnek İller:</span>
                    {servisMatrixInfo.sampleCities.map((c, i) => (
                      <span key={i} className="text-[11px] bg-white border border-indigo-100 text-slate-700 px-2 py-0.5 rounded shadow-xs">
                        {c}
                      </span>
                    ))}
                    {servisMatrixInfo.sehirCount > 5 && (
                      <span className="text-[11px] text-slate-400">+{servisMatrixInfo.sehirCount - 5} daha</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => fileInputRefs.servis.current?.click()}
                  disabled={isSavingServis}
                  className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-50 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSavingServis ? 'animate-spin' : ''}`} />
                  <span>Dosyayı Yenile</span>
                </button>
                <button
                  onClick={clearServisLocationData}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-white"
                  title="Kaydı Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`p-6 border-2 border-dashed rounded-xl transition-all duration-200 flex flex-col items-center justify-center text-center ${
                isDragging === 'servis' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/70'
              }`}
              onDragOver={(e) => handleDragOver(e, 'servis')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'servis')}
            >
              <div className="bg-indigo-100 p-3 rounded-full mb-3 cursor-pointer" onClick={() => fileInputRefs.servis.current?.click()}>
                <MapPin className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Servislerin Şehir ve Bölge Tablosunu Yükleyin</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4 max-w-md">
                Servis İsimleri / Kodları, İl / Şehir ve Bölge sütunlarını içeren Excel veya CSV dosyanızı buraya bırakın. Sistem otomatik okuyup hafızasında tutacaktır.
              </p>
              <button
                onClick={() => fileInputRefs.servis.current?.click()}
                disabled={isSavingServis}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
              >
                {isSavingServis ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Servis Şehir & Bölge Dosyası Seç</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

