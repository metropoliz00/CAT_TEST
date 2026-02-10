import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, FileText, Loader2, BookOpen } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel, formatDurationToText } from '../../utils/adminHelpers';

const RekapTab = ({ students }: { students: any[] }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [filterSubject, setFilterSubject] = useState('all');

    const userMap = useMemo(() => {
        const map: Record<string, any> = {};
        students.forEach(s => map[s.username] = s);
        return map;
    }, [students]);

    useEffect(() => {
        setLoading(true);
        api.getRecap().then(setData).catch(console.error).finally(() => setLoading(false));
    }, []);

    // Extract Unique Options from Data
    const uniqueSchools = useMemo(() => {
        const schools = new Set(data.map(d => d.sekolah).filter(Boolean));
        return Array.from(schools).sort();
    }, [data]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students]);

    const uniqueSubjects = useMemo(() => {
        const subjs = new Set(data.map(d => d.mapel).filter(Boolean));
        return Array.from(subjs).sort();
    }, [data]);

    const filteredData = useMemo(() => {
        return data.filter(d => {
            const userKec = userMap[d.username]?.kecamatan || '-';
            
            const matchSchool = filterSchool === 'all' || (d.sekolah && d.sekolah.toLowerCase() === filterSchool.toLowerCase());
            const matchKecamatan = filterKecamatan === 'all' || (userKec && userKec.toLowerCase() === filterKecamatan.toLowerCase());
            const matchSubject = filterSubject === 'all' || d.mapel === filterSubject;

            return matchSchool && matchKecamatan && matchSubject;
        });
    }, [data, filterSchool, filterKecamatan, filterSubject, userMap]);

    const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setFilterSchool(val);
        if (val !== 'all') {
            const sample = students.find(s => s.school === val);
            if (sample && sample.kecamatan) setFilterKecamatan(sample.kecamatan);
        } else {
            setFilterKecamatan('all');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2"><LayoutDashboard size={20}/> Rekapitulasi Nilai</h3>
                    <p className="text-xs text-slate-400">Menampilkan semua data nilai yang masuk di database.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-wrap">
                     <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                        <option value="all">Semua Mata Pelajaran</option>
                        {uniqueSubjects.map((s:any) => <option key={s} value={s}>{s}</option>)}
                     </select>
                     <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}>
                        <option value="all">Semua Kecamatan</option>
                        {uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}
                     </select>
                     <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterSchool} onChange={handleSchoolChange}>
                        <option value="all">Semua Sekolah</option>
                        {uniqueSchools.map((s:any) => <option key={s} value={s}>{s}</option>)}
                     </select>
                     <button onClick={() => exportToExcel(filteredData, `Rekap_Nilai_${filterSubject}`)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">
                        <FileText size={16}/> Export
                     </button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-xs">
                        <tr>
                            <th className="p-4 w-12 text-center">No</th>
                            <th className="p-4">Waktu Submit</th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Nama Peserta</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Kecamatan</th>
                            <th className="p-4 text-center bg-indigo-50/50 border-l border-slate-200">Mata Pelajaran</th>
                            <th className="p-4 text-center border-l border-slate-200 bg-emerald-50/50">Nilai Akhir</th>
                            <th className="p-4 text-center">Durasi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={9} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat semua data nilai...</td></tr>
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan={9} className="p-8 text-center text-slate-400 italic">Data tidak ditemukan untuk filter ini.</td></tr>
                        ) : (
                            filteredData.map((d, i) => {
                                const userKec = userMap[d.username]?.kecamatan || '-';
                                return (
                                <tr key={i} className="hover:bg-slate-50 transition">
                                    <td className="p-4 text-center text-slate-500">{i + 1}</td>
                                    <td className="p-4 text-xs text-slate-500">{new Date(d.timestamp).toLocaleString('id-ID')}</td>
                                    <td className="p-4 font-mono text-slate-600 font-bold">{d.username}</td>
                                    <td className="p-4 font-bold text-slate-700">{d.nama}</td>
                                    <td className="p-4 text-slate-600">{d.sekolah}</td>
                                    <td className="p-4 text-slate-600">{userKec}</td>
                                    <td className="p-4 text-center border-l border-slate-100 bg-indigo-50/10 font-bold text-indigo-700">
                                        {d.mapel}
                                    </td>
                                    <td className="p-4 text-center border-l border-slate-100 bg-emerald-50/10">
                                        <span className="text-lg font-black text-emerald-600">{d.nilai}</span>
                                    </td>
                                    <td className="p-4 text-center text-xs text-slate-500 font-mono">
                                        {formatDurationToText(d.durasi)}
                                    </td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs text-slate-400">
                <span>Total Data: {filteredData.length}</span>
                {filterSubject !== 'all' && <span>Filter Mapel: <b>{filterSubject}</b></span>}
            </div>
        </div>
    );
};

export default RekapTab;