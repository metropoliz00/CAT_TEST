import React, { useState, useEffect, useMemo } from 'react';
import { Home, LogOut, Menu, Monitor, Group, Clock, Printer, List, Calendar, Key, FileQuestion, LayoutDashboard, BarChart3, Award, RefreshCw, X, CreditCard, Bell, CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
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
import RilisTokenTab from './admin/RilisTokenTab';
import BankSoalTab from './admin/BankSoalTab';

interface AdminDashboardProps {
    user: User;
    onLogout: () => void;
}

type TabType = 'overview' | 'rekap' | 'analisis' | 'ranking' | 'bank_soal' | 'data_user' | 'status_tes' | 'kelompok_tes' | 'rilis_token' | 'atur_sesi' | 'atur_gelombang' | 'cetak_absensi' | 'cetak_kartu';

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
  const [isCollapsed, setIsCollapsed] = useState(false); // New State for Desktop Collapse
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [currentUserState, setCurrentUserState] = useState<User>(user);
  
  // UPDATED LOGO
  const logoUrl = "https://image2url.com/r2/default/images/1770096905658-b4833d12-b272-4a2b-957b-37734ea24417.jpg";

  useEffect(() => {
    setCurrentUserState(user);
  }, [user]);

  const handleTabChange = (tab: TabType) => {
      setActiveTab(tab);
      localStorage.setItem('cbt_admin_tab', tab);
      setIsSidebarOpen(false); // Close mobile sidebar on selection
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
    // Auto-refresh notifications every 30 seconds
    const interval = setInterval(() => {
        fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter finished students for notification from Activity Feed
  const finishedStudents = useMemo(() => {
      if (!dashboardData.activityFeed) return [];
      
      // Filter activity feed for FINISH actions
      let finished = dashboardData.activityFeed.filter((log: any) => log.action === 'FINISH');
      
      // If School Admin, filter by school
      if (currentUserState.role === 'admin_sekolah') {
          const mySchool = (currentUserState.kelas_id || '').toLowerCase();
          finished = finished.filter((log: any) => (log.school || '').toLowerCase() === mySchool);
      }
      
      // Take top 5 most recent
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

  // Modern Navigation Button with "Red List" on Active State
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
      
      {/* SIDEBAR */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-white flex flex-col transition-all duration-300 ease-in-out shadow-2xl md:shadow-slate-200/50 border-r border-slate-100 
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full'} 
        md:translate-x-0 md:static ${isCollapsed ? 'md:w-20' : 'md:w-72'}`}
      >
        <div className={`p-4 ${isCollapsed ? 'py-6 flex justify-center' : 'p-8 pb-6'}`}>
          <div className={`flex ${isCollapsed ? 'flex-col gap-4 items-center' : 'justify-between items-start'}`}>
            <div className={`${isCollapsed ? 'text-center' : ''}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center mb-0' : 'gap-2 mb-2'}`}>
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 p-1 shrink-0 overflow-hidden">
                         <img src={logoUrl} className="w-full h-full object-contain" alt="Logo" />
                    </div>
                    {/* Collapsible Text */}
                    <span className={`font-black text-sm md:text-lg text-slate-800 tracking-tight transition-opacity duration-200 ${isCollapsed ? 'hidden' : 'opacity-100'}`}>
                        COMPUTER <span className="text-red-600">ASSESMENT</span> <span className="text-blue-600">TEST</span>
                    </span>
                </div>
                {!isCollapsed && (
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest pl-1 whitespace-nowrap">{currentUserState.role === 'admin_pusat' ? 'Administrator' : 'Proktor Panel'}</p>
                )}
            </div>
            
            {/* Toggle Button Desktop */}
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)} 
                className="hidden md:flex p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
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
          {currentUserState.role === 'admin_pusat' && (
              <button onClick={() => handleTabChange('atur_gelombang')} className={navButtonClass('atur_gelombang')} title="Atur Gelombang">
                  <Calendar size={20} className="shrink-0" /> 
                  {!isCollapsed && <span>Atur Gelombang</span>}
              </button>
          )}
          <button onClick={() => handleTabChange('rilis_token')} className={navButtonClass('rilis_token')} title="Rilis Token">
              <Key size={20} className="shrink-0" /> 
              {!isCollapsed && <span>Rilis Token</span>}
          </button>
          
          {currentUserState.role === 'admin_pusat' && (
             <>
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

        <div className={`p-6 border-t border-slate-50 bg-white ${isCollapsed ? 'flex justify-center' : ''}`}>
            <div className={`bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 flex items-center gap-3 ${isCollapsed ? 'justify-center p-2' : ''}`}>
                {currentUserState.photo_url ? (
                    <img src={currentUserState.photo_url} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm shrink-0" alt="Profile" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 font-bold border border-slate-200 shadow-sm shrink-0">{currentUserState.username.charAt(0).toUpperCase()}</div>
                )}
                {!isCollapsed && (
                    <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate">{currentUserState.nama_lengkap || currentUserState.username}</p>
                        <p className="text-[10px] text-slate-500 truncate">{currentUserState.role === 'admin_pusat' ? 'Administrator' : 'Proktor'}</p>
                    </div>
                )}
            </div>
            <button onClick={onLogout} className={`flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-lg shadow-red-200 transform active:scale-95 ${isCollapsed ? 'px-0' : ''}`} title="Logout">
                <LogOut size={16} /> 
                {!isCollapsed && <span>Logout</span>}
            </button>
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
                                                    <span>{new Date(s.timestamp).toLocaleTimeString()}</span>
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
                    <span>Sinkronisasi</span>
                </button>
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
                    {activeTab === 'atur_gelombang' && currentUserState.role === 'admin_pusat' && <AturGelombangTab students={dashboardData.allUsers || []} />}
                    {activeTab === 'rilis_token' && <RilisTokenTab currentUser={currentUserState} token={dashboardData.token} duration={dashboardData.duration} maxQuestions={dashboardData.maxQuestions} surveyDuration={0} refreshData={fetchData} isRefreshing={isRefreshing} />}
                    {activeTab === 'bank_soal' && currentUserState.role === 'admin_pusat' && <BankSoalTab />}
                    {activeTab === 'rekap' && currentUserState.role === 'admin_pusat' && <RekapTab students={dashboardData.allUsers} />}
                    {activeTab === 'ranking' && currentUserState.role === 'admin_pusat' && <RankingTab students={dashboardData.allUsers} />}
                    {activeTab === 'analisis' && currentUserState.role === 'admin_pusat' && <AnalisisTab students={dashboardData.allUsers} />}
                </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;