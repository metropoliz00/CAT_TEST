import React, { useState, useEffect } from 'react';
import { User, Exam, QuestionWithOptions } from './types';
import { Key, User as UserIcon, Monitor, AlertCircle, LogOut, Check, Eye, EyeOff, Smartphone, Wifi, ArrowRight, Loader2, WifiOff, X, Clock, ShieldCheck, PlayCircle, Zap, GraduationCap, LogIn, Laptop } from 'lucide-react';
import StudentExam from './components/StudentExam';
import AdminDashboard from './components/AdminDashboard';
import { api } from './services/api';

type ViewState = 'system_check' | 'login' | 'confirm' | 'exam' | 'result' | 'admin';

// Modern Loading Overlay (Clean White & Red Design)
const LoadingOverlay = ({ message }: { message: string }) => (
  <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center fade-in">
    <div className="relative mb-8">
      {/* Soft Outer Ring */}
      <div className="w-20 h-20 border-4 border-slate-100 rounded-full shadow-inner"></div>
      {/* Red Spinner */}
      <div className="w-20 h-20 border-4 border-red-600 rounded-full border-t-transparent animate-spin absolute inset-0"></div>
      {/* Center Logo/Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-lg shadow-red-200"></div>
      </div>
    </div>
    <h3 className="text-slate-800 font-bold text-lg md:text-xl tracking-tight mb-2 text-center px-4">{message}</h3>
    <p className="text-slate-400 text-[10px] md:text-xs font-semibold tracking-widest uppercase">Sedang Memproses Data...</p>
  </div>
);

function App() {
  const [view, setView] = useState<ViewState>('system_check');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [examList, setExamList] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  
  const [inputToken, setInputToken] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Memuat...');
  const [errorMsg, setErrorMsg] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [sysInfo, setSysInfo] = useState({ os: 'Unknown', device: 'Unknown', browser: 'Unknown', platform: 'Unknown', ram: 'Unknown', status: 'Checking...' });

  // Restore Session
  useEffect(() => {
    const savedUser = localStorage.getItem('cbt_user');
    if (savedUser) {
        try {
            const parsedUser = JSON.parse(savedUser);
            setCurrentUser(parsedUser);
            
            if (parsedUser.role === 'admin_pusat' || parsedUser.role === 'admin_sekolah') {
                setView('admin');
            } else {
                setView('confirm');
                api.getExams().then(allExams => {
                    let filteredExams = allExams;
                    if (parsedUser.active_exam && parsedUser.active_exam !== '-' && parsedUser.active_exam !== '') {
                        filteredExams = filteredExams.filter(e => e.nama_ujian === parsedUser.active_exam);
                    } else {
                        filteredExams = [];
                    }
                    setExamList(filteredExams);
                    if (filteredExams.length > 0) setSelectedExamId(filteredExams[0].id);
                }).catch(console.error);
            }
        } catch (e) {
            console.error("Failed to restore session", e);
            localStorage.removeItem('cbt_user');
        }
    }
  }, []);

  const enterFullscreen = async () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
          try {
              if (el.requestFullscreen) await el.requestFullscreen();
              // @ts-ignore
              else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
              // @ts-ignore
              else if (el.msRequestFullscreen) await el.msRequestFullscreen();
          } catch (e) {
              console.warn("Auto-fullscreen blocked by browser.");
          }
      }
  };

  useEffect(() => { enterFullscreen(); }, []);

  useEffect(() => {
      const handleGlobalKeyDown = async (e: KeyboardEvent) => {
          if (e.ctrlKey && (e.key === 'x' || e.key === 'X')) {
              e.preventDefault();
              if (document.fullscreenElement) try { await document.exitFullscreen(); } catch (err) {}
          }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (view === 'system_check') {
        const getDetailedSystemInfo = async () => {
            const userAgent = navigator.userAgent;
            let os = "Unknown OS";
            let device = "Unknown Device";
            let browser = "Unknown Browser";
            let platform = "Desktop"; // Default

            // --- PLATFORM DETECTION ---
            if (/Android/i.test(userAgent)) platform = "Android";
            else if (/iPhone|iPad|iPod/i.test(userAgent)) platform = "iOS";

            // --- BROWSER DETECTION ---
            if (userAgent.indexOf("Firefox") > -1) browser = "Mozilla Firefox";
            else if (userAgent.indexOf("SamsungBrowser") > -1) browser = "Samsung Internet";
            else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) browser = "Opera";
            else if (userAgent.indexOf("Trident") > -1) browser = "Internet Explorer";
            else if (userAgent.indexOf("Edge") > -1) browser = "Microsoft Edge";
            else if (userAgent.indexOf("Chrome") > -1) browser = "Google Chrome";
            else if (userAgent.indexOf("Safari") > -1) browser = "Apple Safari";

            // --- OS DETECTION ---
            if (userAgent.indexOf("Win") !== -1) {
                os = "Windows";
                if (userAgent.includes("Windows NT 10.0")) os = "Windows 10";
                if (userAgent.includes("Windows NT 6.3")) os = "Windows 8.1";
                if (userAgent.includes("Windows NT 6.2")) os = "Windows 8";
                if (userAgent.includes("Windows NT 6.1")) os = "Windows 7";
                device = "PC / Laptop";
                platform = "Desktop";
            } else if (userAgent.indexOf("Mac") !== -1) {
                os = "MacOS";
                device = "Macintosh";
                platform = "Desktop";
            } else if (userAgent.indexOf("Linux") !== -1 && userAgent.indexOf("Android") === -1) {
                os = "Linux";
                device = "Desktop";
                platform = "Desktop";
            } else if (userAgent.indexOf("Android") !== -1) {
                os = "Android";
                platform = "Android";
                const verMatch = userAgent.match(/Android\s([0-9.]+)/);
                if (verMatch) os += ` ${verMatch[1]}`;

                // Try to extract device model from UA (fallback)
                const match1 = userAgent.match(/;\s?([^;]+)\s?Build\//); 
                const match2 = userAgent.match(/Android[^;]*;\s?([^;]+);/);
                
                if (match1 && match1[1]) {
                    device = match1[1].trim();
                } else if (match2 && match2[1]) {
                    device = match2[1].trim();
                } else {
                    device = "Android Device";
                }
            } else if (userAgent.indexOf("iPhone") !== -1) {
                os = "iOS";
                device = "iPhone";
                platform = "iOS";
                const ver = userAgent.match(/OS (\d+)_/);
                if(ver) os += " " + ver[1];
            } else if (userAgent.indexOf("iPad") !== -1) {
                os = "iOS";
                device = "iPad";
                platform = "iOS";
            }

            // --- CLIENT HINTS (Advanced Detection for Chrome/Edge/Opera) ---
            if ((navigator as any).userAgentData) {
                try {
                    const uaData = await (navigator as any).userAgentData.getHighEntropyValues([
                        "model",
                        "platform",
                        "platformVersion"
                    ]);
                    
                    // Detect Windows 11
                    if (uaData.platform === "Windows") {
                        const major = parseInt(uaData.platformVersion.split('.')[0]);
                        if (major >= 13) os = "Windows 11";
                        else if (major > 0) os = "Windows 10"; 
                    }
                    
                    // Precise Device Model (e.g., "Pixel 6", "2201117TY")
                    if (uaData.model) {
                        device = uaData.model;
                    }
                } catch(e) { console.warn("High Entropy Values not available"); }
            }

            // --- DEVICE NAME CLEANUP ---
            // Try to make device names more readable if they are just codes
            if (device.length <= 9 && /^[A-Z0-9]+$/.test(device.replace(/-/g, ''))) {
               // Heuristics for codes (Optional mapping could go here if database available)
               // For now, we trust the browser or user agent string
            }

            const ram = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "N/A";
            
            setSysInfo({ 
                os: os, 
                device: device, 
                browser: browser,
                platform: platform,
                ram: ram, 
                status: navigator.onLine ? "Online" : "Offline" 
            });
        };

        getDetailedSystemInfo();

        const updateOnlineStatus = () => { setSysInfo(prev => ({ ...prev, status: navigator.onLine ? "Online" : "Offline" })); };
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        return () => { window.removeEventListener('online', updateOnlineStatus); window.removeEventListener('offline', updateOnlineStatus); };
    }
  }, [view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    enterFullscreen();
    setLoading(true);
    setLoadingMessage('Otorisasi Pengguna...');
    setErrorMsg('');
    try {
        const user = await api.login(loginForm.username.trim(), loginForm.password.trim());
        if (user) {
            setCurrentUser(user);
            localStorage.setItem('cbt_user', JSON.stringify(user));

            if (user.role === 'admin_pusat' || user.role === 'admin_sekolah') {
                setView('admin');
            } else {
                setLoadingMessage('Sinkronisasi Jadwal...');
                const allExams = await api.getExams();
                let filteredExams = allExams;
                
                if (user.active_exam && user.active_exam !== '-' && user.active_exam !== '') {
                    filteredExams = filteredExams.filter(e => e.nama_ujian === user.active_exam);
                } else {
                    filteredExams = [];
                }
                setExamList(filteredExams);
                if (filteredExams.length > 0) setSelectedExamId(filteredExams[0].id); else setSelectedExamId('');
                setView('confirm');
            }
        } else {
            setErrorMsg('Username tidak ditemukan atau password salah.');
        }
    } catch (err: any) {
        setErrorMsg('Gagal terhubung ke server. Periksa koneksi internet.');
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyToken = async () => {
      enterFullscreen();
      if (!inputToken) { setErrorMsg('Harap isi token ujian.'); return; }
      setLoading(true);
      setLoadingMessage('Validasi Token...');
      setErrorMsg('');
      try {
          const serverToken = await api.getServerToken();
          if (inputToken.toUpperCase() !== serverToken.toUpperCase()) { setErrorMsg('Token ujian tidak valid!'); setLoading(false); return; }
          setShowConfirmModal(true);
      } catch (e) { console.error(e); setErrorMsg('Gagal verifikasi token.'); } finally { setLoading(false); }
  };

  const handleStartExam = async () => {
    if (!currentUser) return;
    setLoading(true);
    setLoadingMessage('Mengunduh Paket Soal...');
    try {
        const serverToken = await api.getServerToken();
        if (inputToken.toUpperCase() !== serverToken.toUpperCase()) { setErrorMsg('Token ujian tidak valid!'); setShowConfirmModal(false); setLoading(false); return; }
        const qData = await api.getQuestions(selectedExamId);
        if (qData.length === 0) { setErrorMsg('Soal tidak ditemukan untuk mapel ini.'); setShowConfirmModal(false); setLoading(false); return; }
        const res = await api.startExam(currentUser.username, currentUser.nama_lengkap, selectedExamId);
        const activeStartTime = res.startTime || Date.now();
        enterFullscreen();
        setQuestions(qData);
        setStartTime(activeStartTime);
        setErrorMsg('');
        setView('exam');
    } catch (err) { console.error(err); setErrorMsg('Gagal memuat soal. Periksa koneksi.'); setShowConfirmModal(false); } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('cbt_user');
    localStorage.removeItem('cbt_admin_tab'); 
    setCurrentUser(null);
    setLoginForm({ username: '', password: '' });
    setInputToken('');
    setErrorMsg('');
    setQuestions([]);
    setShowPassword(false);
    setShowConfirmModal(false);
    setView('login');
  };

  const handleFinishExam = async (answers: any, displayedQuestionCount: number, questionIds: string[], isTimeout: boolean = false) => {
    if (!currentUser || !selectedExamId) return;
    setLoading(true);
    setLoadingMessage(isTimeout ? 'Waktu Habis! Menyimpan...' : 'Mengunggah Jawaban...');
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) {}
    try {
        const lsKey = `cbt_answers_${currentUser.username}_${selectedExamId}`;
        localStorage.removeItem(lsKey);
        await api.submitExam({
            user: currentUser,
            subject: selectedExamId,
            answers,
            startTime,
            displayedQuestionCount,
            questionIds
        });
        
        if (isTimeout) {
            alert("Waktu Ujian Telah Habis. Jawaban tersimpan otomatis.");
            handleLogout();
        } else {
            setView('result');
        }
    } catch (err) { alert("Gagal menyimpan jawaban. Coba lagi."); console.error(err); } finally { setLoading(false); }
  };

  const selectedExam = examList.find(e => e.id === selectedExamId);
  const hasSession = currentUser?.session && currentUser.session !== '-' && currentUser.session.trim() !== '' && currentUser.session !== 'undefined';
  
  // LOGO CONSTANT REMOVED IN FAVOR OF ICON
  // const logoUrl = "https://image2url.com/r2/default/images/1770007192296-ae4e2a39-302c-480c-ab6a-80be007c438a.png";

  // --- VIEW: SYSTEM CHECK ---
  if (view === 'system_check') {
      const isOffline = sysInfo.status === 'Offline';
      return (
        <div className="min-h-screen relative flex items-center justify-center p-4 font-sans fade-in overflow-hidden" onClick={enterFullscreen}>
            {/* Soft Ambient Background */}
            <div className="absolute inset-0 bg-[#f8fafc]"></div>
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-[100px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-50/50 blur-[100px]"></div>
            
            <div className="bg-white/70 backdrop-blur-2xl w-full max-w-md rounded-[2.5rem] p-6 md:p-8 shadow-2xl shadow-slate-200/50 border border-white relative z-10">
                <div className="text-center mb-8 md:mb-10">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-6 transform rotate-3 border border-slate-50">
                        <Zap size={32} className="text-blue-600 fill-blue-600 md:w-10 md:h-10" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">System Check</h2>
                    <p className="text-slate-400 font-medium mt-2 text-sm md:text-base">Memeriksa kompatibilitas perangkat...</p>
                </div>
                
                <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between p-4 md:p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                {sysInfo.platform === 'Desktop' ? <Monitor size={20} className="md:w-6 md:h-6" /> : sysInfo.platform === 'Unknown' ? <Laptop size={20} className="md:w-6 md:h-6"/> : <Smartphone size={20} className="md:w-6 md:h-6" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identitas Perangkat</p>
                                <p className="font-bold text-slate-800 text-xs md:text-sm">{sysInfo.platform}</p>
                                <div className="mt-1">
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">{sysInfo.browser}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full"><Check size={14} className="md:w-4 md:h-4" strokeWidth={4} /></div>
                    </div>
                    
                    <div className={`flex items-center justify-between p-4 md:p-5 rounded-2xl border shadow-sm transition-all ${isOffline ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100 hover:shadow-md group'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${isOffline ? 'bg-red-100 text-red-500' : 'bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                                {isOffline ? <WifiOff size={20} className="md:w-6 md:h-6" /> : <Wifi size={20} className="md:w-6 md:h-6" />}
                            </div>
                            <div>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${isOffline ? 'text-red-400' : 'text-slate-400'}`}>Koneksi Internet</p>
                                <p className={`font-bold text-xs md:text-base ${isOffline ? 'text-red-600' : 'text-slate-700'}`}>{sysInfo.status}</p>
                            </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-red-500 animate-ping' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`}></div>
                    </div>
                </div>

                {/* Updated Button with Modern Theme Gradient */}
                <button 
                    onClick={() => { enterFullscreen(); setView('login'); }} 
                    disabled={isOffline} 
                    className={`w-full font-black py-4 rounded-2xl shadow-xl transition-all duration-300 flex items-center justify-center gap-3 group text-xs md:text-sm tracking-[0.2em] uppercase ${isOffline ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1'}`}
                >
                    {isOffline ? "KONEKSI TERPUTUS" : (<>LANJUTKAN <ArrowRight size={16} className="md:w-[18px] md:h-[18px] group-hover:translate-x-1 transition-transform" /></>)}
                </button>
            </div>
        </div>
      );
  }

  // --- VIEW: LOGIN (NEW DESIGN) ---
  if (view === 'login') {
    return (
        <>
            {loading && <LoadingOverlay message={loadingMessage} />}
            <div className="min-h-screen flex items-center justify-center p-4 font-sans overflow-hidden bg-[#f1f5f9] relative" onClick={enterFullscreen}>
                {/* Background Shapes */}
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-[120px] animate-float"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-[100px] animate-float" style={{animationDelay: '2s'}}></div>
                <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] bg-red-100/40 rounded-full blur-[80px] animate-pulse"></div>

                {/* Glassmorphism Card */}
                <div className="bg-white/60 backdrop-blur-xl w-full max-w-lg rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-white/50 relative z-10 overflow-hidden transform transition-all hover:scale-[1.005] duration-500">
                    
                    {/* Patriotic Top Border Accent */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-white to-blue-600 shadow-sm z-20"></div>

                    <div className="p-6 md:p-12 relative">
                        <div className="text-center mb-8 md:mb-10">
                            <div className="inline-flex p-3 md:p-4 bg-white rounded-3xl shadow-lg shadow-slate-200/50 mb-4 md:mb-6 border border-white">
                                {/* REPLACED IMG WITH ICON */}
                                <img 
                                    src="https://image2url.com/r2/default/images/1770096905658-b4833d12-b272-4a2b-957b-37734ea24417.jpg" 
                                    className="w-12 h-12 md:w-16 md:h-16 object-contain animate-float" 
                                    alt="Logo" 
                                />
                            </div>
                            {/* Responsive Font Size & Styled Text */}
                            <h1 className="text-xl md:text-3xl font-black tracking-tight mb-2">
                                <span className="text-slate-900">COMPUTER</span> <span className="text-red-600">ASSESMENT</span> <span className="text-blue-600">TEST</span>
                            </h1>
                            <p className="text-slate-500 text-[11px] md:text-sm font-medium">Masuk untuk memulai ujian berbasis komputer.</p>
                        </div>
                        
                        <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
                            <div className="group">
                                <label className="block text-[10px] md:text-xs font-extrabold text-slate-400 uppercase mb-2 ml-1 tracking-wider group-focus-within:text-blue-600 transition-colors">Nomor Peserta</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors"><UserIcon size={20}/></div>
                                    <input type="text" className="w-full pl-14 pr-4 py-3 md:py-4 bg-white/50 border-2 border-white rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-800 placeholder-slate-300 shadow-inner focus:shadow-lg focus:shadow-blue-100/50 text-sm md:text-base" value={loginForm.username} onChange={e=>setLoginForm({...loginForm, username:e.target.value})} placeholder="Nomor Peserta" required />
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] md:text-xs font-extrabold text-slate-400 uppercase mb-2 ml-1 tracking-wider group-focus-within:text-red-500 transition-colors">Kata Sandi</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-red-500 transition-colors"><Key size={20}/></div>
                                    <input type={showPassword ? "text" : "password"} className="w-full pl-14 pr-14 py-3 md:py-4 bg-white/50 border-2 border-white rounded-2xl focus:border-red-500 focus:bg-white outline-none transition-all font-bold text-slate-800 placeholder-slate-300 shadow-inner focus:shadow-lg focus:shadow-red-100/50 text-sm md:text-base" value={loginForm.password} onChange={e=>setLoginForm({...loginForm, password:e.target.value})} placeholder="******" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
                                </div>
                            </div>
                            
                            {errorMsg && (
                                <div className="flex items-center gap-3 text-red-600 text-xs font-bold bg-red-50 p-4 rounded-2xl border border-red-100 animate-shake">
                                    <AlertCircle size={18} className="shrink-0" /> <span>{errorMsg}</span>
                                </div>
                            )}
                            
                            {/* UPDATED: White Button with Blue-Red Gradient List (Bottom Border) */}
                            <button disabled={loading} className="w-full bg-white text-slate-800 font-black py-4 rounded-2xl relative overflow-hidden shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex justify-center items-center mt-6 gap-3 text-xs md:text-sm uppercase tracking-widest group">
                                <div className="absolute bottom-0 left-0 w-full h-[5px] bg-gradient-to-r from-blue-600 via-purple-500 to-red-600"></div>
                                {loading ? (<><Loader2 size={20} className="animate-spin text-blue-600" /> PROSES...</>) : (<>LOGIN <LogIn size={18} className="text-blue-600 group-hover:translate-x-1 transition-transform" /></>)}
                            </button>
                        </form>
                        
                        <div className="mt-8 text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">© 2026 CBT System | Secure Exam</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
  }

  // --- ADMIN DASHBOARD ---
  if (view === 'admin' && currentUser) { return <AdminDashboard user={currentUser} onLogout={handleLogout} />; }

  // --- CONFIRMATION PAGE ---
  if (view === 'confirm') {
    return (
        <>
            {loading && <LoadingOverlay message={loadingMessage} />}
            <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col fade-in" onClick={enterFullscreen}>
                {/* Header */}
                <header className="bg-white/80 backdrop-blur border-b border-slate-200 h-16 md:h-20 flex items-center px-4 md:px-12 justify-between sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><GraduationCap size={20}/></div>
                        <div className="w-px h-8 bg-slate-200 hidden md:block"></div>
                        <span className="font-black text-slate-800 text-sm md:text-lg tracking-tight">KONFIRMASI DATA</span>
                    </div>
                    <button onClick={handleLogout} className="text-red-500 hover:text-white bg-white hover:bg-red-500 border border-red-100 flex items-center gap-2 font-bold text-xs md:text-sm px-4 py-2 md:px-5 md:py-2.5 rounded-full transition-all duration-300 shadow-sm hover:shadow-md"><LogOut size={16} className="md:w-[18px] md:h-[18px]"/> <span className="hidden md:inline">Logout</span></button>
                </header>

                <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                    <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
                        
                        {/* Profile Section */}
                        <div className="md:w-1/3 bg-slate-50/50 p-8 md:p-10 flex flex-col items-center justify-center border-r border-slate-100 text-center relative overflow-hidden">
                            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-blue-100 to-indigo-100 mb-6 shadow-xl shadow-slate-200">
                                {currentUser?.photo_url ? (
                                    <img src={currentUser.photo_url} className="w-full h-full rounded-full object-cover border-4 border-white bg-white" alt="Profile" />
                                ) : (
                                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-indigo-600 border-4 border-white"><UserIcon size={64}/></div>
                                )}
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight mb-2">{currentUser?.nama_lengkap}</h2>
                            <p className="text-slate-500 font-bold font-mono text-xs mb-6 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">{currentUser?.username}</p>
                            <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm w-full">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Sekolah</p>
                                <p className="text-xs md:text-sm font-bold text-indigo-700 truncate">{currentUser?.kelas_id}</p>
                            </div>
                        </div>

                        {/* Exam Details Section */}
                        <div className="md:w-2/3 p-8 md:p-12 flex flex-col justify-center bg-white relative">
                            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-8 flex items-center gap-3"><ShieldCheck className="text-indigo-600" /> Detail Ujian</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider ml-1">Mata Pelajaran</label>
                                    {examList.length > 0 ? (
                                        <select className="w-full p-4 bg-indigo-50/30 border-2 border-indigo-100 rounded-2xl text-indigo-900 font-bold text-base md:text-lg outline-none focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer hover:border-indigo-200 appearance-none" value={selectedExamId} onChange={e=>setSelectedExamId(e.target.value)} disabled={examList.length === 1}>
                                            {examList.map(s=><option key={s.id} value={s.id}>{s.nama_ujian}</option>)}
                                        </select>
                                    ) : (
                                        <div className="p-4 bg-red-50 border border-red-100 text-red-500 rounded-2xl text-sm font-bold flex items-center gap-2"><AlertCircle size={20}/> Tidak ada ujian aktif.</div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider ml-1">Sesi</label>
                                    <div className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700">{currentUser?.session || '-'}</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider ml-1">Durasi</label>
                                    <div className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 flex items-center gap-2"><Clock size={18} className="text-slate-400"/> {selectedExam ? `${selectedExam.durasi} Menit` : '-'}</div>
                                </div>
                            </div>
                            
                            <div className="space-y-2 mt-auto">
                                <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider ml-1">Token Ujian</label>
                                {hasSession ? (
                                    <div className="flex gap-4 flex-col md:flex-row">
                                        <input type="text" className={`flex-1 p-4 border-2 rounded-2xl focus:border-indigo-500 outline-none text-center text-3xl font-mono font-bold tracking-[0.5em] uppercase transition-all ${errorMsg.toLowerCase().includes('token') ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-800 focus:ring-4 focus:ring-indigo-50'}`} placeholder="------" maxLength={6} value={inputToken} onChange={e=> { setInputToken(e.target.value.toUpperCase()); setErrorMsg(''); }} />
                                        <button onClick={handleVerifyToken} disabled={loading || examList.length === 0} className={`w-full md:w-32 py-4 md:py-0 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-300 transition-all transform hover:-translate-y-1 hover:shadow-2xl flex flex-row md:flex-col gap-2 md:gap-0 items-center justify-center ${examList.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black'}`}>
                                            <PlayCircle size={28} className="mb-0 md:mb-1 opacity-80" />
                                            <span className="text-[10px] font-bold tracking-widest">MULAI</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-5 bg-orange-50 border border-orange-100 rounded-2xl text-center text-orange-600">
                                        <Clock size={32} className="mx-auto mb-2 opacity-50"/>
                                        <p className="font-bold">Anda belum memiliki jadwal ujian.</p>
                                    </div>
                                )}
                                {errorMsg && <p className="text-red-500 text-xs font-bold mt-2 flex items-center gap-2 bg-red-50 p-3 rounded-xl w-fit"><AlertCircle size={16}/> {errorMsg}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Confirm Modal */}
                {showConfirmModal && selectedExam && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md fade-in">
                        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative transform scale-100 transition-all border border-white/20">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                            <button onClick={() => setShowConfirmModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition"><X size={24} /></button>
                            
                            <div className="p-8 pt-10 text-center">
                                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-indigo-100">
                                    <Monitor size={40}/>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-1">Konfirmasi Tes</h3>
                                <p className="text-slate-500 text-sm mb-8">Anda akan memulai sesi ujian berikut:</p>
                                
                                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4 text-left shadow-sm mb-8">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Mata Pelajaran</span>
                                        <span className="text-base font-bold text-indigo-700 text-right">{selectedExam.nama_ujian}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Alokasi Waktu</span>
                                        <span className="text-base font-bold text-slate-700">{selectedExam.durasi} Menit</span>
                                    </div>
                                </div>

                                <button onClick={handleStartExam} disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:bg-black transition-all transform hover:-translate-y-1 flex justify-center items-center gap-2">
                                  {loading ? <Loader2 size={24} className="animate-spin"/> : <>MULAI MENGERJAKAN <ArrowRight size={20}/></>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
  }
  
  if (view === 'exam' && currentUser && selectedExam) {
      return (
          <StudentExam 
            exam={selectedExam}
            questions={questions}
            userFullName={currentUser.nama_lengkap}
            username={currentUser.username}
            userPhoto={currentUser.photo_url}
            startTime={startTime}
            onFinish={handleFinishExam}
            onExit={handleLogout}
          />
      );
  }

  if (view === 'result') {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] font-sans p-4" onClick={enterFullscreen}>
              <div className="bg-white p-10 md:p-14 rounded-[2.5rem] shadow-2xl text-center max-w-lg w-full border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-green-500"></div>
                  <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-100 border-4 border-white">
                      <Check size={48} strokeWidth={4} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Ujian Selesai!</h2>
                  <p className="text-slate-500 mb-8 font-medium leading-relaxed">Terima kasih, jawaban anda telah berhasil disimpan ke dalam sistem.</p>
                  
                  <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-200/60">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Peserta</p>
                      <p className="font-bold text-slate-800 text-lg mb-4">{currentUser?.nama_lengkap}</p>
                      <div className="h-px bg-slate-200 mb-4"></div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mata Pelajaran</p>
                      <p className="font-bold text-indigo-600 text-lg">{selectedExam?.nama_ujian}</p>
                  </div>

                  <button onClick={handleLogout} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2">
                      <LogOut size={20} /> KEMBALI KE HALAMAN LOGIN
                  </button>
              </div>
          </div>
      );
  }

  return null;
}

export default App;