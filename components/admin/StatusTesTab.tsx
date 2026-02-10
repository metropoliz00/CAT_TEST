
import React, { useState, useMemo } from 'react';
import { Monitor, Search, PlayCircle, Key, CheckCircle2, RefreshCw, Filter, UserX } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

const StatusTesTab = ({ currentUser, students, refreshData }: { currentUser: User, students: any[], refreshData: () => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [resetting, setResetting] = useState<string | null>(null);

    const uniqueSchools = useMemo<string[]>(() => { 
        const schools = new Set(students.map(s => s.school).filter(Boolean)); 
        return Array.from(schools).sort() as string[]; 
    }, [students]);

    const uniqueKecamatans = useMemo(() => { 
        const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-')); 
        return Array.from(kecs).sort(); 
    }, [students]);

    const filtered = useMemo(() => { 
        return students.filter(s => { 
            // FILTER: HANYA ROLE SISWA
            if (s.role !== 'siswa') return false;

            const matchName = s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || s.username.toLowerCase().includes(searchTerm.toLowerCase()); 
            if (currentUser.role === 'admin_sekolah') { 
                return matchName && (s.school || '').toLowerCase() === (currentUser.kelas_id || '').toLowerCase(); 
            } 
            let matchFilter = true; 
            if (filterSchool !== 'all') matchFilter = matchFilter && s.school === filterSchool; 
            if (filterKecamatan !== 'all') matchFilter = matchFilter && (s.kecamatan || '').toLowerCase() === filterKecamatan.toLowerCase(); 
            return matchName && matchFilter; 
        }); 
    }, [students, searchTerm, currentUser, filterSchool, filterKecamatan]);

    const handleReset = async (username: string) => { 
        if(!confirm(`Reset login untuk ${username}? Siswa akan logout otomatis dan status menjadi OFFLINE.`)) return; 
        setResetting(username); 
        try { 
            await api.resetLogin(username); 
            // Optimistically update status locally
            const student = students.find(s => s.username === username);
            if (student) {
                student.status = 'OFFLINE';
            }
            refreshData(); 
            alert(`Berhasil reset login untuk ${username}.`);
        } catch(e) { 
            console.error(e); 
            alert("Gagal reset login."); 
        } finally { 
            setResetting(null); 
        } 
    }

    const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const school = e.target.value;
        setFilterSchool(school);
        if (school !== 'all') {
            const sample = students.find(s => s.school === school);
            if (sample && sample.kecamatan) setFilterKecamatan(sample.kecamatan);
        } else {
            setFilterKecamatan('all');
        }
    };

    const renderStatusBadge = (status: string) => { 
        switch (status) { 
            case 'WORKING': return <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 border border-blue-100 shadow-sm"><PlayCircle size={12}/> Mengerjakan</span>; 
            case 'LOGGED_IN': return <span className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 border border-amber-100 shadow-sm"><Key size={12}/> Standby</span>; 
            case 'FINISHED': return <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 border border-emerald-100 shadow-sm"><CheckCircle2 size={12}/> Selesai</span>; 
            case 'OFFLINE': default: return <span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 border border-slate-200"><UserX size={12}/> Offline</span>; 
        } 
    };

    return (
        <div className="space-y-6 fade-in">
             {/* Header Card */}
             <div className="bg-white p-6 rounded-[1.5rem] shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <div className="z-10">
                    <h3 className="font-black text-xl md:text-2xl text-slate-800 flex items-center gap-3"><Monitor size={28} className="text-indigo-600"/> Live Status Monitor</h3>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Pantau aktivitas peserta ujian secara realtime.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto z-10">
                    {currentUser.role === 'admin_pusat' && (
                        <>
                        <div className="relative group">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16}/>
                            <select className="pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 focus:bg-white bg-slate-50 transition-all cursor-pointer w-full md:w-48 appearance-none" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}><option value="all">Semua Kecamatan</option>{uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}</select>
                        </div>
                        <div className="relative group">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16}/>
                            <select className="pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 focus:bg-white bg-slate-50 transition-all cursor-pointer w-full md:w-48 appearance-none" value={filterSchool} onChange={handleSchoolChange}><option value="all">Semua Sekolah</option>{uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        </div>
                        </>
                    )}
                    <div className="relative group w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input type="text" placeholder="Cari Nama / Username..." className="w-full pl-11 pr-4 py-3 border-2 border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 placeholder-slate-400 transition-all bg-slate-50 focus:bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                    </div>
                </div>
             </div>

             {/* Table Card */}
             <div className="bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                 <div className="overflow-x-auto">
                     <table className="w-full text-xs md:text-sm text-left">
                         <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[10px] md:text-[11px] tracking-wider backdrop-blur-sm sticky top-0 z-10">
                             <tr>
                                 <th className="p-3 md:p-5 border-b border-slate-200">Peserta</th>
                                 <th className="p-3 md:p-5 border-b border-slate-200">Sekolah & Kecamatan</th>
                                 <th className="p-3 md:p-5 border-b border-slate-200">Status</th>
                                 <th className="p-3 md:p-5 border-b border-slate-200">Ujian Aktif</th>
                                 <th className="p-3 md:p-5 border-b border-slate-200 text-center">Kontrol</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {filtered.length === 0 ? 
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic bg-slate-50/30">Tidak ada data peserta yang cocok.</td></tr> 
                                : filtered.map((s, i) => (
                                <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="p-3 md:p-5">
                                        <div className="font-bold text-slate-800 text-sm md:text-base">{s.fullname}</div>
                                        <div className="font-mono text-[10px] md:text-xs text-slate-400 mt-1 bg-slate-100 w-fit px-2 py-0.5 rounded">{s.username}</div>
                                    </td>
                                    <td className="p-3 md:p-5">
                                        <div className="font-bold text-slate-600 text-[10px] md:text-xs">{s.school}</div>
                                        <div className="text-[9px] md:text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">{s.kecamatan || '-'}</div>
                                    </td>
                                    <td className="p-3 md:p-5">{renderStatusBadge(s.status)}</td>
                                    <td className="p-3 md:p-5">
                                        {s.active_exam && s.active_exam !== '-' ? (
                                            <span className="font-bold text-indigo-700 text-[10px] md:text-xs bg-indigo-50 px-2 py-1 rounded border border-indigo-100">{s.active_exam}</span>
                                        ) : (
                                            <span className="text-slate-300 text-xs font-bold">-</span>
                                        )}
                                    </td>
                                    <td className="p-3 md:p-5 text-center">
                                        <button onClick={() => handleReset(s.username)} disabled={!!resetting || s.status === 'OFFLINE'} className="group/btn relative overflow-hidden bg-white text-rose-500 border border-rose-200 hover:border-rose-500 hover:bg-rose-500 hover:text-white px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 disabled:border-slate-200 flex items-center gap-2 mx-auto w-fit">
                                            {resetting === s.username ? <RefreshCw size={14} className="animate-spin"/> : <RefreshCw size={14} className="group-hover/btn:rotate-180 transition-transform duration-500"/>}
                                            <span className="hidden md:inline">Reset Login</span>
                                            <span className="md:hidden">Reset</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-400 font-medium flex justify-between items-center">
                    <span>Total: {filtered.length} Peserta</span>
                    <span>Menampilkan 50 data teratas</span>
                </div>
            </div>
        </div>
    )
};

export default StatusTesTab;
