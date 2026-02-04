import React, { useState, useEffect } from 'react';
import { FileQuestion, Download, Upload, Loader2, Plus, Edit, Trash2, X, Save, Image as ImageIcon, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../services/api';
import { QuestionRow } from '../../types';
import * as XLSX from 'xlsx';

const BankSoalTab = () => {
    const [subjects, setSubjects] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [questions, setQuestions] = useState<QuestionRow[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentQ, setCurrentQ] = useState<QuestionRow | null>(null);
    const [importing, setImporting] = useState(false);
    const [expandedQ, setExpandedQ] = useState<string | null>(null);

    useEffect(() => {
        const loadSubjects = async () => {
            const list = await api.getExams();
            let names = list.map(l => l.nama_ujian);
            const filtered = names.filter(n => !n.startsWith('Survey_'));
            
            setSubjects(filtered);
            if (filtered.length > 0) setSelectedSubject(filtered[0]);
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

    // --- IMPORT / EXPORT LOGIC ---
    const downloadTemplate = () => {
        const row = [{
            "ID Soal": "Q1",
            "Teks Soal": "Berapakah hasil dari 1 + 1?",
            "Tipe Soal (PG/PGK/BS)": "PG",
            "Link Gambar": "",
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
                        opsi_a: String(row[4] || ""),
                        opsi_b: String(row[5] || ""),
                        opsi_c: String(row[6] || ""),
                        opsi_d: String(row[7] || ""),
                        kunci_jawaban: String(row[8] || "").toUpperCase(),
                        bobot: Number(row[9] || 10)
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

    // --- GENERIC IMAGE UPLOAD LOGIC ---
    // Now accepts 'field' to target either the question image ('gambar') or options ('opsi_a', etc.)
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
                    // Resize to max 800px to keep base64 string reasonable for Apps Script
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

    // Helper to check if string looks like an image
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
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={downloadTemplate} className="bg-white text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition border-2 border-slate-200 active:scale-95">
                        <Download size={16}/> Template
                    </button>

                    <label className={`cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 active:scale-95 ${importing ? 'opacity-50 cursor-wait' : ''}`}>
                        {importing ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                        {importing ? "Mengimpor..." : "Import Excel"}
                        <input type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" disabled={importing} />
                    </label>

                    <button onClick={handleAddNew} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 active:scale-95">
                        <Plus size={16}/> Tambah Soal
                    </button>
                </div>
             </div>

             {/* Question List */}
             <div className="space-y-4">
                {loadingData ? (
                     <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="relative mb-4">
                            <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
                            <div className="w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute inset-0"></div>
                        </div>
                        <span className="text-sm font-bold text-slate-400 animate-pulse">Menyiapkan Data Soal...</span>
                    </div>
                ) : questions.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic font-medium bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                        <FileQuestion size={48} className="mx-auto mb-4 opacity-20"/>
                        Belum ada soal di database mapel ini.
                    </div>
                ) : (
                    questions.map((q, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group overflow-hidden">
                            <div className="p-5 flex items-start gap-4">
                                <div className="bg-slate-100 text-slate-500 font-mono font-bold text-xs p-2 rounded-lg min-w-[3rem] text-center border border-slate-200">
                                    {q.id}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div className="text-slate-800 font-medium text-sm leading-relaxed line-clamp-2 mb-2 pr-4">{q.text_soal}</div>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => handleEdit(q)} className="p-2 text-amber-500 bg-amber-50 hover:bg-amber-100 rounded-lg transition"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(q.id)} className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${q.tipe_soal === 'PG' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>{q.tipe_soal}</span>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Bobot: {q.bobot}</span>
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Kunci: {q.kunci_jawaban}</span>
                                        {q.gambar && <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><ImageIcon size={10}/> Ada Gambar</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
             </div>
             
             {/* EDIT MODAL */}
             {modalOpen && currentQ && (
                 <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md fade-in">
                     <div className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl max-h-[90vh] flex flex-col border border-white/20 transform scale-100 transition-all">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 rounded-t-[2rem]">
                            <h3 className="font-black text-xl text-slate-800 flex items-center gap-3"><span className={`p-2 rounded-xl ${currentQ.id ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}><Edit size={20}/></span> {currentQ.id ? 'Edit Soal' : 'Buat Soal Baru'}</h3>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50">
                            <form id="qForm" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="group">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">ID Soal</label>
                                                <input required type="text" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-mono font-bold text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-colors" value={currentQ.id} onChange={e => setCurrentQ({...currentQ, id: e.target.value})} />
                                            </div>
                                            <div className="group">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Tipe Soal</label>
                                                <select className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer" value={currentQ.tipe_soal} onChange={e => setCurrentQ({...currentQ, tipe_soal: e.target.value as any})}>
                                                    <option value="PG">Pilihan Ganda</option>
                                                    <option value="PGK">Pilihan Ganda Kompleks</option>
                                                    <option value="BS">Benar / Salah</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="group">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Konten Soal</label>
                                            <textarea required rows={5} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-700 focus:bg-white focus:border-indigo-500 outline-none resize-none transition-colors leading-relaxed" value={currentQ.text_soal} onChange={e => setCurrentQ({...currentQ, text_soal: e.target.value})} placeholder="Tuliskan pertanyaan disini..."></textarea>
                                        </div>
                                        <div className="group">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Link Gambar / Upload</label>
                                            <div className="flex gap-2">
                                                <div className="relative w-12 h-12 bg-slate-50 border-2 border-slate-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                                                    {isImage(currentQ.gambar) ? (
                                                        <img src={currentQ.gambar} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon size={20} className="text-slate-400"/>
                                                    )}
                                                </div>
                                                <input type="text" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-colors text-xs" value={currentQ.gambar} onChange={e => setCurrentQ({...currentQ, gambar: e.target.value})} placeholder="Paste URL atau Upload..." />
                                                <label className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl cursor-pointer transition shadow-lg shadow-indigo-200 flex items-center justify-center">
                                                    <Upload size={20}/>
                                                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => handleImageUpload(e, 'gambar')} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 group focus-within:ring-2 focus-within:ring-emerald-200 transition-all">
                                            <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1 ml-1">Kunci Jawaban</label>
                                            <input required type="text" className="w-full p-3 bg-white border-2 border-emerald-200 rounded-xl font-mono font-black text-emerald-700 focus:outline-none text-center text-lg" value={currentQ.kunci_jawaban} onChange={e => setCurrentQ({...currentQ, kunci_jawaban: e.target.value})} placeholder={currentQ.tipe_soal === 'PG' ? 'A' : 'A, C'} />
                                        </div>
                                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 group focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
                                            <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-1 ml-1">Bobot Nilai</label>
                                            <input type="number" className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-indigo-700 focus:outline-none text-center text-lg" value={currentQ.bobot} onChange={e => setCurrentQ({...currentQ, bobot: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                                    <h4 className="font-bold text-slate-700 border-b-2 border-slate-100 pb-3 mb-4 flex items-center gap-2"><CheckCircle2 size={18} className="text-slate-400"/> Pilihan Jawaban</h4>
                                    <div className="space-y-4">
                                        {renderOptionInput("Opsi A / Pernyataan 1", 'opsi_a')}
                                        {renderOptionInput("Opsi B / Pernyataan 2", 'opsi_b')}
                                        {renderOptionInput("Opsi C / Pernyataan 3", 'opsi_c')}
                                        
                                        {currentQ.tipe_soal !== 'PGK' && (
                                           renderOptionInput("Opsi D / Pernyataan 4", 'opsi_d')
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-white rounded-b-[2rem] flex justify-end gap-4">
                            <button onClick={() => setModalOpen(false)} className="px-6 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition">Batalkan</button>
                            <button type="submit" form="qForm" disabled={loadingData} className="px-8 py-3.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center gap-2">
                                {loadingData ? <><Loader2 size={20} className="animate-spin"/> Menyimpan...</> : <><Save size={20}/> Simpan Soal</>}
                            </button>
                        </div>
                     </div>
                 </div>
             )}
        </div>
    );
};

export default BankSoalTab;