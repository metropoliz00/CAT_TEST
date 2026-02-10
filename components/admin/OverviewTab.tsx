
import React, { useMemo, useState } from 'react';
import { School, Users, PlayCircle, CheckCircle2, AlertCircle, Key, Activity, Calendar, MapPin, Clock, Database, BookOpen, UserX, Search, BarChart3, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { User } from '../../types';
import { SimpleDonutChart } from '../../utils/adminHelpers';

interface OverviewTabProps {
    dashboardData: any;
    currentUserState: User;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ dashboardData, currentUserState }) => {
    const [schoolSearch, setSchoolSearch] = useState('');
    const [kecamatanFilter, setKecamatanFilter] = useState('all');
    const [isMapelOpen, setIsMapelOpen] = useState(true);

    // LOGIC UPDATE: Calculate stats ONLY for STUDENTS
    const stats = useMemo(() => {
        let total = 0;
        let counts = { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 };

        const allUsers = dashboardData.allUsers || [];

        // 1. Filter only STUDENTS
        let relevantUsers = allUsers.filter((u: any) => u.role === 'siswa');

        // 2. Filter based on Admin School (if applicable)
        if (currentUserState.role === 'admin_sekolah') {
            relevantUsers = relevantUsers.filter((u: any) => (u.school || '').toLowerCase() === (currentUserState.kelas_id || '').toLowerCase());
        }

        total = relevantUsers.length;

        // Aggregate status
        relevantUsers.forEach((u: any) => {
            const status = (u.status || 'OFFLINE') as keyof typeof counts;
            if (counts[status] !== undefined) {
                counts[status]++;
            } else {
                counts['OFFLINE']++;
            }
        });

        return { counts, total };
    }, [dashboardData.allUsers, currentUserState]);

    const uniqueKecamatans = useMemo(() => {
        if (!dashboardData.allUsers) return [];
        // Filter only students for kecamatan list
        const studentUsers = dashboardData.allUsers.filter((u:any) => u.role === 'siswa');
        const kecs = new Set(studentUsers.map((u: any) => u.kecamatan).filter((k: any) => k && k !== '-'));
        return Array.from(kecs).sort();
    }, [dashboardData.allUsers]);

    const schoolStats = useMemo(() => {
        if (currentUserState.role !== 'admin_pusat' || !dashboardData.allUsers) return [];

        const schoolMap: Record<string, { name: string, kecamatan: string, total: number, offline: number, login: number, working: number, finished: number }> = {};

        // Only process Students
        const studentUsers = dashboardData.allUsers.filter((u:any) => u.role === 'siswa');

        studentUsers.forEach((u: any) => {
            const schoolName = u.school || 'Tanpa Sekolah';
            if (!schoolMap[schoolName]) {
                schoolMap[schoolName] = { 
                    name: schoolName, 
                    kecamatan: u.kecamatan || '-',
                    total: 0, offline: 0, login: 0, working: 0, finished: 0 
                };
            }
            
            schoolMap[schoolName].total++;
            
            const status = u.status || 'OFFLINE';
            if (status === 'OFFLINE') schoolMap[schoolName].offline++;
            else if (status === 'LOGGED_IN') schoolMap[schoolName].login++;
            else if (status === 'WORKING') schoolMap[schoolName].working++;
            else if (status === 'FINISHED') schoolMap[schoolName].finished++;
        });

        let results = Object.values(schoolMap).sort((a, b) => b.total - a.total);

        if (kecamatanFilter !== 'all') {
            results = results.filter(s => (s.kecamatan || '').toLowerCase() === kecamatanFilter.toLowerCase());
        }

        if (schoolSearch) {
            const lowerSearch = schoolSearch.toLowerCase();
            results = results.filter(s => s.name.toLowerCase().includes(lowerSearch));
        }

        return results;
    }, [dashboardData.allUsers, currentUserState.role, schoolSearch, kecamatanFilter]);

    const { OFFLINE, LOGGED_IN, WORKING, FINISHED } = stats.counts;
    const displayTotalUsers = stats.total;
    const totalStatus = OFFLINE + LOGGED_IN + WORKING + FINISHED;
    const examDuration = Number(dashboardData.duration) || 0;
    
    const statusData = [
        { value: OFFLINE, color: '#e2e8f0', label: 'Belum Login' },
        { value: LOGGED_IN, color: '#facc15', label: 'Login' },
        { value: WORKING, color: '#3b82f6', label: 'Mengerjakan' },
        { value: FINISHED, color: '#10b981', label: 'Selesai' },
    ];
    
    const filteredFeed = useMemo(() => {
        const feed = dashboardData.activityFeed || [];
        // Filter feed to show only student activities (usually by checking role in user list, but feed might not have role directly)
        // We can infer or just show all, but user requested separation.
        // Assuming feed contains username, we check against allUsers.
        
        let validFeed = feed;
        if (dashboardData.allUsers) {
             const studentUsernames = new Set(dashboardData.allUsers.filter((u:any) => u.role === 'siswa').map((u:any) => u.username));
             validFeed = feed.filter((log: any) => studentUsernames.has(log.username));
        }

        if (currentUserState.role === 'admin_sekolah') {
            const mySchool = (currentUserState.kelas_id || '').trim().toLowerCase();
            return validFeed.filter((log: any) => (log.school || '').trim().toLowerCase() === mySchool);
        }
        return validFeed;
    }, [dashboardData.activityFeed, dashboardData.allUsers, currentUserState]);

    const mySchedule = useMemo(() => {
        if (currentUserState.role === 'admin_sekolah' && dashboardData.schedules) {
            const mySchoolName = (currentUserState.kelas_id || '').trim().toLowerCase();
            return dashboardData.schedules.find((s:any) => (s.school || '').trim().toLowerCase() === mySchoolName);
        }
        return null;
    }, [currentUserState, dashboardData.schedules]);

    const uniqueSchoolsCount = useMemo(() => {
        if (!dashboardData.allUsers) return 0;
        const studentUsers = dashboardData.allUsers.filter((u:any) => u.role === 'siswa');
        const schools = new Set(studentUsers.map((u: any) => u.school).filter((s: any) => s && s !== '-' && s.trim() !== ''));
        return schools.size;
    }, [dashboardData.allUsers]);

    const formatDateFull = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
        return dateStr;
    };

    const dbSubjects = useMemo(() => {
        const subjects = dashboardData.subjects || [];
        const priority = ["Matematika", "IPA", "IPS"];
        
        return [...subjects].sort((a: any, b: any) => {
            const idxA = priority.indexOf(a.name);
            const idxB = priority.indexOf(b.name);
            
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [dashboardData.subjects]);

    return (
    <div className="space-y-6 fade-in max-w-7xl mx-auto">
        {currentUserState.role === 'admin_sekolah' && (
            <div className="bg-white border-l-4 border-blue-600 px-6 py-4 rounded-r-xl shadow-sm flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><School size={20}/></div>
                    <div>
                        <h3 className="font-bold text-sm uppercase tracking-wide text-slate-700">Mode Proktor</h3>
                        <p className="text-sm text-slate-500">Sekolah: <b>{currentUserState.kelas_id}</b></p>
                    </div>
                </div>
            </div>
        )}

        {currentUserState.role === 'admin_sekolah' && mySchedule && (
            <div className="bg-gradient-to-r from-blue-700 to-red-600 text-white p-8 rounded-3xl shadow-xl flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                 <div className="flex items-center gap-5 border-b lg:border-b-0 border-white/20 pb-6 lg:pb-0 w-full lg:w-auto relative z-10">
                    <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm"><Calendar size={32}/></div>
                    <div>
                         <h2 className="text-2xl font-black tracking-tight">Jadwal Ujian Aktif</h2>
                         <p className="opacity-90 text-sm font-medium">Jadwal pelaksanaan ujian untuk sekolah Anda.</p>
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-4 text-center justify-center w-full lg:w-auto relative z-10">
                    <div className="bg-black/20 px-6 py-4 rounded-2xl border border-white/10 backdrop-blur-md flex flex-col justify-center min-w-[200px]">
                        <p className="text-[10px] uppercase font-bold text-blue-100 mb-1">Tanggal</p>
                        <div className="font-bold text-white text-lg">
                            {mySchedule.tanggal_selesai && mySchedule.tanggal_selesai !== mySchedule.tanggal ? (
                                <div className="leading-tight">
                                    <span>{formatDateFull(mySchedule.tanggal)}</span>
                                    <span className="text-xs opacity-70 mx-1">s/d</span>
                                    <span>{formatDateFull(mySchedule.tanggal_selesai)}</span>
                                </div>
                            ) : (
                                <span>{formatDateFull(mySchedule.tanggal)}</span>
                            )}
                        </div>
                    </div>
                    <div className="bg-white text-blue-900 px-6 py-4 rounded-2xl shadow-lg min-w-[120px] flex flex-col justify-center">
                        <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">Gelombang</p>
                        <p className="text-xl font-black">{mySchedule.gelombang}</p>
                    </div>
                    <div className="bg-white/10 px-6 py-4 rounded-2xl border border-white/20 backdrop-blur-md min-w-[120px] flex flex-col justify-center">
                        <p className="text-[10px] uppercase font-bold text-white/70 mb-1 flex items-center justify-center gap-1"><Clock size={10}/> Durasi</p>
                        <p className="text-xl font-black text-white">{examDuration}m</p>
                    </div>
                 </div>
            </div>
        )}

        <div className={`grid grid-cols-1 md:grid-cols-2 ${currentUserState.role === 'admin_pusat' ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-6`}>
            {currentUserState.role === 'admin_pusat' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Total Sekolah</p>
                        <h3 className="text-2xl md:text-3xl font-black text-slate-800 mt-1">{uniqueSchoolsCount}</h3>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl text-orange-500"><School size={28}/></div>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div><p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Siswa Terdaftar</p><h3 className="text-2xl md:text-3xl font-black text-slate-800 mt-1">{displayTotalUsers}</h3></div>
                <div className="bg-slate-100 p-3 rounded-xl text-slate-600"><Users size={28}/></div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div><p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Belum Login</p><h3 className="text-2xl md:text-3xl font-black text-slate-500 mt-1">{OFFLINE}</h3></div>
                <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><UserX size={28}/></div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div><p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Sedang Ujian</p><h3 className="text-2xl md:text-3xl font-black text-blue-600 mt-1">{WORKING}</h3></div>
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><PlayCircle size={28}/></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div><p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Ujian Selesai</p><h3 className="text-2xl md:text-3xl font-black text-emerald-600 mt-1">{FINISHED}</h3></div>
                <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><CheckCircle2 size={28}/></div>
            </div>
        </div>

        {/* Database Subject Status Section (Collapsible) */}
        {currentUserState.role === 'admin_pusat' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <button 
                    onClick={() => setIsMapelOpen(!isMapelOpen)}
                    className="w-full flex items-center justify-between p-6 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Database size={18} className="text-indigo-600"/>
                        <h4 className="font-bold text-slate-700 text-sm">Status Database Mata Pelajaran</h4>
                    </div>
                    {isMapelOpen ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                </button>
                
                {isMapelOpen && (
                    <div className="p-6 pt-0 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-50 pt-4">
                            {dbSubjects.length > 0 ? (
                                dbSubjects.map((sub: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white p-2 rounded-lg border border-slate-200 text-indigo-600"><BookOpen size={16}/></div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">{sub.name}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tersinkronisasi</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-slate-700">{sub.count}</p>
                                            <p className="text-[9px] text-slate-400 font-bold">Soal</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-3 text-center text-slate-400 text-xs italic py-4">Memeriksa ketersediaan database mapel...</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                <h3 className="text-slate-800 font-bold mb-8 text-sm uppercase tracking-wide w-full border-b pb-4">Statistik Siswa</h3>
                <SimpleDonutChart data={statusData} />
                <div className="grid grid-cols-2 gap-4 mt-8 w-full text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-200 rounded-full"></div> Belum Login ({totalStatus > 0 ? Math.round((OFFLINE/totalStatus)*100) : 0}%)</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 rounded-full"></div> Login ({totalStatus > 0 ? Math.round((LOGGED_IN/totalStatus)*100) : 0}%)</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> Mengerjakan ({totalStatus > 0 ? Math.round((WORKING/totalStatus)*100) : 0}%)</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Selesai ({totalStatus > 0 ? Math.round((FINISHED/totalStatus)*100) : 0}%)</div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 col-span-2">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Activity size={20} className="text-blue-600"/> Aktivitas Siswa Real-time</h3>
                <div className="space-y-0 h-[350px] overflow-y-auto custom-scrollbar pr-2">
                    {filteredFeed && filteredFeed.length > 0 ? (
                        filteredFeed.map((log: any, i: number) => {
                            let icon = <AlertCircle size={18}/>;
                            let bgClass = "bg-slate-50 border-slate-100";
                            let statusText = "Unknown";
                            let textClass = "text-slate-600";
                            
                            if (log.action === 'LOGIN') {
                                icon = <Key size={18}/>;
                                bgClass = "bg-yellow-50 border-yellow-100";
                                textClass = "text-yellow-700";
                                statusText = "Login";
                            } else if (log.action === 'START') {
                                icon = <PlayCircle size={18}/>;
                                bgClass = "bg-blue-50 border-blue-100";
                                textClass = "text-blue-700";
                                statusText = "Mengerjakan";
                            } else if (log.action === 'FINISH') {
                                icon = <CheckCircle2 size={18}/>;
                                bgClass = "bg-emerald-50 border-emerald-100";
                                textClass = "text-emerald-700";
                                statusText = "Selesai";
                            }

                            const hasSubject = log.subject && log.subject !== '-' && log.subject !== 'Success';
                            
                            return (
                                <div key={i} className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-xl transition border-b border-slate-50 last:border-0 group">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${bgClass} ${textClass}`}>
                                        {icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{log.fullname}</p>
                                            <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2 bg-slate-100 px-2 py-0.5 rounded">{new Date(log.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', hour12: false})}</span>
                                        </div>
                                        
                                        <div className="text-xs text-slate-500 mb-2 flex flex-col gap-1">
                                            <div className="flex items-center gap-2" title="Sekolah">
                                                <School size={12} className="text-slate-400 shrink-0"/>
                                                <span className="truncate font-semibold">{log.school || '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-2" title="Kecamatan">
                                                <MapPin size={12} className="text-slate-400 shrink-0"/>
                                                <span className="truncate font-medium">{log.kecamatan || '-'}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${bgClass} ${textClass} border`}>
                                                {statusText}
                                            </span>
                                            {hasSubject && (
                                                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-white text-slate-600 border border-slate-200">
                                                    {log.subject}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 italic">
                            <Activity size={40} className="mb-3 opacity-10"/>
                            Belum ada aktivitas tercatat.
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* School Statistics Table for Admin Pusat */}
        {currentUserState.role === 'admin_pusat' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 border border-indigo-100"><BarChart3 size={20}/></div>
                        <div>
                            <h3 className="font-bold text-slate-800">Statistik Per Sekolah</h3>
                            <p className="text-xs text-slate-500">Rekapitulasi status peserta (Siswa) berdasarkan sekolah</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                        <div className="relative group w-full sm:w-48">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                            <select 
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 font-bold text-slate-700 transition-all bg-slate-50 focus:bg-white cursor-pointer appearance-none"
                                value={kecamatanFilter}
                                onChange={e => setKecamatanFilter(e.target.value)}
                            >
                                <option value="all">Semua Kecamatan</option>
                                {uniqueKecamatans.map((k:any) => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                        <div className="relative group w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                            <input 
                                type="text" 
                                placeholder="Cari Nama Sekolah..." 
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 font-bold text-slate-700 placeholder-slate-400 transition-all bg-slate-50 focus:bg-white" 
                                value={schoolSearch} 
                                onChange={e => setSchoolSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[500px] custom-scrollbar rounded-xl border border-slate-100">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 font-bold text-slate-500 uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 border-b border-slate-200">Nama Sekolah</th>
                                <th className="p-4 border-b border-slate-200">Kecamatan</th>
                                <th className="p-4 border-b border-slate-200 text-center">Total Siswa</th>
                                <th className="p-4 border-b border-slate-200 text-center text-slate-400">Belum Login</th>
                                <th className="p-4 border-b border-slate-200 text-center text-yellow-600">Login</th>
                                <th className="p-4 border-b border-slate-200 text-center text-blue-600">Mengerjakan</th>
                                <th className="p-4 border-b border-slate-200 text-center text-emerald-600">Selesai</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {schoolStats.length > 0 ? (
                                schoolStats.map((stat, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-700">{stat.name}</td>
                                        <td className="p-4 text-slate-600 text-xs font-medium">{stat.kecamatan}</td>
                                        <td className="p-4 text-center font-bold text-slate-800 bg-slate-50">{stat.total}</td>
                                        <td className="p-4 text-center font-mono text-slate-400">{stat.offline}</td>
                                        <td className="p-4 text-center font-mono text-yellow-600 font-bold bg-yellow-50/50">{stat.login}</td>
                                        <td className="p-4 text-center font-mono text-blue-600 font-bold bg-blue-50/50">{stat.working}</td>
                                        <td className="p-4 text-center font-mono text-emerald-600 font-bold bg-emerald-50/50">{stat.finished}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">Tidak ada data sekolah ditemukan.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
    );
};

export default OverviewTab;
