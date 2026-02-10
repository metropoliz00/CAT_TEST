import React, { useState, useEffect } from 'react';
import { FileQuestion, Download, Upload, Loader2, Plus, Edit, Trash2, X, Save, Image as ImageIcon, CheckCircle2, ChevronDown, ChevronUp, Settings, AlertCircle, Type } from 'lucide-react';
import { api } from '../../services/api';
import { QuestionRow } from '../../types';
import * as XLSX from 'xlsx';

const BankSoalTab = () => {
    const [subjects, setSubjects] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [questions, setQuestions] = useState<QuestionRow[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [currentQ, setCurrentQ] = useState<QuestionRow | null>(null);
    const [importing, setImporting] = useState(false);
    const [expandedQ, setExpandedQ] = useState<string | null>(null);
    
    // Subject Config State
    const [maxQuestionsLimit, setMaxQuestionsLimit] = useState(0);
    const [savingConfig, setSavingConfig] = useState(false);

    useEffect(() => {
        const loadSubjects = async () => {
            const list = await api.getExams();
            let names = list.map(l => l.nama_ujian);
            
            // SORTING LOGIC: Matematika, IPA, IPS First
            const priority = ["Matematika", "IPA", "IPS"];
            names.sort((a, b) => {
                const idxA = priority.indexOf(a);
                const idxB = priority.indexOf(b);
                
                // If both are in priority list, sort by index
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                // If only A is in priority, A comes first
                if (idxA !== -1) return -1;
                // If only B is in priority, B comes first
                if (idxB !== -1) return 1;
                // Otherwise sort alphabetically
                return a.localeCompare(b);
            });

            setSubjects(names);
            if (names.length > 0) setSelectedSubject(names[0]);
        };
        loadSubjects();
    }, []);

    useEffect(() => {
        if (!selectedSubject) return;
        const loadQ = async () => {
            setLoadingData(true);
            try {
                const data = await api.getRawQuestions(selectedSubject);
                setQuestions(data);
                
                // Also get exam config
                const list = await api.getExams();
                const currentExam = list.find(e => e.nama_ujian === selectedSubject);
                if (currentExam) setMaxQuestionsLimit(currentExam.max_questions || 0);
            } catch(e) { console.error(e); }
            finally { setLoadingData(false); }
        };
        loadQ();
    }, [selectedSubject]);

    const handleEdit = (q: QuestionRow) => {
        setCurrentQ(q);
        setModalOpen(true);
    };

    const handleAddNew = () => {
        setCurrentQ({
            id: `Q${questions.length + 1}`,
            text_soal: '',
            tipe_soal: 'PG',
            gambar: '',
            keterangan_gambar: '',
            opsi_a: '',
            opsi_b: '',
            opsi_c: '',
            opsi_d: '',
            kunci_jawaban: '',
            bobot: 10
        });
        setModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm(`Yakin ingin menghapus soal ID: ${id}?`)) {
            setLoadingData(true);
            await api.deleteQuestion(selectedSubject, id);
            const data = await api.getRawQuestions(selectedSubject);
            setQuestions(data);
            setLoadingData(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentQ) return;
        setLoadingData(true);
        const finalQ = { ...currentQ, kunci_jawaban: currentQ.kunci_jawaban.toUpperCase() };
        await api.saveQuestion(selectedSubject, finalQ);
        const data = await api.getRawQuestions(selectedSubject);
        setQuestions(data);
        setModalOpen(false);
        setLoadingData(false);
    };
    
    const handleSaveConfig = async () => {
        setSavingConfig(true);
        try {
            await api.saveSubjectConfig(selectedSubject, maxQuestionsLimit);
            alert(`Konfigurasi ${selectedSubject} disimpan. Limit soal diupdate.`);
            setConfigModalOpen(false);
        } catch(e) {
            console.error(e);
            alert("Gagal menyimpan konfigurasi.");
        } finally {
            setSavingConfig(false);
        }
    }

    const downloadTemplate = () => {
        const row = [{
            "ID Soal": "Q1",
            "Teks Soal": "Berapakah hasil dari 1 + 1?",
            "Tipe Soal (PG/PGK/BS)": "PG",
            "Link Gambar": "",
            "Keterangan Gambar": "Opsional: Sumber atau deskripsi gambar",
            "Opsi A": "2",
            "Opsi B": "3",
            "Opsi C": "4",
            "Opsi D": "5",
            "Kunci Jawaban": "A",
            "Bobot": 10
        }];

        const ws = XLSX.utils.json_to_sheet(row);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Template_Soal_CBT.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setImporting(true);
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
                
                const parsedQuestions: QuestionRow[] = [];
                for (let i = 1; i < data.length; i++) {
                    const row: any = data[i];
                    if (!row[0]) continue;
                    
                    parsedQuestions.push({
                        id: String(row[0]),
                        text_soal: String(row[1] || ""),
                        tipe_soal: (String(row[2] || "PG").toUpperCase() as any),
                        gambar: String(row[3] || ""),
                        keterangan_gambar: String(row[4] || ""), // New Column
                        opsi_a: String(row[5] || ""),
                        opsi_b: String(row[6] || ""),
                        opsi_c: String(row[7] || ""),
                        opsi_d: String(row[8] || ""),
                        kunci_jawaban: String(row[9] || "").toUpperCase(),
                        bobot: Number(row[10] || 10)
                    });
                }

                if (parsedQuestions.length > 0) {
                     await api.importQuestions(selectedSubject, parsedQuestions);
                     alert(`Berhasil mengimpor ${parsedQuestions.length} soal.`);
                     setLoadingData(true);
                     const freshData = await api.getRawQuestions(selectedSubject);
                     setQuestions(freshData);
                     setLoadingData(false);
                } else {
                    alert("Tidak ada data soal yang ditemukan dalam file.");
                }

            } catch (err) {
                console.error(err);
                alert("Gagal membaca file Excel.");
            } finally {
                setImporting(false);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof QuestionRow) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { alert("Ukuran file terlalu besar. Maks 2MB"); return; }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const maxSize = 800; 
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
                    else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
                    
                    canvas.width = Math.floor(width); 
                    canvas.height = Math.floor(height);
                    
                    if (ctx) { 
                        ctx.fillStyle = "#FFFFFF"; 
                        ctx.fillRect(0, 0, canvas.width, canvas.height); 
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height); 
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); 
                        setCurrentQ(prev => prev ? ({ ...prev, [field]: dataUrl }) : null); 
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const isImage = (val: string) => val && (val.startsWith('data:image') || val.startsWith('http') || val.match(/\.(jpeg|jpg|gif|png)$/) != null);

    const renderOptionInput = (label: string, field: 'opsi_a' | 'opsi_b' | 'opsi_c' | 'opsi_d') => {
        if (!currentQ) return null;
        return (
            <div className="group">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">{label}</label>
                <div className="flex gap-2">
                    <div className="relative w-12 h-12 bg-slate-50 border-2 border-slate-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                         {isImage(currentQ[field]) ? (
                            <img src={currentQ[field]} alt="Preview" className="w-full h-full object-cover" />
                         ) : (
                            <span className="text-[10px] text-slate-300 font-bold">Txt</span>
                         )}
                    </div>
                    <input 
                        type="text" 
                        className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-colors text-xs" 
                        value={currentQ[field]} 
                        onChange={e => setCurrentQ({...currentQ, [field]: e.target.value})} 
                        placeholder="Teks jawaban atau Link/Upload Gambar..." 
                    />
                    <label className="bg-white border-2 border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 p-3 rounded-xl cursor-pointer transition flex items-center justify-center active:scale-95" title="Upload Gambar Opsi">
                        <Upload size={18}/>
                        <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => handleImageUpload(e, field)} />
                    </label>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 fade-in max-w-full mx-auto">
             {/* Header Control */}
             <div className="bg-white p-6 rounded-[1.5rem] shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-3.5 rounded-2xl shadow-lg shadow-indigo-200"><FileQuestion size={28}/></div>
                    <div>
                        <h3 className="font-black text-xl text-slate-800">Bank Soal</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Database Mapel:</span>
                            <select 
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1 outline-none cursor-pointer"
                                value={selectedSubject}
                                onChange={e => setSelectedSubject(e.target.value)}
                            >
                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            
                            {/* Visual Indicator for Config */}
                            {maxQuestionsLimit > 0 && (
                                <span className="bg-orange-50 text-orange-600 text-[10px] px-2 py-1 rounded-full font-bold border border-orange-100 flex items-center gap-1" title="Soal dibatasi">
                                    <AlertCircle size={10}/> Limit: {maxQuestionsLimit}
                                </span>
                            )}

                            <button onClick={() => setConfigModalOpen(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition border border-transparent hover:border-slate-100" title="Konfigurasi Mapel (Limit Soal)">
                                <Settings size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={downloadTemplate} className="bg-white text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition border-2 border-slate-200 active:scale-95">
                        <Download size={16}/> Template
                    </button>

                    <label className={`cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 active:scale-95 ${importing ? 'opacity-50 cursor-wait' : ''}`}>
                        {importing ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>} {importing ? "Importing..." : "Import Excel"}
                        <input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} disabled={importing} />
                    </label>

                    <button onClick={handleAddNew} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 active:scale-95">
                        <Plus size={16}/> Tambah Soal
                    </button>
                </div>
             </div>

             {/* Questions List */}
             <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[11px] tracking-wider">
                            <tr>
                                <th className="p-4 w-16 text-center">No</th>
                                <th className="p-4 w-24">ID</th>
                                <th className="p-4">Pertanyaan</th>
                                <th className="p-4 w-32">Tipe</th>
                                <th className="p-4 w-32 text-center">Kunci</th>
                                <th className="p-4 w-32 text-center">Bobot</th>
                                <th className="p-4 w-32 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loadingData ? (
                                <tr><td colSpan={7} className="p-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data soal...</td></tr>
                            ) : questions.length === 0 ? (
                                <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">Belum ada soal untuk mata pelajaran ini. Silakan tambah manual atau import Excel.</td></tr>
                            ) : questions.map((q, idx) => (
                                <React.Fragment key={q.id}>
                                    <tr className={`hover:bg-slate-50 transition ${expandedQ === q.id ? 'bg-slate-50' : ''}`}>
                                        <td className="p-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                                        <td className="p-4 font-mono text-xs text-slate-400 font-bold">{q.id}</td>
                                        <td className="p-4">
                                            <div className="flex items-start gap-3">
                                                {q.gambar && (
                                                    <div className="w-16 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                                        <img src={q.gambar} className="w-full h-full object-cover" alt="soal" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="line-clamp-2 font-medium text-slate-700">{q.text_soal || <span className="italic text-slate-300">Tanpa Teks</span>}</div>
                                                    {q.keterangan_gambar && (
                                                        <div className="text-[10px] text-blue-500 font-medium mt-1 flex items-center gap-1"><ImageIcon size={10}/> {q.keterangan_gambar}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <button onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)} className="text-[10px] text-indigo-500 font-bold mt-1 flex items-center gap-1 hover:underline">
                                                {expandedQ === q.id ? <>Sembunyikan Detail <ChevronUp size={12}/></> : <>Lihat Detail <ChevronDown size={12}/></>}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${q.tipe_soal === 'PG' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                                {q.tipe_soal}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-bold font-mono text-emerald-600 bg-emerald-50/30">{q.kunci_jawaban}</td>
                                        <td className="p-4 text-center font-bold text-slate-600">{q.bobot}</td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleEdit(q)} className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 hover:bg-amber-100 transition"><Edit size={14}/></button>
                                                <button onClick={() => handleDelete(q.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 hover:bg-rose-100 transition"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedQ === q.id && (
                                        <tr className="bg-slate-50/50">
                                            <td colSpan={7} className="p-4 pl-16">
                                                <div className="grid grid-cols-2 gap-4 text-xs">
                                                    <div className={`p-2 rounded border ${q.kunci_jawaban === 'A' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                                        <span className="font-bold mr-2">A.</span> {q.opsi_a}
                                                    </div>
                                                    <div className={`p-2 rounded border ${q.kunci_jawaban === 'B' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                                        <span className="font-bold mr-2">B.</span> {q.opsi_b}
                                                    </div>
                                                    <div className={`p-2 rounded border ${q.kunci_jawaban === 'C' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                                        <span className="font-bold mr-2">C.</span> {q.opsi_c}
                                                    </div>
                                                    <div className={`p-2 rounded border ${q.kunci_jawaban === 'D' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                                        <span className="font-bold mr-2">D.</span> {q.opsi_d}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>

             {/* Config Modal */}
             {configModalOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in">
                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 border border-white/20">
                         <div className="flex justify-between items-center mb-6">
                             <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Settings size={20} className="text-slate-600"/> Konfigurasi Mapel</h3>
                             <button onClick={() => setConfigModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                         </div>
                         <div className="space-y-4">
                             <div>
                                 <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Mata Pelajaran</label>
                                 <div className="font-bold text-slate-800 text-lg">{selectedSubject}</div>
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Limit Jumlah Soal Tampil</label>
                                 <input 
                                    type="number" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 text-center text-xl" 
                                    value={maxQuestionsLimit}
                                    onChange={(e) => setMaxQuestionsLimit(Number(e.target.value))}
                                 />
                                 <p className="text-[10px] text-slate-400 mt-1">Isi 0 untuk menampilkan semua soal.</p>
                             </div>
                             <div className="pt-2">
                                 <button onClick={handleSaveConfig} disabled={savingConfig} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex justify-center items-center gap-2">
                                     {savingConfig ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan Konfigurasi
                                 </button>
                             </div>
                         </div>
                     </div>
                 </div>
             )}

             {/* Edit/Add Modal */}
             {modalOpen && currentQ && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in">
                     <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-white/20">
                         <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-[2rem]">
                             <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                                 {currentQ.id.startsWith('Q') && !questions.find(q => q.id === currentQ.id) ? <Plus size={24} className="text-indigo-600"/> : <Edit size={24} className="text-amber-500"/>}
                                 {currentQ.id.startsWith('Q') && !questions.find(q => q.id === currentQ.id) ? 'Tambah Soal Baru' : 'Edit Soal'}
                             </h3>
                             <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={24} className="text-slate-400"/></button>
                         </div>
                         <div className="p-8 overflow-y-auto custom-scrollbar">
                             <form onSubmit={handleSave} className="space-y-6">
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                     <div className="md:col-span-2 space-y-4">
                                         <div className="group">
                                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Teks Soal</label>
                                             <textarea required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-colors min-h-[120px] text-sm" value={currentQ.text_soal} onChange={e => setCurrentQ({...currentQ, text_soal: e.target.value})} placeholder="Tulis pertanyaan disini..."></textarea>
                                         </div>
                                         <div className="group">
                                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Gambar Soal (Link / Upload)</label>
                                             <div className="flex gap-2">
                                                 <input type="text" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-colors text-sm" value={currentQ.gambar} onChange={e => setCurrentQ({...currentQ, gambar: e.target.value})} placeholder="https://... atau Upload" />
                                                 <label className="bg-indigo-50 text-indigo-600 border-2 border-indigo-100 p-3 rounded-xl cursor-pointer hover:bg-indigo-100 transition flex items-center justify-center active:scale-95">
                                                     <ImageIcon size={20}/>
                                                     <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => handleImageUpload(e, 'gambar')} />
                                                 </label>
                                             </div>
                                             {currentQ.gambar && (
                                                 <div className="mt-2 h-32 w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                                                     <img src={currentQ.gambar} alt="Preview" className="h-full object-contain" />
                                                 </div>
                                             )}
                                         </div>
                                         <div className="group">
                                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Keterangan Gambar (Caption)</label>
                                             <input type="text" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-colors text-sm" value={currentQ.keterangan_gambar || ''} onChange={e => setCurrentQ({...currentQ, keterangan_gambar: e.target.value})} placeholder="Sumber gambar atau deskripsi tambahan..." />
                                         </div>
                                     </div>
                                     <div className="space-y-4">
                                         <div className="group">
                                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">ID Soal</label>
                                             <input type="text" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-colors text-sm" value={currentQ.id} onChange={e => setCurrentQ({...currentQ, id: e.target.value})} disabled={questions.some(q => q.id === currentQ.id && q !== currentQ)} />
                                         </div>
                                         <div className="group">
                                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Tipe Soal</label>
                                             <select className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-colors text-sm appearance-none" value={currentQ.tipe_soal} onChange={e => setCurrentQ({...currentQ, tipe_soal: e.target.value as any})}><option value="PG">Pilihan Ganda</option><option value="PGK">Pilihan Ganda Kompleks</option><option value="BS">Benar / Salah</option></select>
                                         </div>
                                         <div className="group">
                                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Kunci Jawaban</label>
                                             <input type="text" className="w-full p-3 bg-emerald-50 border-2 border-emerald-100 rounded-xl font-bold text-emerald-700 focus:bg-white focus:border-emerald-500 outline-none transition-colors text-sm" value={currentQ.kunci_jawaban} onChange={e => setCurrentQ({...currentQ, kunci_jawaban: e.target.value.toUpperCase()})} placeholder="Contoh: A (PG) atau A,C (PGK)" />
                                         </div>
                                         <div className="group">
                                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Bobot Nilai</label>
                                             <input type="number" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-colors text-sm" value={currentQ.bobot} onChange={e => setCurrentQ({...currentQ, bobot: Number(e.target.value)})} />
                                         </div>
                                     </div>
                                 </div>
                                 
                                 {/* Options Section */}
                                 {currentQ.tipe_soal !== 'BS' && (
                                     <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Pilihan Jawaban</h4>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {renderOptionInput('Opsi A', 'opsi_a')}
                                            {renderOptionInput('Opsi B', 'opsi_b')}
                                            {renderOptionInput('Opsi C', 'opsi_c')}
                                            {renderOptionInput('Opsi D', 'opsi_d')}
                                         </div>
                                     </div>
                                 )}
                                 
                                 {currentQ.tipe_soal === 'BS' && (
                                     <div className="bg-orange-50 p-4 rounded-xl text-orange-800 text-sm font-medium border border-orange-100 flex items-center gap-2">
                                         <span className="font-bold bg-orange-200 px-2 py-0.5 rounded text-xs">INFO</span>
                                         Untuk soal Benar/Salah, Opsi A dianggap "Benar", Opsi B dianggap "Salah". Tulis pernyataan di Opsi A/B/C/D jika Multi-BS.
                                     </div>
                                 )}

                                 <div className="pt-4 flex gap-3 sticky bottom-0 bg-white border-t border-slate-100 mt-4 py-4">
                                     <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3.5 border-2 border-slate-200 text-slate-500 rounded-xl font-bold hover:bg-slate-100 hover:text-slate-700 transition">Batal</button>
                                     <button type="submit" disabled={loadingData} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 transform active:scale-95 transition-all">
                                         {loadingData ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>} Simpan Soal
                                     </button>
                                 </div>
                             </form>
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
};

export default BankSoalTab;
