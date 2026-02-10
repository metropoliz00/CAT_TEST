
import React, { useState, useEffect } from 'react';
import { Key, RefreshCw, Save, X, Edit, Clock, Layers, ShieldCheck, Copy, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { User, Exam } from '../../types';

const RilisTokenTab = ({ currentUser, token, duration, refreshData, isRefreshing }: { currentUser: User, token: string, duration: number, maxQuestions: number, refreshData: () => void, isRefreshing: boolean }) => {
    
    // States for Token and Exam Duration editing
    const [tokenInput, setTokenInput] = useState(token);
    const [isEditingToken, setIsEditingToken] = useState(false);
    const [durationInput, setDurationInput] = useState(duration);
    const [isEditingDuration, setIsEditingDuration] = useState(false);

    // Per-Subject Configuration State (Batch)
    const [exams, setExams] = useState<Exam[]>([]);
    const [examLimits, setExamLimits] = useState<Record<string, number>>({});
    const [loadingExams, setLoadingExams] = useState(false);
    const [isSavingSubject, setIsSavingSubject] = useState(false);

    const isAdminPusat = currentUser.role === 'admin_pusat';

    useEffect(() => { setTokenInput(token); }, [token]);
    useEffect(() => { setDurationInput(duration); }, [duration]);

    // Fetch Exams for Subject Config
    useEffect(() => {
        const loadExams = async () => {
            setLoadingExams(true);
            try {
                const data = await api.getExams();
                if (Array.isArray(data)) {
                    setExams(data);
                    
                    // Initialize limits dictionary
                    const limits: Record<string, number> = {};
                    data.forEach(e => {
                        limits[e.id] = e.max_questions || 0;
                    });
                    setExamLimits(limits);
                } else {
                    setExams([]);
                }
            } catch (e) {
                console.error("Gagal memuat mapel", e);
                setExams([]);
            } finally {
                setLoadingExams(false);
            }
        };
        loadExams();
    }, []);

    const handleLimitChange = (id: string, val: string) => {
        setExamLimits(prev => ({ ...prev, [id]: Number(val) }));
    };

    const handleSaveBatchConfig = async () => {
        setIsSavingSubject(true);
        try {
            await api.saveBatchSubjectConfig(examLimits);
            alert(`Konfigurasi limit soal berhasil disimpan untuk semua mapel.`);
        } catch (e) {
            console.error(e);
            alert("Gagal menyimpan konfigurasi mapel.");
        } finally {
            setIsSavingSubject(false);
        }
    };

    const handleUpdateToken = async () => {
        try { await api.saveToken(tokenInput); setIsEditingToken(false); refreshData(); alert("Token berhasil diperbarui."); } catch (e) { alert("Gagal menyimpan token."); }
    };

    const generateToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setTokenInput(result);
    };

    const handleUpdateDuration = async () => {
        try { await api.saveDuration(durationInput); setIsEditingDuration(false); refreshData(); alert("Durasi ujian disimpan."); } catch (e) { alert("Gagal menyimpan durasi."); }
    };

    return (
        <div className="flex flex-col items-center justify-center py-8 fade-in min-h-[500px] gap-8">
            {/* Header / Title */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-slate-200 shadow-sm">
                    <ShieldCheck size={12} /> Secure Exam Control
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Panel Kontrol Ujian</h2>
                <p className="text-slate-400 font-medium text-sm">Kelola token akses dan konfigurasi soal per mata pelajaran.</p>
            </div>

            {/* Main Cards Container - White Soft Aesthetic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl relative z-10">
                
                {/* Token Card */}
                <div className="bg-white rounded-[2.5rem] p-10 relative overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100 group hover:shadow-[0_25px_50px_-10px_rgba(0,0,0,0.08)] transition-all duration-500">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.02] transform group-hover:scale-110 transition-transform duration-700">
                        <Key size={200} className="text-slate-900"/>
                    </div>
                    
                    <div className="relative flex flex-col h-full justify-between gap-8">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 text-slate-400 font-extrabold uppercase text-[10px] tracking-widest">
                                <span className="p-2 bg-slate-50 rounded-xl"><Key size={14}/></span> Token Akses
                            </div>
                            {isAdminPusat && (
                                <button onClick={()=>setIsEditingToken(!isEditingToken)} className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-slate-50 transition"><Edit size={16}/></button>
                            )}
                        </div>
                        
                        {isEditingToken ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center font-mono text-3xl font-black uppercase tracking-[0.2em] text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner" value={tokenInput} onChange={e=>setTokenInput(e.target.value.toUpperCase())} maxLength={6} autoFocus />
                                <div className="flex gap-2">
                                    <button onClick={generateToken} className="flex-1 bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 p-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2"><RefreshCw size={14}/> Acak</button>
                                    <button onClick={handleUpdateToken} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold text-xs transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"><Save size={14}/> Simpan</button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 cursor-pointer group/token select-none" onClick={() => { navigator.clipboard.writeText(token); alert('Token disalin!'); }} title="Klik untuk salin">
                                <h3 className="text-6xl md:text-7xl font-mono font-black tracking-[0.2em] text-slate-800 group-hover/token:text-indigo-600 transition-colors">{token}</h3>
                                <div className="flex justify-center mt-4 opacity-0 group-hover/token:opacity-100 transition-all transform translate-y-2 group-hover/token:translate-y-0">
                                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-4 py-1.5 rounded-full flex items-center gap-1.5"><Copy size={10}/> Salin Token</span>
                                </div>
                            </div>
                        )}
                        
                        <div className="text-center">
                            <p className="text-xs text-slate-400 font-medium bg-slate-50 py-2 px-4 rounded-full inline-block">Token digunakan siswa untuk login ujian</p>
                        </div>
                    </div>
                </div>

                {/* Duration Card */}
                <div className="bg-white rounded-[2.5rem] p-10 relative overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between group hover:shadow-[0_25px_50px_-10px_rgba(0,0,0,0.08)] transition-all duration-500">
                     <div className="absolute top-0 right-0 p-10 opacity-[0.02] transform group-hover:scale-110 transition-transform duration-700">
                        <Clock size={200} className="text-slate-900"/>
                    </div>
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="flex items-center gap-2 text-slate-400 font-extrabold uppercase text-[10px] tracking-widest">
                             <span className="p-2 bg-slate-50 rounded-xl"><Clock size={14}/></span> Durasi Ujian Global
                        </div>
                        {isAdminPusat && !isEditingDuration && (
                            <button onClick={()=>setIsEditingDuration(true)} className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-slate-50 transition"><Edit size={16}/></button>
                        )}
                    </div>

                    <div className="text-center flex-1 flex flex-col justify-center relative z-10">
                        {isEditingDuration ? (
                            <div className="flex items-center gap-3 justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="relative">
                                    <input type="number" className="w-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center font-black text-4xl text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner" value={durationInput} onChange={e=>setDurationInput(Number(e.target.value))} />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase tracking-wide">Menit</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={handleUpdateDuration} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100"><Save size={16}/></button>
                                    <button onClick={()=>{setIsEditingDuration(false); setDurationInput(duration);}} className="bg-white border border-slate-200 text-slate-500 p-3 rounded-xl hover:bg-slate-50"><X size={16}/></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-7xl font-black text-slate-800 tracking-tighter">{duration}<span className="text-2xl text-slate-300 font-bold ml-1 align-top">m</span></h3>
                                <p className="text-xs text-slate-400 mt-2 font-medium bg-slate-50 py-2 px-4 rounded-full inline-block">Default Waktu Pengerjaan</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Subject Config Panel (Updated for Batch Edit) */}
            {isAdminPusat && (
                <div className="w-full max-w-4xl bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                        <Layers size={150} className="text-slate-900"/>
                    </div>

                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div className="flex gap-4 items-center">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm">
                                <Layers size={24}/>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-lg">Konfigurasi Batas Soal</h4>
                                <p className="text-xs text-slate-400 font-medium">Tentukan jumlah soal yang tampil untuk setiap mata pelajaran.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleSaveBatchConfig} 
                            disabled={isSavingSubject}
                            className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold text-xs"
                        >
                            {isSavingSubject ? <RefreshCw size={16} className="animate-spin"/> : <Save size={16}/>} Simpan Konfigurasi
                        </button>
                    </div>

                    <div className="relative z-10 bg-slate-50 rounded-xl border border-slate-100 p-1">
                        {loadingExams ? (
                            <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                                <RefreshCw className="animate-spin"/> Memuat Daftar Mapel...
                            </div>
                        ) : exams.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">Belum ada mata pelajaran.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                                {exams.map(exam => (
                                    <div key={exam.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between group hover:border-blue-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                                                {exam.nama_ujian.charAt(0)}
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm truncate max-w-[100px]" title={exam.nama_ujian}>{exam.nama_ujian}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                                                value={examLimits[exam.id]}
                                                onChange={(e) => handleLimitChange(exam.id, e.target.value)}
                                                placeholder="0"
                                            />
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Soal</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 font-medium bg-white border border-slate-100 p-3 rounded-xl w-fit">
                        <AlertCircle size={14} className="text-orange-400"/>
                        <span>Info: Isi <b>0</b> untuk menampilkan semua soal yang tersedia di Bank Soal.</span>
                    </div>
                </div>
            )}

            <button onClick={refreshData} disabled={isRefreshing} className={`bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 px-8 py-3 rounded-full font-bold text-xs transition-all shadow-sm hover:shadow-md flex items-center gap-2 ${isRefreshing ? 'opacity-50 cursor-wait' : ''}`}>
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? "Sinkronisasi Data..." : "Refresh Data Server"}
            </button>
        </div>
    )
}

export default RilisTokenTab;
