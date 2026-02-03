import React, { useState, useMemo, useEffect } from 'react';
import { ClipboardList, FileText, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel } from '../../utils/adminHelpers';

const RekapSurveyTab = () => {
    const [selectedSurvey, setSelectedSurvey] = useState('Survey_Karakter');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.getSurveyRecap(selectedSurvey);
                setData(res);
            } catch(e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, [selectedSurvey]);

    const getSurveyPredicate = (avgVal: any) => {
        const val = parseFloat(avgVal);
        if (isNaN(val)) return "-";
        if (val > 3.25) return "Sangat Baik";
        if (val > 2.5) return "Baik";
        if (val > 1.75) return "Cukup";
        return "Kurang";
    };

    const getPredicateColor = (pred: string) => {
        switch(pred) {
            case "Sangat Baik": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "Baik": return "bg-blue-100 text-blue-700 border-blue-200";
            case "Cukup": return "bg-orange-100 text-orange-700 border-orange-200";
            default: return "bg-red-100 text-red-700 border-red-200";
        }
    };

    const handleExport = () => {
        const exportData = data.map((d, i) => {
            const row: any = {
                No: i + 1,
                Timestamp: d.timestamp,
                Username: d.username,
                Nama: d.nama,
                Sekolah: d.sekolah,
                Kecamatan: d.kecamatan, 
                "Total Skor": d.total,
                "Rata-rata": d.rata,
                "Predikat": getSurveyPredicate(d.rata),
                Durasi: d.durasi
            };
            if(d.items) {
                Object.keys(d.items).forEach(k => {
                    row[k] = d.items[k];
                });
            }
            return row;
        });
        exportToExcel(exportData, `Rekap_${selectedSurvey}`, "Data");
    };

    const questionKeys = useMemo(() => {
        const keys = new Set<string>();
        data.forEach(d => {
            if (d.items) {
                Object.keys(d.items).forEach(k => keys.add(k));
            }
        });
        return Array.from(keys).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
    }, [data]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden fade-in">
             <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-slate-800 flex items-left gap-2"><ClipboardList size={20}/> Rekap & Analisis Survey</h3>
                    <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 4: Sangat Sesuai</span>
                        <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 3: Sesuai</span>
                        <span className="flex items-center gap-1 text-orange-600"><span className="w-2 h-2 rounded-full bg-orange-500"></span> 2: Kurang</span>
                        <span className="flex items-center gap-1 text-red-600"><span className="w-2 h-2 rounded-full bg-red-500"></span> 1: Sangat Kurang</span>
                    </div>
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                     <select className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-sm w-full lg:w-auto outline-none focus:ring-2 focus:ring-indigo-100" value={selectedSurvey} onChange={e => setSelectedSurvey(e.target.value)}>
                        <option value="Survey_Karakter">Survey Karakter</option>
                        <option value="Survey_Lingkungan">Survey Lingkungan Belajar</option>
                     </select>
                     <button onClick={handleExport} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 border border-emerald-100 transition shadow-sm">
                        <FileText size={14}/> Export
                     </button>
                </div>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                         <tr>
                             <th className="p-4 w-12 text-center border-r border-slate-200">No</th>
                             <th className="p-4 border-r border-slate-200">Username</th>
                             <th className="p-4 sticky left-0 bg-slate-50 border-r border-slate-200 z-10 min-w-[150px]">Nama</th>
                             <th className="p-4 min-w-[120px]">Sekolah</th>
                             <th className="p-4 min-w-[120px]">Kecamatan</th>
                             <th className="p-4 text-center">Total</th>
                             <th className="p-4 text-center border-r border-slate-200">Rata-rata</th>
                             <th className="p-4 text-center border-r border-slate-200">Predikat</th>
                             {questionKeys.map(k => (
                                 <th key={k} className="p-4 text-center min-w-[40px] border-l border-slate-100">{k}</th>
                             ))}
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                         {loading ? (
                             <tr><td colSpan={8 + questionKeys.length} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat...</td></tr>
                         ) : data.length === 0 ? (
                             <tr><td colSpan={8 + questionKeys.length} className="p-8 text-center text-slate-400">Belum ada data survey ini.</td></tr>
                         ) : data.map((d, i) => {
                             const pred = getSurveyPredicate(d.rata);
                             return (
                             <tr key={i} className="hover:bg-slate-50 transition">
                                 <td className="p-4 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
                                 <td className="p-4 font-mono text-slate-600 border-r border-slate-100">{d.username}</td>
                                 <td className="p-4 font-bold text-slate-700 sticky left-0 bg-white border-r border-slate-100 shadow-sm">{d.nama}</td>
                                 <td className="p-4 text-slate-600 text-xs">{d.sekolah}</td>
                                 <td className="p-4 text-slate-600 text-xs">{d.kecamatan}</td>
                                 <td className="p-4 text-center font-bold text-indigo-600">{d.total}</td>
                                 <td className="p-4 text-center font-bold bg-indigo-50 text-indigo-700 border-r border-slate-100">{d.rata}</td>
                                 <td className="p-4 text-center border-r border-slate-100">
                                     <span className={`px-2 py-1 rounded text-xs font-bold border ${getPredicateColor(pred)}`}>
                                         {pred}
                                     </span>
                                 </td>
                                 {questionKeys.map(k => {
                                     const valStr = d.items?.[k];
                                     const val = parseInt(valStr);
                                     let bgClass = "text-slate-300";
                                     if (val === 4) bgClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                                     else if (val === 3) bgClass = "bg-blue-50 text-blue-700 border-blue-100";
                                     else if (val === 2) bgClass = "bg-orange-50 text-orange-700 border-orange-100";
                                     else if (val === 1) bgClass = "bg-red-50 text-red-700 border-red-100";
                                     
                                     return (
                                         <td key={k} className={`p-2 text-center text-xs font-bold border-l border-b border-slate-50 ${bgClass}`}>
                                             {valStr || '-'}
                                         </td>
                                     );
                                 })}
                             </tr>
                             );
                         })}
                     </tbody>
                 </table>
             </div>
        </div>
    );
};

export default RekapSurveyTab;
