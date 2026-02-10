
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Home, LogOut, Menu, Monitor, Group, Clock, Printer, List, Calendar, Key, FileQuestion, LayoutDashboard, BarChart3, Award, RefreshCw, X, CreditCard, Bell, CheckCircle2, ChevronDown, User as UserIcon, Settings, Camera, Upload, Save, Loader2, Shield } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { DashboardSkeleton } from '../utils/adminHelpers';

// Import New Sub-components
import OverviewTab from './admin/OverviewTab';
import AturGelombangTab from './admin/AturGelombangTab';
import KelompokTesTab from './admin/KelompokTesTab';
import AturSesiTab from './admin/AturSesiTab';
import CetakAbsensiTab from './admin/CetakAbsensiTab';
import CetakKartuTab from './admin/CetakKartuTab';
import RekapTab from './admin/RekapTab';
import RankingTab from './admin/RankingTab';
import AnalisisTab from './admin/AnalisisTab';
import StatusTesTab from './admin/StatusTesTab';
import DaftarPesertaTab from './admin/DaftarPesertaTab';
import ManajemenAdminTab from './admin/ManajemenAdminTab';
import RilisTokenTab from './admin/RilisTokenTab';
import BankSoalTab from './admin/BankSoalTab';

interface AdminDashboardProps {
    user: User;
    onLogout: () => void;
}

type TabType = 'overview' | 'rekap' | 'analisis' | 'ranking' | 'bank_soal' | 'data_user' | 'manajemen_admin' | 'status_tes' | 'kelompok_tes' | 'rilis_token' | 'atur_sesi' | 'atur_gelombang' | 'cetak_absensi' | 'cetak_kartu';

// Enhanced Loading Component
const DashboardLoadingScreen = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 fade-in">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
      <div className="w-20 h-20 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute inset-0"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
      </div>
    </div>
    <div className="text-center space-y-2">
      <h3 className="text-xl font-black text-slate-800 tracking-tight">Memuat Dashboard</h3>
      <p className="text-slate-400 text-sm font-medium">Sedang menyinkronkan data ujian & peserta...</p>
    </div>
  </div>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
      const savedTab = localStorage.getItem('cbt_admin_tab');
      return (savedTab as TabType) || 'overview';
  });

  const [dashboardData, setDashboardData] = useState<any>({ 
      students: [], 
      questionsMap: {}, 
      totalUsers: 0, 
      token: 'TOKEN',
      duration: 60,
      maxQuestions: 0, 
      statusCounts: { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 },
      activityFeed: [],
      allUsers: [], 
      schedules: [] 
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); 
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  // Profile & Menu State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<User>(user);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Real-time Notification State
  const [finishAlert, setFinishAlert] = useState<{name: string, school: string} | null>(null);
  const lastFinishTimeRef = useRef<number>(Date.now());

  const [currentUserState, setCurrentUserState] = useState<User>(user);
  
  // UPDATED LOGO
  const logoUrl = "https://image2url.com/r2/default/images/1770216884638-0a7493fe-7dc5-4bde-8900-68d7b163679a.png";

  useEffect(() => {
    setCurrentUserState(user);
    setProfileForm(user);
  }, [user]);

  const handleTabChange = (tab: TabType) => {
      setActiveTab(tab);
      localStorage.setItem('cbt_admin_tab', tab);
      setIsSidebarOpen(false); 
  };

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
        const data = await api.getDashboardData();
        setDashboardData(data);
        
        if (data.allUsers && Array.isArray(data.allUsers)) {
            const freshUser = data.allUsers.find((u: any) => u.username === user.username);
            if (freshUser) {
                const updatedUser = { ...user, ...freshUser };
                setCurrentUserState(updatedUser);
                setProfileForm(updatedUser);
                localStorage.setItem('cbt_user', JSON.stringify(updatedUser));
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
        fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Monitor Activity Feed for NEW 'FINISH' events
  useEffect(() => {
      if (!dashboardData.activityFeed || !Array.isArray(dashboardData.activityFeed)) return;

      const newFinishes = dashboardData.activityFeed.filter((log: any) => 
          log.action === 'FINISH' && 
          new Date(log.timestamp).getTime() > lastFinishTimeRef.current
      );

      if (newFinishes.length > 0) {
          const maxTime = Math.max(...newFinishes.map((l:any) => new Date(l.timestamp).getTime()));
          lastFinishTimeRef.current = maxTime;

          let targetLog = newFinishes[0]; 
          
          if (currentUserState.role === 'admin_sekolah') {
              const mySchool = (currentUserState.kelas_id || '').toLowerCase();
              const schoolLog = newFinishes.find((l:any) => (l.school || '').toLowerCase() === mySchool);
              if (!schoolLog) return; 
              targetLog = schoolLog;
          }

          setFinishAlert({ name: targetLog.fullname, school: targetLog.school });
          const timer = setTimeout(() => setFinishAlert(null), 6000);
          return () => clearTimeout(timer);
      }
  }, [dashboardData.activityFeed, currentUserState]);

  const finishedStudents = useMemo(() => {
      if (!dashboardData.activityFeed) return [];
      let finished = dashboardData.activityFeed.filter((log: any) => log.action === 'FINISH');
      if (currentUserState.role === 'admin_sekolah') {
          const mySchool = (currentUserState.kelas_id || '').toLowerCase();
          finished = finished.filter((log: any) => (log.school || '').toLowerCase() === mySchool);
      }
      return finished.slice(0, 5);
  }, [dashboardData, currentUserState]);

  const getTabTitle = () => {
    switch(activeTab) {
        case 'overview': return "Dashboard Utama";
        case 'bank_soal': return "Manajemen Bank Soal";
        case 'rekap': return "Rekapitulasi Nilai";
        case 'analisis': return "Analisis Butir Soal";
        case 'ranking': return "Peringkat Peserta";
        case 'data_user': return "Daftar Peserta";
        case 'manajemen_admin': return "Manajemen Admin";
        case 'status_tes': return "Status Tes & Reset Login";
        case 'kelompok_tes': return "Kelompok Tes (Assignment)";
        case 'atur_sesi': return "Atur Sesi & Absensi";
        case 'atur_gelombang': return "Atur Gelombang Sekolah";
        case 'rilis_token': return "Rilis Token";
        case 'cetak_absensi': return "Cetak Absensi";
        case 'cetak_kartu': return "Cetak Kartu Peserta";
        default: return "Dashboard";
    }
  };

  const formatRole = (role: string) => {
      if (role === 'admin_pusat') return 'Administrator';
      if (role === 'admin_sekolah') return 'Proktor Sekolah';
      return 'Peserta';
  };

  // Image Helper for Profile
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                    if (ctx) { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); const dataUrl = canvas.toDataURL('image/jpeg', 0.9); setProfileForm(prev => ({ ...prev, photo_url: dataUrl })); }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingProfile(true);
      try {
          // Prepare payload matching backend expected structure
          const payload = {
              id: profileForm.id,
              username: profileForm.username,
              password: profileForm.password,
              role: profileForm.role,
              fullname: profileForm.nama_lengkap, // Backend uses 'fullname'
              school: profileForm.kelas_id,
              kecamatan: profileForm.kecamatan,
              gender: profileForm.jenis_kelamin,
              photo_url: profileForm.photo_url
          };
          
          await api.saveUser(payload);
          await fetchData();
          alert("Profil berhasil diperbarui!");
          setIsProfileModalOpen(false);
      } catch (err) {
          console.error(err);
          alert("Gagal memperbarui profil.");
      } finally {
          setIsSavingProfile(false);
      }
  };

  const navButtonClass = (tab: TabType) => `
    flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-5'} w-full py-3.5 my-1 rounded-r-full text-sm font-bold transition-all duration-300 relative group
    ${activeTab === tab 
        ? 'text-red-700 bg-gradient-to-r from-red-50 to-white border-l-4 border-red-500 shadow-sm' 
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
    }
  `;

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 z-40 md:hidden fade-in backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}
      
      {/* Real-time Finish Alert Notification */}
      {finishAlert && (
        <div className="fixed top-24 right-6 z-[100] bg-white border-l-4 border-emerald-500 shadow-2xl rounded-r-xl p-4 flex items-center gap-4 animate-in slide-in-from-right-10 fade-in duration-500 max-w-sm cursor-pointer" onClick={() => setFinishAlert(null)}>
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full shrink-0 animate-bounce">
                <CheckCircle2 size={24} />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-800 text-sm">Peserta Selesai!</h4>
                <p className="text-xs text-slate-600 font-bold mt-0.5 truncate">{finishAlert.name}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">{finishAlert.school}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setFinishAlert(null); }} className="absolute top-2 right-2 text-slate-300 hover:text-slate-500 bg-transparent p-1 rounded-full"><X size={14}/></button>
        </div>
      )}
      
      {/* SIDEBAR */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-white flex flex-col transition-all duration-300 ease-in-out shadow-2xl md:shadow-slate-200/50 border-r border-slate-100 
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full'} 
        md:translate-x-0 md:static ${isCollapsed ? 'md:w-20' : 'md:w-72'}`}
      >
        <div className={`p-4 ${isCollapsed ? 'py-6 flex justify-center' : 'p-6 pb-2'}`}>
          <div className={`flex ${isCollapsed ? 'flex-col gap-4 items-center' : 'justify-between items-start'}`}>
            <div className={`${isCollapsed ? 'text-center' : ''}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center mb-0' : 'gap-3 mb-2'}`}>
                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 p-1 shrink-0 overflow-hidden">
                         <img src={logoUrl} className="w-full h-full object-contain" alt="Logo" />
                    </div>
                    {/* Collapsible Text */}
                    <div className={`flex flex-col justify-center transition-opacity duration-200 ${isCollapsed ? 'hidden' : 'opacity-100'}`}>
                        <span className="font-extrabold text-sm text-slate-800 leading-none tracking-tight">OLIMPIADE</span>
                        <span className="font-extrabold text-sm text-slate-800 leading-none tracking-tight"><span className="text-red-600">SAINS</span> <span className="text-blue-600">NASIONAL</span></span>
                    </div>
                </div>
            </div>
            
            {/* Toggle Button Desktop */}
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)} 
                className="hidden md:flex p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                <Menu size={20} />
            </button>

            {/* Close Button Mobile */}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600"><X size={24} /></button>
          </div>
        </div>
        
        <nav className="flex-1 pr-0 md:pr-4 space-y-1 overflow-y-auto custom-scrollbar py-2">
          <button onClick={() => handleTabChange('overview')} className={navButtonClass('overview')} title="Dashboard">
              <Home size={20} className="shrink-0" /> 
              {!isCollapsed && <span>Dashboard</span>}
          </button>
          
          <div className={`pt-6 pb-2 ${isCollapsed ? 'text-center' : 'pl-6'} text-[10px] font-extrabold text-slate-400 uppercase tracking-widest truncate`}>
              {isCollapsed ? '---' : 'Manajemen Ujian'}
          </div>
          
          <button onClick={() => handleTabChange('status_tes')} className={navButtonClass('status_tes')} title="Status Tes">
              <Monitor size={20} className="shrink-0" /> 
              {!isCollapsed && <span>Status Tes</span>}
          </button>
          <button onClick={() => handleTabChange('kelompok_tes')} className={navButtonClass('kelompok_tes')} title="Kelompok Tes">
              <Group size={20} className="shrink-0" /> 
              {!isCollapsed && <span>Kelompok Tes</span>}
          </button>
          <button onClick={() => handleTabChange('atur_sesi')} className={navButtonClass('atur_sesi')} title="Atur Sesi">
              <Clock size={20} className="shrink-0" /> 
              {!isCollapsed && <span>Atur Sesi</span>}
          </button>
          <button onClick={() => handleTabChange('cetak_kartu')} className={navButtonClass('cetak_kartu')} title="Cetak Kartu">
              <CreditCard size={20} className="shrink-0" /> 
              {!isCollapsed && <span>Cetak Kartu</span>}
          </button>
          <button onClick={() => handleTabChange('cetak_absensi')} className={navButtonClass('cetak_absensi')} title="Cetak Absensi">
              <Printer size={20} className="shrink-0" /> 
              {!isCollapsed && <span>Cetak Absensi</span>}
          </button>
          
          {(currentUserState.role === 'admin_pusat' || currentUserState.role === 'admin_sekolah') && (
            <button onClick={() => handleTabChange('data_user')} className={navButtonClass('data_user')} title="Daftar Peserta">
                <List size={20} className="shrink-0" /> 
                {!isCollapsed && <span>Daftar Peserta</span>}
            </button>
          )}
          
          <button onClick={() => handleTabChange('rilis_token')} className={navButtonClass('rilis_token')} title="Rilis Token">
              <Key size={20} className="shrink-0" /> 
              {!isCollapsed && <span>Rilis Token</span>}
          </button>

          {currentUserState.role === 'admin_pusat' && (
              <>
                <button onClick={() => handleTabChange('manajemen_admin')} className={navButtonClass('manajemen_admin')} title="Manajemen Admin">
                    <Shield size={20} className="shrink-0" /> 
                    {!isCollapsed && <span>Manajemen Admin</span>}
                </button>
                <button onClick={() => handleTabChange('atur_gelombang')} className={navButtonClass('atur_gelombang')} title="Atur Gelombang">
                    <Calendar size={20} className="shrink-0" /> 
                    {!isCollapsed && <span>Atur Gelombang</span>}
                </button>
              
                <div className={`pt-6 pb-2 ${isCollapsed ? 'text-center' : 'pl-6'} text-[10px] font-extrabold text-slate-400 uppercase tracking-widest truncate`}>
                    {isCollapsed ? '---' : 'Laporan & Data'}
                </div>
                <button onClick={() => handleTabChange('bank_soal')} className={navButtonClass('bank_soal')} title="Bank Soal">
                    <FileQuestion size={20} className="shrink-0" /> 
                    {!isCollapsed && <span>Bank Soal</span>}
                </button>
                <button onClick={() => handleTabChange('rekap')} className={navButtonClass('rekap')} title="Rekap Nilai">
                    <LayoutDashboard size={20} className="shrink-0" /> 
                    {!isCollapsed && <span>Rekap Nilai</span>}
                </button>
                <button onClick={() => handleTabChange('analisis')} className={navButtonClass('analisis')} title="Analisis Soal">
                    <BarChart3 size={20} className="shrink-0" /> 
                    {!isCollapsed && <span>Analisis Soal</span>}
                </button>
                <button onClick={() => handleTabChange('ranking')} className={navButtonClass('ranking')} title="Peringkat">
                    <Award size={20} className="shrink-0" /> 
                    {!isCollapsed && <span>Peringkat</span>}
                </button>
             </>
          )}
        </nav>

        <div className={`p-4 border-t border-slate-50 bg-white ${isCollapsed ? 'flex justify-center' : ''}`}>
            <div className={`bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-3 ${isCollapsed ? 'justify-center p-2' : ''}`}>
                {currentUserState.photo_url ? (
                    <img src={currentUserState.photo_url} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm shrink-0" alt="Profile" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 font-bold border border-slate-200 shadow-sm shrink-0">{currentUserState.username.charAt(0).toUpperCase()}</div>
                )}
                {!isCollapsed && (
                    <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate leading-tight">{currentUserState.nama_lengkap || currentUserState.username}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">{formatRole(currentUserState.role)}</p>
                    </div>
                )}
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth">
        <div className="max-w-7xl mx-auto pb-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-3 bg-white rounded-xl border border-slate-100 text-slate-600 shadow-sm hover:bg-slate-50 active:scale-95 transition"><Menu size={20} /></button>
                <div>
                    <h2 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">{getTabTitle()}</h2>
                    <p className="text-sm text-slate-400 font-medium hidden md:block">Selamat Datang, <span className="font-bold text-indigo-600">{currentUserState.nama_lengkap || currentUserState.username}</span></p>
                </div>
            </div>
            
            <div className="flex items-center gap-4 self-end md:self-auto w-full md:w-auto justify-end">
                {/* Notification Alerts */}
                <div className="relative group" onMouseLeave={() => setIsNotifOpen(false)}>
                    <button 
                        className="p-3 bg-white rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition relative active:scale-95"
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                    >
                        <Bell size={20} className={finishedStudents.length > 0 ? "text-red-600 animate-shake" : "text-slate-600"} />
                        {finishedStudents.length > 0 && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                        )}
                    </button>
                    
                    {/* Functional Dropdown for finished students */}
                    {isNotifOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-0 z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                                <p className="text-xs font-bold text-slate-500 uppercase">Selesai Mengerjakan</p>
                                <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-400 font-mono">Real-time</span>
                            </div>
                            <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                {finishedStudents.length > 0 ? (
                                    finishedStudents.map((s: any, i: number) => (
                                        <div key={i} className="p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition flex items-start gap-3 group">
                                            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-full shrink-0 mt-0.5 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 leading-tight">{s.fullname}</p>
                                                <p className="text-xs text-slate-500 mt-1">{s.school}</p>
                                                <p className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1">
                                                    <span>{new Date(s.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                                    <span>•</span>
                                                    <span>{s.details.split(':').pop() || 'Score -'}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                                        <Bell size={24} className="mb-2 opacity-20"/>
                                        <p className="text-sm italic">Belum ada aktivitas siswa selesai baru-baru ini.</p>
                                    </div>
                                )}
                            </div>
                            {finishedStudents.length > 0 && (
                                <div className="p-2 bg-slate-50 text-center text-[10px] text-slate-400 border-t border-slate-100">
                                    Menampilkan 5 data terakhir
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                <button onClick={fetchData} disabled={isRefreshing || loading} title="Refresh Data" className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-600 rounded-full hover:bg-indigo-50 transition border border-indigo-100 shadow-sm active:scale-95 disabled:opacity-50 font-bold text-xs">
                    <RefreshCw size={16} className={isRefreshing || loading ? "animate-spin" : ""} />
                    <span className="hidden sm:inline">Sinkronisasi</span>
                </button>

                {/* USER PROFILE DROPDOWN */}
                <div className="relative" onMouseLeave={() => setIsUserMenuOpen(false)}>
                    <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 pl-2 pr-4 py-2 bg-white rounded-full border border-slate-200 hover:border-slate-300 transition shadow-sm active:scale-95 group">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                            {currentUserState.photo_url ? (
                                <img src={currentUserState.photo_url} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">{currentUserState.username.charAt(0).toUpperCase()}</div>
                            )}
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-xs font-bold text-slate-700 leading-none">{currentUserState.username}</p>
                        </div>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUserMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                            <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                                <p className="text-xs font-bold text-slate-800 truncate">{currentUserState.nama_lengkap}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">{formatRole(currentUserState.role)}</p>
                            </div>
                            <button onClick={() => { setIsUserMenuOpen(false); setIsProfileModalOpen(true); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition flex items-center gap-2">
                                <UserIcon size={14} /> Profil Saya
                            </button>
                            <button onClick={onLogout} className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2 border-t border-slate-50">
                                <LogOut size={14} /> Keluar Aplikasi
                            </button>
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Floating Loading Indicator for Refresh */}
          {isRefreshing && !loading && (
               <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
                   <div className="bg-indigo-50 text-indigo-600 p-2 rounded-full border border-indigo-100">
                       <Loader2 size={20} className="animate-spin"/>
                   </div>
                   <div>
                       <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Sinkronisasi Data</p>
                       <p className="text-[10px] text-slate-500 font-medium">Memperbarui informasi server...</p>
                   </div>
               </div>
          )}

          {/* Content Area */}
          <div className="min-h-[500px]">
            {loading ? <DashboardLoadingScreen /> : (
                <>
                    {activeTab === 'overview' && <OverviewTab dashboardData={dashboardData} currentUserState={currentUserState} />}
                    {activeTab === 'status_tes' && <StatusTesTab currentUser={currentUserState} students={dashboardData.allUsers || []} refreshData={fetchData} />}
                    {activeTab === 'kelompok_tes' && <KelompokTesTab currentUser={currentUserState} students={dashboardData.allUsers || []} refreshData={fetchData} />}
                    {activeTab === 'atur_sesi' && <AturSesiTab currentUser={currentUserState} students={dashboardData.allUsers || []} refreshData={fetchData} isLoading={isRefreshing} />}
                    {activeTab === 'cetak_absensi' && <CetakAbsensiTab currentUser={currentUserState} students={dashboardData.allUsers || []} />}
                    {activeTab === 'cetak_kartu' && <CetakKartuTab currentUser={currentUserState} students={dashboardData.allUsers || []} schedules={dashboardData.schedules || []} />}
                    
                    {activeTab === 'data_user' && (currentUserState.role === 'admin_pusat' || currentUserState.role === 'admin_sekolah') && <DaftarPesertaTab currentUser={currentUserState} onDataChange={fetchData} />}
                    
                    {activeTab === 'manajemen_admin' && currentUserState.role === 'admin_pusat' && <ManajemenAdminTab currentUser={currentUserState} onDataChange={fetchData} />}
                    
                    {activeTab === 'atur_gelombang' && currentUserState.role === 'admin_pusat' && <AturGelombangTab students={dashboardData.allUsers || []} />}
                    {activeTab === 'rilis_token' && <RilisTokenTab currentUser={currentUserState} token={dashboardData.token} duration={dashboardData.duration} maxQuestions={dashboardData.maxQuestions} refreshData={fetchData} isRefreshing={isRefreshing} />}
                    {activeTab === 'bank_soal' && currentUserState.role === 'admin_pusat' && <BankSoalTab />}
                    {activeTab === 'rekap' && currentUserState.role === 'admin_pusat' && <RekapTab students={dashboardData.allUsers || []} currentUser={currentUserState} />}
                    {activeTab === 'ranking' && currentUserState.role === 'admin_pusat' && <RankingTab students={dashboardData.allUsers || []} currentUser={currentUserState} />}
                    {activeTab === 'analisis' && currentUserState.role === 'admin_pusat' && <AnalisisTab students={dashboardData.allUsers || []} />}
                </>
            )}
          </div>
        </div>
      </main>

      {/* PROFILE EDIT MODAL */}
      {isProfileModalOpen && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in">
             <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-white/20 transform scale-100 transition-all">
                 <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                     <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Settings size={24} className="text-slate-600"/> Edit Profil Saya</h3>
                     <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                 </div>
                 <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-50/50">
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div className="flex justify-center mb-6">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center">
                                    {profileForm.photo_url ? <img src={profileForm.photo_url} className="w-full h-full object-cover" /> : <Camera size={32} className="text-slate-400"/>}
                                </div>
                                <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 shadow-md border-2 border-white transition-transform hover:scale-110">
                                    <Upload size={14}/>
                                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleProfileImageChange} />
                                </label>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Username</label>
                                    <input type="text" className="w-full p-3 bg-slate-100 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-500 outline-none cursor-not-allowed" value={profileForm.username} disabled />
                                </div>
                                <div className="group">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Password</label>
                                    <input type="text" className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all" value={profileForm.password || ''} onChange={e => setProfileForm({...profileForm, password: e.target.value})} placeholder="Ubah Password" />
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">Nama Lengkap</label>
                                <input required type="text" className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all" value={profileForm.nama_lengkap} onChange={e => setProfileForm({...profileForm, nama_lengkap: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Role</label>
                                    <input type="text" className="w-full p-3 bg-slate-100 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-500 outline-none cursor-not-allowed" value={formatRole(profileForm.role)} disabled />
                                </div>
                                <div className="group">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-indigo-500 transition-colors">L/P</label>
                                    <select className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all appearance-none" value={profileForm.jenis_kelamin || 'L'} onChange={e => setProfileForm({...profileForm, jenis_kelamin: e.target.value})}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select>
                                </div>
                            </div>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-3.5 border-2 border-slate-200 text-slate-500 rounded-xl font-bold hover:bg-slate-100 hover:text-slate-700 transition">Batal</button>
                            <button type="submit" disabled={isSavingProfile} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 transform active:scale-95 transition-all">
                                {isSavingProfile ? <RefreshCw size={20} className="animate-spin"/> : <Save size={20}/>} Simpan Profil
                            </button>
                        </div>
                    </form>
                 </div>
             </div>
         </div>
      )}
    </div>
  );
};

export default AdminDashboard;
