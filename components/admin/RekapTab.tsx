
import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, FileText, Loader2, Printer } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel, formatDurationToText } from '../../utils/adminHelpers';
import { User } from '../../types';

const RekapTab = ({ students, currentUser }: { students: any[], currentUser: User }) => {
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

    const handlePrint = () => {
        if (filteredData.length === 0) return alert("Tidak ada data untuk dicetak.");
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const schoolName = filterSchool !== 'all' ? filterSchool : 'SEMUA SEKOLAH';
        const kecamatanName = filterKecamatan !== 'all' ? filterKecamatan : (filterSchool !== 'all' ? (userMap[filteredData[0]?.username]?.kecamatan || '-') : 'SEMUA KECAMATAN');
        const subjectName = filterSubject !== 'all' ? filterSubject : 'SEMUA MATA PELAJARAN';
        
        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const adminName = currentUser.nama_lengkap;

        const rows = filteredData.map((d, i) => `
            <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${d.username}</td>
                <td>${d.nama}</td>
                <td>${d.sekolah}</td>
                <td style="text-align: center;">${d.mapel}</td>
                <td style="text-align: center; font-weight: bold;">${d.nilai}</td>
            </tr>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cetak Rekap Nilai</title>
                <style>
                    @page { size: A4 portrait; margin: 2.5cm; }
                    body { font-family: 'Times New Roman', serif; font-size: 12pt; }
                    .header { text-align: center; margin-bottom: 20px; text-transform: uppercase; font-weight: bold; }
                    .header h2 { margin: 0; font-size: 14pt; }
                    .header h3 { margin: 5px 0 0; font-size: 12pt; font-weight: normal; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11pt; }
                    th, td { border: 1px solid black; padding: 5px 8px; }
                    th { background-color: #f0f0f0; text-align: center; }
                    .signature { float: right; margin-top: 40px; text-align: center; width: 250px; }
                    .signature p { margin: 0; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>REKAP NILAI OSN-S</h2>
                    <h3>${schoolName} - ${kecamatanName}</h3>
                    ${filterSubject !== 'all' ? `<h3 style="font-size: 11pt; margin-top: 5px;">Mapel: ${subjectName}</h3>` : ''}
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th width="40">No</th>
                            <th>Username</th>
                            <th>Nama Peserta</th>
                            <th>Sekolah</th>
                            <th>Mapel</th>
                            <th>Nilai</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>

                <div class="signature">
                    <p>Tuban, ${dateStr}</p>
                    <p>Admin / Proktor</p>
                    <br><br><br><br>
                    <p><b>${adminName}</b></p>
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
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
                     <button onClick={handlePrint} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition shadow-sm">
                        <Printer size={16}/> Cetak
                     </button>
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
