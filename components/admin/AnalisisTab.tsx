import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, FileText, Loader2, Filter, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel } from '../../utils/adminHelpers';
import { Exam } from '../../types';

const AnalisisTab = ({ students }: { students: any[] }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState('');
    
    // Data States
    const [resultsData, setResultsData] = useState<any[]>([]);
    const [questionsData, setQuestionsData] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    
    // Helper Maps
    const userMap = useMemo(() => {
        const map: Record<string, any> = {};
        students.forEach(s => map[s.username] = s);
        return map;
    }, [students]);

    useEffect(() => { 
        api.getExams().then(res => {
            setExams(res);
        }); 
    }, []);

    // Load Data when Exam Selected
    useEffect(() => {
        if (!selectedExam) {
            setResultsData([]);
            setQuestionsData([]);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Get Questions to determine Columns/Headers
                const qData = await api.getQuestions(selectedExam);
                
                // Limit questions columns based on Exam Configuration
                const currentExamConfig = exams.find(e => e.id === selectedExam);
                let finalQuestions = qData;
                
                if (currentExamConfig && currentExamConfig.max_questions && currentExamConfig.max_questions > 0) {
                    finalQuestions = qData.slice(0, currentExamConfig.max_questions);
                }

                setQuestionsData(finalQuestions);

                // 2. Get Student Results (Analysis JSON)
                const rData = await api.getAnalysis(selectedExam);
                setResultsData(rData);
            } catch (e) {
                console.error("Failed to load analysis data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedExam, exams]);

    const uniqueSchools = useMemo(() => {
        const schools = new Set(resultsData.map(d => d.sekolah).filter(Boolean));
        return Array.from(schools).sort();
    }, [resultsData]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students]);

    // Process Data
    const processedData = useMemo(() => {
        // Filter Students
        const filtered = resultsData.filter(d => {
            const user = userMap[d.username];
            const userKecamatan = user ? user.kecamatan : '-';
            const schoolMatch = filterSchool === 'all' || d.sekolah === filterSchool;
            const kecMatch = filterKecamatan === 'all' || (userKecamatan && userKecamatan.toLowerCase() === filterKecamatan.toLowerCase());
            return schoolMatch && kecMatch;
        });

        // Parse JSON for each student
        const rows = filtered.map(d => {
            let ansMap = {};
            try {
                ansMap = typeof d.analisis === 'string' ? JSON.parse(d.analisis) : d.analisis || {};
            } catch (e) { console.error("JSON Parse Error", e); }
            return { ...d, ansMap };
        });

        // Calculate Stats Per Question (Item Difficulty)
        const questionStats: Record<string, { correct: number, total: number }> = {};
        
        // Initialize stats
        questionsData.forEach(q => { questionStats[q.id] = { correct: 0, total: 0 }; });

        rows.forEach(row => {
            questionsData.forEach(q => {
                const isCorrect = row.ansMap[q.id] === 1;
                if (questionStats[q.id]) {
                    questionStats[q.id].total++;
                    if (isCorrect) questionStats[q.id].correct++;
                }
            });
        });

        return { rows, questionStats };
    }, [resultsData, questionsData, filterSchool, filterKecamatan, userMap]);

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

    const { rows, questionStats } = processedData;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2"><BarChart3 size={20}/> Analisis Butir Soal</h3>
                    <p className="text-xs text-slate-400">Database sinkron: Jawaban per butir soal & tingkat kesulitan.</p>
                </div>
                
                <div className="flex flex-col xl:flex-row gap-2 w-full md:w-auto">
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}><option value="all">Semua Kecamatan</option>{uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}</select>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterSchool} onChange={handleSchoolChange}><option value="all">Semua Sekolah</option>{uniqueSchools.map((s:any) => <option key={s} value={s}>{s}</option>)}</select>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-indigo-50 text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-100 min-w-[200px]" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}><option value="">-- Pilih Ujian --</option>{exams.map(e => <option key={e.id} value={e.id}>{e.nama_ujian}</option>)}</select>
                    
                    {rows.length > 0 && (
                        <button onClick={() => {
                            const exportData = rows.map(d => {
                                const row: any = { Nama: d.nama, Sekolah: d.sekolah, Kecamatan: userMap[d.username]?.kecamatan || '-', Nilai: d.nilai };
                                questionsData.forEach((q, idx) => row[`No_${idx+1}`] = d.ansMap[q.id]);
                                return row;
                            });
                            exportToExcel(exportData, `Analisis_${selectedExam}`);
                        }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"><FileText size={16}/> Export</button>
                    )}
                </div>
            </div>

            {!selectedExam ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Filter size={40} className="text-slate-300 mb-2"/>
                    <p className="text-slate-400 font-medium">Pilih Ujian (Mata Pelajaran) untuk menampilkan analisis.</p>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={40} className="text-indigo-600 animate-spin mb-4"/>
                    <p className="text-slate-500 font-bold">Sedang mengambil data dari database...</p>
                </div>
            ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border border-slate-100">
                    <AlertCircle size={40} className="text-slate-300 mb-2"/>
                    <p className="text-slate-400 font-medium">Belum ada data nilai masuk untuk filter ini.</p>
                </div>
            ) : (
                <div className="relative border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                        <table className="w-full text-xs text-left whitespace-nowrap">
                            <thead className="bg-slate-50 font-bold text-slate-600 uppercase sticky top-0 z-20 shadow-sm">
                                <tr>
                                    <th className="p-3 w-10 text-center border-r border-slate-200 bg-slate-50">No</th>
                                    <th className="p-3 sticky left-0 bg-slate-50 z-30 border-r border-slate-200 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Peserta</th>
                                    <th className="p-3 border-r border-slate-200 min-w-[150px] bg-slate-50">Sekolah</th>
                                    <th className="p-3 border-r border-slate-200 text-center bg-indigo-50 text-indigo-700 w-16">Nilai</th>
                                    {questionsData.map((q, idx) => (
                                        <th key={q.id} className="p-2 text-center min-w-[35px] border-r border-slate-100" title={q.text_soal}>
                                            {idx + 1}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((d, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-2 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
                                        <td className="p-2 font-bold text-slate-700 sticky left-0 bg-white border-r border-slate-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate max-w-[200px]">
                                            {d.nama}
                                            <div className="text-[9px] text-slate-400 font-normal">{d.username}</div>
                                        </td>
                                        <td className="p-2 text-slate-500 border-r border-slate-100 truncate max-w-[150px]">{d.sekolah}</td>
                                        <td className="p-2 font-black text-center text-indigo-600 bg-indigo-50/20 border-r border-slate-100">{d.nilai}</td>
                                        
                                        {/* Dynamic Question Columns */}
                                        {questionsData.map(q => {
                                            const val = d.ansMap[q.id];
                                            let cellClass = "bg-slate-50"; // Default / Null
                                            if (val === 1) cellClass = "bg-emerald-100 text-emerald-700";
                                            else if (val === 0) cellClass = "bg-rose-100 text-rose-700";
                                            
                                            return (
                                                <td key={q.id} className={`p-1 text-center font-bold border-r border-slate-50 ${cellClass}`}>
                                                    {val === 1 ? '1' : val === 0 ? '0' : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                            
                            {/* Summary Footer */}
                            <tfoot className="bg-slate-100 font-bold text-slate-600 sticky bottom-0 z-20 shadow-[0_-2px_5px_rgba(0,0,0,0.05)]">
                                <tr>
                                    <td colSpan={4} className="p-3 text-right border-r border-slate-200">Persentase Benar (Tingkat Kesulitan)</td>
                                    {questionsData.map(q => {
                                        const stats = questionStats[q.id];
                                        const percent = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                                        
                                        let colorClass = "text-slate-500";
                                        if (percent > 70) colorClass = "text-emerald-600"; // Mudah
                                        else if (percent < 30) colorClass = "text-rose-600"; // Sulit
                                        else colorClass = "text-blue-600"; // Sedang

                                        return (
                                            <td key={q.id} className={`p-2 text-center text-[10px] border-r border-slate-200 ${colorClass}`}>
                                                {percent}%
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalisisTab;