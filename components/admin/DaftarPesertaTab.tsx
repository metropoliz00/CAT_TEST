
import React, { useState, useEffect, useMemo } from 'react';
import { Users, FileText, Download, Upload, Loader2, Plus, Search, Edit, Trash2, X, Camera, Save, User as UserIcon, Check } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';
import * as XLSX from 'xlsx';
import { exportToExcel } from '../../utils/adminHelpers';

const DaftarPesertaTab = ({ currentUser, onDataChange }: { currentUser: User, onDataChange: () => void }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<{
        id: string; username: string; password: string; fullname: string; role: string; 
        school: string; kecamatan: string; gender: string; photo?: string; photo_url?: string 
    }>({ id: '', username: '', password: '', fullname: '', role: 'siswa', school: '', kecamatan: '', gender: 'L', photo: '', photo_url: '' });
    
    useEffect(() => { loadUsers(); }, []);
    
    // Only load students here
    const loadUsers = async () => { 
        setLoading(true); 
        try { 
            const data = await api.getUsers(); 
            // Filter strictly for students
            const studentOnly = data.filter((u:any) => u.role === 'siswa');
            setUsers(studentOnly); 
        } catch(e) { console.error(e); } 
        finally { setLoading(false); } 
    };
    
    const handleDelete = async (username: string) => { if(!confirm("Yakin ingin menghapus siswa ini?")) return; setLoading(true); try { await api.deleteUser(username); setUsers(prev => prev.filter(u => u.username !== username)); onDataChange(); } catch (e) { alert("Gagal menghapus user."); } finally { setLoading(false); } };
    
    const handleEdit = (user: any) => { 
        setFormData({ 
            id: user.id, username: user.username, password: user.password, fullname: user.fullname, 
            role: 'siswa', school: user.school || '', kecamatan: user.kecamatan || '', gender: user.gender || 'L',
            photo: '', photo_url: user.photo_url || ''
        }); 
        setIsModalOpen(true); 
    };
    
    const handleAdd = () => { 
        setFormData({ 
            id: '', username: '', password: '', fullname: '', role: 'siswa', 
            school: currentUser.role === 'admin_sekolah' ? currentUser.kelas_id : '', 
            kecamatan: '', gender: 'L', photo: '', photo_url: '' 
        }); 
        setIsModalOpen(true); 
    };
    
    const handleSave = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        setIsSaving(true); 
        try { 
            // Force role to siswa
            const payload = { ...formData, role: 'siswa' };
            await api.saveUser(payload); 
            await loadUsers(); 
            setIsModalOpen(false); 
            onDataChange(); 
        } catch (e) { console.error(e); alert("Gagal menyimpan data."); } 
        finally { setIsSaving(false); } 
    };

    const uniqueSchools = useMemo<string[]>(() => { const schools = new Set(users.map(u => u.school).filter(Boolean)); return Array.from(schools).sort() as string[]; }, [users]);
    const filteredUsers = useMemo(() => { 
        let res = users; 
        if (filterSchool !== 'all') res = res.filter(u => u.school === filterSchool); 
        if (searchTerm) { const lower = searchTerm.toLowerCase(); res = res.filter(u => u.username.toLowerCase().includes(lower) || u.fullname.toLowerCase().includes(lower) || (u.school && u.school.toLowerCase().includes(lower)) || (u.kecamatan && u.kecamatan.toLowerCase().includes(lower))); } 
        if (currentUser.role === 'admin_sekolah') res = res.filter(u => (u.school || '').toLowerCase() === (currentUser.kelas_id || '').toLowerCase()); 
        return res; 
    }, [users, filterSchool, searchTerm, currentUser]);
    
    const handleExport = () => { const dataToExport = filteredUsers.map((u, i) => ({ No: i + 1, Username: u.username, Password: u.password, "Nama Lengkap": u.fullname, Role: u.role, "Jenis Kelamin": u.gender, "Sekolah / Kelas": u.school, "Kecamatan": u.kecamatan || '-' })); exportToExcel(dataToExport, "Data_Siswa", "Users"); };
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (!e.target.files || e.target.files.length === 0) return; setIsImporting(true); const file = e.target.files[0]; const reader = new FileReader(); reader.onload = async (evt) => { try { const bstr = evt.target?.result; const wb = XLSX.read(bstr, { type: 'binary' }); const wsName = wb.SheetNames[0]; const ws = wb.Sheets[wsName]; const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }); const parsedUsers = []; for (let i = 1; i < data.length; i++) { const row: any = data[i]; if (!row[0]) continue; parsedUsers.push({ username: String(row[0]), password: String(row[1]), role: 'siswa', fullname: String(row[3]), gender: String(row[4] || 'L').toUpperCase(), school: String(row[5] || ''), kecamatan: String(row[6] || ''), photo_url: String(row[7] || '') }); } if (parsedUsers.length > 0) { await api.importUsers(parsedUsers); alert(`Berhasil mengimpor ${parsedUsers.length} siswa.`); await loadUsers(); onDataChange(); } else { alert("Tidak ada data valid yang ditemukan."); } } catch (err) { console.error(err); alert("Gagal membaca file Excel."); } finally { setIsImporting(false); if (e.target) e.target.value = ''; } }; reader.readAsBinaryString(file); };
    const downloadTemplate = () => { const ws = XLSX.utils.json_to_sheet([ { "Username": "siswa001", "Password": "123", "Role (Biarkan Kosong/siswa)": "siswa", "Nama Lengkap": "Ahmad Siswa", "L/P": "L", "Sekolah / Kelas": "UPT SD Negeri Remen 2", "Kecamatan": "Jenu", "Link Foto (Opsional)": "https://..." }]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Template_Siswa"); XLSX.writeFile(wb, "Template_Import_Siswa.xlsx"); };
    
    // Handle Image Selection and Compression
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { alert("Ukuran file terlalu besar. Maks 2MB"); return; }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const maxSize = 500;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
                    canvas.width = Math.floor(width); canvas.height = Math.floor(height);
                    if (ctx) { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); const dataUrl = canvas.toDataURL('image/jpeg', 0.9); setFormData(prev => ({ ...prev, photo: dataUrl })); }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-6 fade-in space-y-6">
             {/* Header */}
             <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-100 pb-6">
                 <div>
                     <h3 className="font-black text-2xl text-slate-800 flex items-center gap-2"><Users size={28} className="text-indigo-600"/> Daftar Siswa (Peserta)</h3>
                     <p className="text-slate-400 text-sm font-medium mt-1">Total {filteredUsers.length} siswa terdaftar.</p>
                 </div>
                 <div className="flex flex-wrap gap-3">
                    <button onClick={handleExport} className="bg-white text-emerald-600 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-50 transition border-2 border-emerald-100 shadow-sm active:scale-95"><FileText size={16}/> Export Excel</button>
                    {currentUser.role === 'admin_pusat' && (
                        <>
                        <button onClick={downloadTemplate} className="bg-white text-slate-500 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition border-2 border-slate-200 active:scale-95"><Download size={16}/> Template</button>
                        <label className={`cursor-pointer bg-emerald-50 text-emerald-600 border-2 border-emerald-100 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-100 transition active:scale-95 ${isImporting ? 'opacity-50 cursor-wait' : ''}`}>
                            {isImporting ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>} {isImporting ? "Importing..." : "Import Siswa"}
                            <input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
                        </label>
                        </>
                    )}
                    <button onClick={handleAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 active:scale-95"><Plus size={16}/> Tambah Siswa</button>
                 </div>
             </div>
             
             {/* Search & Filter Bar */}
             <div className="flex flex-col md:flex-row gap-4 bg-slate-50/50 p-1 rounded-2xl">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input type="text" placeholder="Cari Username, Nama, Sekolah..." className="w-full pl-11 pr-4 py-3 border-2 border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-500 bg-white font-bold text-slate-600 transition-colors" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                {currentUser.role === 'admin_pusat' && (
                    <select className="p-3 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-500 outline-none focus:border-indigo-500 bg-white cursor-pointer hover:border-slate-300 transition-colors appearance-none" value={filterSchool} onChange={e => setFilterSchool(e.target.value)}><option value="all">Semua Sekolah</option>{uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}</select>
                )}
             </div>

             <div className="overflow-x-auto rounded-2xl border border-slate-100">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[11px] tracking-wider backdrop-blur-sm">
                         <tr>
                             <th className="p-5">User Profile</th>
                             <th className="p-5">Role</th>
                             <th className="p-5">Sekolah / Kelas</th>
                             <th className="p-5">Kecamatan</th>
                             <th className="p-5 text-center">Aksi</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 bg-white">
                         {loading ? (<tr><td colSpan={5} className="p-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat database...</td></tr>) : filteredUsers.length === 0 ? (<tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Data tidak ditemukan.</td></tr>) : (filteredUsers.map(u => (
                         <tr key={u.id || u.username} className="hover:bg-slate-50 transition group">
                             <td className="p-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm shrink-0 bg-slate-50 flex items-center justify-center">
                                        {u.photo_url ? <img src={u.photo_url} alt="Profile" className="w-full h-full object-cover" /> : <span className="font-bold text-slate-300 text-xs">{u.fullname.charAt(0)}</span>}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{u.fullname}</div>
                                        <div className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded w-fit mt-0.5">{u.username}</div>
                                    </div>
                                </div>
                             </td>
                             <td className="p-4"><span className="px-2 py-1 rounded text-[10px] font-extrabold uppercase border bg-slate-100 text-slate-500 border-slate-200">Siswa</span></td>
                             <td className="p-4 text-slate-600 text-xs font-bold">{u.school || '-'}</td>
                             <td className="p-4 text-slate-500 text-xs font-medium">{u.kecamatan || '-'}</td>
                             <td className="p-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => handleEdit(u)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition border border-amber-100"><Edit size={14}/></button>
                                 <button onClick={() => handleDelete(u.username)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition border border-rose-100"><Trash2 size={14}/></button>
                             </td>
                         </tr>)))}
                     </tbody>
                 </table>
             </div>

             {/* Modern Modal */}
             {isModalOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in">
                     <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col border border-white/20 transform scale-100 transition-all">
                         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                             <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">{formData.id ? <><Edit size={24} className="text-amber-500"/> Edit Data Siswa</> : <><Plus size={24} className="text-indigo-500"/> Tambah Siswa Baru</>}</h3>
                             <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                         </div>
                         <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-50/50">
                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="flex justify-center mb-6">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center">
                                            {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" /> : <Camera size={32} className="text-slate-400"/>}
                                        </div>
                                        <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 shadow-md border-2 border-white transition-transform hover:scale-110">
                                            <Upload size={14}/>
                                            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleImageChange} />
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="group">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Username</label>
                                            <input required type="text" className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={!!formData.id} />
                                        </div>
                                        <div className="group">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Password</label>
                                            <input required type="text" className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Nama Lengkap</label>
                                        <input required type="text" className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all" value={formData.fullname} onChange={e => setFormData({...formData, fullname: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="group">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Role</label>
                                            <input type="text" className="w-full p-3 bg-slate-100 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed" value="Siswa" disabled />
                                        </div>
                                        <div className="group">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">L/P</label>
                                            <select className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all appearance-none" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="group">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Kelas / Sekolah</label>
                                            <input required type="text" className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} placeholder="Nama Sekolah" disabled={currentUser.role === 'admin_sekolah'} />
                                        </div>
                                        <div className="group">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Kecamatan</label>
                                            <input type="text" className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all" value={formData.kecamatan} onChange={e => setFormData({...formData, kecamatan: e.target.value})} placeholder="Kecamatan"/>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 border-2 border-slate-200 text-slate-500 rounded-xl font-bold hover:bg-slate-100 hover:text-slate-700 transition">Batal</button>
                                    <button type="submit" disabled={isSaving} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 transform active:scale-95 transition-all">{isSaving ? <Loader2 size={20} className="animate-spin"/> : <Check size={20}/>} Simpan</button>
                                </div>
                            </form>
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
};

export default DaftarPesertaTab;
