import React, { useState, useMemo } from 'react';
import { Clock, Search, Save, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

const AturSesiTab = ({ currentUser, students, refreshData, isLoading }: { currentUser: User, students: any[], refreshData: () => void, isLoading: boolean }) => {
    const [sessionInput, setSessionInput] = useState('Sesi 1');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');

    const uniqueSchools = useMemo(() => {
        const schools = new Set(students.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [students]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchName = s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              s.username.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (currentUser.role === 'admin_sekolah') {
                return matchName && (s.school || '').toLowerCase() === (currentUser.kelas_id || '').toLowerCase();
            }
            
            let matchFilter = true;
            if (filterSchool !== 'all') matchFilter = matchFilter && s.school === filterSchool;
            if (filterKecamatan !== 'all') matchFilter = matchFilter && (s.kecamatan || '').toLowerCase() === filterKecamatan.toLowerCase();

            return matchName && matchFilter;
        });
    }, [students, searchTerm, currentUser, filterSchool, filterKecamatan]);

    const handleSave = async () => {
        if (!sessionInput) return alert("Pilih sesi");
        if (selectedUsers.size === 0) return alert("Pilih siswa");
        const updates = Array.from(selectedUsers).map(u => ({ username: String(u), session: sessionInput }));
        await api.updateUserSessions(updates);
        alert("Sesi berhasil diupdate");
        refreshData();
        setSelectedUsers(new Set());
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) setSelectedUsers(new Set(filteredStudents.map(s => s.username)));
        else setSelectedUsers(new Set());
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-700"><Clock size={20}/> Atur Sesi Ujian</h3>
            <div className="flex flex-col xl:flex-row gap-4 mb-6">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                     <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Set Sesi</label>
                        <select className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100" value={sessionInput} onChange={e => setSessionInput(e.target.value)}>
                            <option value="">-- Pilih Sesi --</option>
                            <option value="Sesi 1">Sesi 1</option>
                            <option value="Sesi 2">Sesi 2</option>
                            <option value="Sesi 3">Sesi 3</option>
                            <option value="Sesi 4">Sesi 4</option>
                        </select>
                    </div>
                    {currentUser.role === 'admin_pusat' && (
                        <>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Filter Kecamatan</label>
                            <select 
                                className="p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100"
                                value={filterKecamatan}
                                onChange={e => setFilterKecamatan(e.target.value)}
                            >
                                <option value="all">Semua Kecamatan</option>
                                {uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Filter Sekolah</label>
                            <select 
                                className="p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100"
                                value={filterSchool}
                                onChange={e => setFilterSchool(e.target.value)}
                            >
                                <option value="all">Semua Sekolah</option>
                                {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        </>
                    )}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Cari Peserta</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Nama / Username..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-indigo-100" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="flex items-end gap-2">
                    <button onClick={handleSave} disabled={isLoading} className="h-[38px] px-6 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2 whitespace-nowrap">
                        {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Atur Sesi
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4 w-10"><input type="checkbox" onChange={e => toggleSelectAll(e.target.checked)} checked={filteredStudents.length > 0 && selectedUsers.size === filteredStudents.length} /></th>
                            <th className="p-4">Nama Peserta</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Kecamatan</th>
                            <th className="p-4">Sesi Saat Ini</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Tidak ada peserta yang cocok dengan filter.</td></tr>
                        ) : filteredStudents.map(s => (
                            <tr key={s.username} className="hover:bg-slate-50 transition">
                                <td className="p-4">
                                    <input type="checkbox" checked={selectedUsers.has(s.username)} onChange={() => {
                                        const newSet = new Set(selectedUsers);
                                        if (newSet.has(s.username)) newSet.delete(s.username);
                                        else newSet.add(s.username);
                                        setSelectedUsers(newSet);
                                    }}/>
                                </td>
                                <td className="p-4 font-bold text-slate-700">{s.fullname}</td>
                                <td className="p-4 text-slate-600">{s.school}</td>
                                <td className="p-4 text-slate-600">{s.kecamatan || '-'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${s.session ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {s.session || 'Belum Diatur'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 text-xs text-slate-400 flex justify-between">
                <span>Total Peserta: {filteredStudents.length}</span>
                <span>Terpilih: {selectedUsers.size}</span>
            </div>
        </div>
    );
};

export default AturSesiTab;
