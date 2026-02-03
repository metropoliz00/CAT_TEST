import React, { useState, useEffect, useRef } from 'react';
import { Clock, Check, ChevronLeft, ChevronRight, LayoutDashboard, Flag, Monitor, LogOut, Loader2, AlertTriangle, X, ShieldAlert, RotateCcw, ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';
import { QuestionWithOptions, UserAnswerValue, Exam } from '../types';
import { api } from '../services/api';

interface StudentExamProps {
  exam: Exam;
  questions: QuestionWithOptions[];
  userFullName: string;
  username: string; // Needed for unique local storage key
  userPhoto?: string;
  startTime: number; // Absolute start time from server
  onFinish: (answers: Record<string, UserAnswerValue>, questionCount: number, questionIds: string[], isTimeout?: boolean) => Promise<void> | void;
  onExit: () => void;
}

// Utility to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

// Utility to detect if string is an image URL
const isImageOption = (text: string) => {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    if (/\s/.test(trimmed)) return false;
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image');
};

const OptionContent = ({ text, onZoom }: { text: string, onZoom: (src: string) => void }) => {
    const [hasError, setHasError] = useState(false);
    const isImg = isImageOption(text);

    if (isImg && !hasError) {
        return (
            <div className="relative group inline-block my-2 max-w-full">
                <img
                    src={text.trim()}
                    alt="Opsi Jawaban"
                    className="max-h-40 w-auto rounded-lg border border-slate-200 object-contain bg-white transition-transform hover:scale-[1.02] cursor-zoom-in"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onZoom(text.trim());
                    }}
                    onError={() => setHasError(true)}
                />
                 <div className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize size={12} />
                </div>
            </div>
        );
    }
    return <span>{text}</span>;
};

const ImageViewer = ({ src, onClose }: { src: string; onClose: () => void }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const lastTouchDistance = useRef<number | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 5));
    const handleZoomOut = () => {
        setScale(s => {
            const newScale = Math.max(s - 0.5, 1);
            if (newScale === 1) setPosition({ x: 0, y: 0 });
            return newScale;
        });
    };
    const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            e.preventDefault();
            setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };
    const handleMouseUp = () => setIsDragging(false);
    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        if (e.deltaY < 0) handleZoomIn();
        else handleZoomOut();
    };
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            lastTouchDistance.current = dist;
        }
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && isDragging && scale > 1) {
            setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
        } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const delta = dist - lastTouchDistance.current;
            const zoomFactor = delta * 0.01; 
            setScale(s => Math.min(Math.max(1, s + zoomFactor), 5));
            lastTouchDistance.current = dist;
        }
    };
    const handleTouchEnd = () => { setIsDragging(false); lastTouchDistance.current = null; if (scale < 1) setScale(1); };

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-center items-center backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
                <div className="text-white text-sm font-bold flex items-center gap-2"><Maximize size={18} /> Mode Perbesar</div>
                <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition"><X size={24} /></button>
            </div>
            <div className="w-full h-full flex items-center justify-center overflow-hidden cursor-move touch-none" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                <img ref={imageRef} src={src} alt="Zoomed Question" className="max-w-full max-h-full object-contain transition-transform duration-75 ease-out select-none" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }} draggable={false} />
            </div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl">
                <button onClick={handleZoomOut} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition active:scale-95 disabled:opacity-50" disabled={scale <= 1}><ZoomOut size={24} /></button>
                <div className="text-white font-mono font-bold w-12 text-center text-sm">{Math.round(scale * 100)}%</div>
                <button onClick={handleZoomIn} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition active:scale-95 disabled:opacity-50" disabled={scale >= 5}><ZoomIn size={24} /></button>
                <div className="w-px h-8 bg-white/20 mx-1"></div>
                <button onClick={handleReset} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition active:scale-95" title="Reset"><RotateCcw size={24} /></button>
            </div>
            <div className="absolute bottom-20 text-white/50 text-xs font-medium pointer-events-none select-none">Gunakan cubit (pinch) atau scroll untuk zoom, geser untuk melihat detail.</div>
        </div>
    );
};

const StudentExam: React.FC<StudentExamProps> = ({ exam, questions, userFullName, username, userPhoto, startTime, onFinish, onExit }) => {
  const [examQuestions, setExamQuestions] = useState<QuestionWithOptions[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswerValue>>({});
  const [doubtful, setDoubtful] = useState<Record<string, boolean>>({});
  
  const [timeLeft, setTimeLeft] = useState(() => {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const totalDurationSeconds = exam.durasi * 60;
    return Math.max(0, totalDurationSeconds - elapsedSeconds);
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const [isLocked, setIsLocked] = useState(true);
  const [violationCount, setViolationCount] = useState(0);
  const MAX_VIOLATIONS = 3;

  const storageKey = `cbt_answers_${username}_${exam.id}`;

  useEffect(() => {
    if (questions.length > 0) {
        const questionsWithShuffledOptions = questions.map(q => ({ ...q, options: shuffleArray(q.options) }));
        let fullyShuffled = shuffleArray(questionsWithShuffledOptions);
        if (exam.max_questions && exam.max_questions > 0) {
            fullyShuffled = fullyShuffled.slice(0, exam.max_questions);
        }
        setExamQuestions(fullyShuffled);
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.answers) setAnswers(parsed.answers);
                if (parsed.doubtful) setDoubtful(parsed.doubtful);
            }
        } catch(e) { console.error("Failed to load saved answers", e); }
    }
  }, [questions, storageKey, exam.max_questions]);

  useEffect(() => {
      if (Object.keys(answers).length > 0) {
          localStorage.setItem(storageKey, JSON.stringify({ answers, doubtful }));
      }
  }, [answers, doubtful, storageKey]);

  // Execute Finish Function
  const executeFinish = async (isTimeout: boolean = false) => {
    setShowConfirmFinish(false);
    setIsSubmitting(true);
    try { if(document.fullscreenElement) await document.exitFullscreen(); } catch(e) {}
    try {
      const qIds = examQuestions.map(q => q.id);
      await onFinish(answers, examQuestions.length, qIds, isTimeout);
    } catch (error) {
      console.error("Error submitting:", error);
      setIsSubmitting(false);
      alert("Gagal mengirim jawaban. Silakan periksa koneksi internet anda dan coba lagi.");
    }
  };

  // Ref to hold the latest executeFinish to avoid stale closure in setInterval
  const executeFinishRef = useRef(executeFinish);
  useEffect(() => { executeFinishRef.current = executeFinish; });

  useEffect(() => {
    if (timeLeft <= 0) return;
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const totalSeconds = exam.durasi * 60;
      const remaining = totalSeconds - elapsedSeconds;
      if (remaining <= 0) {
        clearInterval(intervalId);
        setTimeLeft(0);
        executeFinishRef.current(true); // Call Ref to ensure latest state (answers) is used
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [startTime, exam.durasi]);

  // Polling Status User
  useEffect(() => {
      const poller = setInterval(async () => {
          try {
              const status = await api.checkStatus(username);
              if (status === 'RESET') {
                  alert("Sesi anda telah di-reset oleh Admin. Silakan login kembali.");
                  onExit();
              }
          } catch(e) { console.warn("Status check failed", e); }
      }, 5000); 
      return () => clearInterval(poller);
  }, [username, onExit]);

  const handleViolation = () => {
      setViolationCount(prev => {
          const newCount = prev + 1;
          if (newCount >= MAX_VIOLATIONS) {
              setTimeout(() => { alert("Anda telah melanggar aturan ujian sebanyak 3 kali. Sistem akan mengeluarkan anda otomatis."); onExit(); }, 500);
          }
          return newCount;
      });
      setIsLocked(false);
  };

  useEffect(() => {
    const handleVisibilityChange = () => { if (document.hidden) handleViolation(); };
    const handleFullscreenChange = () => { if (!document.fullscreenElement) handleViolation(); };
    const handleKeyDown = async (e: KeyboardEvent) => {
        if (e.ctrlKey && (e.key === 'x' || e.key === 'X')) {
            e.preventDefault();
            if (document.fullscreenElement) try { await document.exitFullscreen(); } catch(err) {}
            return;
        }
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.shiftKey && e.key === 'J') || (e.ctrlKey && e.key === 'U') || e.altKey) e.preventDefault();
    };
    const preventContext = (e: Event) => e.preventDefault();
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    // @ts-ignore
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', preventContext);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', preventContext);

    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        // @ts-ignore
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('contextmenu', preventContext);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('selectstart', preventContext);
    };
  }, []);

  const resumeExam = async () => {
      if (violationCount >= MAX_VIOLATIONS) { onExit(); return; }
      try {
          const el = document.documentElement;
          if (el.requestFullscreen) await el.requestFullscreen();
          // @ts-ignore
          else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      } catch(e) { console.error(e); }
      setIsLocked(true);
  };

  if (examQuestions.length === 0) return (<div className="h-screen flex flex-col items-center justify-center bg-slate-100 gap-4"><div className="loader border-blue-600 w-10 h-10 border-4 text-blue-600"></div><p className="text-slate-400 font-bold text-sm">Menyiapkan Soal...</p></div>);

  const currentQ = examQuestions[currentIdx];

  const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (val: any, type: 'PG' | 'PGK' | 'BS', subId?: string) => {
    setAnswers((prev) => {
      const qId = currentQ.id;
      if (type === 'PG') return { ...prev, [qId]: val };
      if (type === 'PGK') {
        const currentArr = (prev[qId] as string[]) || [];
        if (currentArr.includes(val)) {
             return { ...prev, [qId]: currentArr.filter(id => id !== val) };
        } else {
             if (currentArr.length >= 2) return prev;
             return { ...prev, [qId]: [...currentArr, val] };
        }
      }
      if (type === 'BS' && subId) {
        const currentObj = (prev[qId] as Record<string, boolean>) || {};
        return { ...prev, [qId]: { ...currentObj, [subId]: val } };
      }
      return prev;
    });
  };

  const isLastQuestion = currentIdx === examQuestions.length - 1;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden select-none touch-manipulation">
      {zoomedImage && (<ImageViewer src={zoomedImage} onClose={() => setZoomedImage(null)} />)}
      
      {/* SECURITY OVERLAY */}
      {!isLocked && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl max-w-lg w-full border-4 border-red-500 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-red-500 animate-pulse"></div>
                  <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-red-200 shadow-lg"><ShieldAlert size={40} /></div>
                  <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">PELANGGARAN!</h2>
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4 my-6 text-left">
                      <p className="text-red-800 font-bold text-lg uppercase tracking-wider mb-1">Peringatan {violationCount} / {MAX_VIOLATIONS}</p>
                      <p className="text-red-600 text-sm">Dilarang keluar dari mode layar penuh atau membuka tab lain.</p>
                  </div>
                  {violationCount < MAX_VIOLATIONS ? (
                      <button onClick={resumeExam} className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-xl flex items-center justify-center gap-2 transition-transform transform hover:-translate-y-1"><RotateCcw size={20} /> KEMBALI KE UJIAN</button>
                  ) : (
                      <div className="w-full py-4 bg-slate-200 text-slate-500 font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">AKSES DIKUNCI</div>
                  )}
              </div>
          </div>
      )}

      {/* HEADER */}
      <header className="h-16 md:h-18 bg-white/95 backdrop-blur shadow-md border-b border-blue-600 flex justify-between items-center px-4 md:px-8 z-40 sticky top-0">
        <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-red-600 text-white p-2 rounded-xl shadow-lg">
                <Monitor size={20} />
            </div>
            <div className="block">
                {/* Responsive Header Text */}
                <h1 className="font-black text-slate-800 text-xs md:text-lg leading-none tracking-tight">COMPUTER ASSESMENT TEST</h1>
                <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden md:block">Secure Exam Browser</p>
            </div>
        </div>
        <div className="flex items-center gap-2 md:gap-6">
          {/* Responsive Timer */}
          <div className={`flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border-2 shadow-sm transition-colors duration-300 ${timeLeft < 300 ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' : 'bg-slate-50 border-blue-100 text-blue-800'}`}>
            <Clock size={16} className={timeLeft < 300 ? 'text-red-500' : 'text-blue-600'} />
            <span className="font-mono font-bold text-sm md:text-lg">{formatTime(timeLeft)}</span>
          </div>
          <div className="hidden lg:flex items-center gap-3 text-right border-l pl-6 border-slate-200">
              <div>
                  <div className="text-sm font-bold text-slate-800">{userFullName}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{username}</div>
              </div>
              <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-red-500">
                {userPhoto ? (
                    <img src={userPhoto} className="w-full h-full rounded-full object-cover border-2 border-white" alt="Profile" />
                ) : (
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-slate-700 font-bold border-2 border-white">{userFullName.charAt(0)}</div>
                )}
              </div>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95">
            <LayoutDashboard size={18} /> 
            <span className="hidden md:inline text-sm font-bold">Navigasi</span>
          </button>
        </div>
      </header>

      {/* CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-3 md:p-8 pb-32 w-full bg-slate-50">
          <div className="max-w-5xl mx-auto bg-white rounded-[1.5rem] shadow-xl border border-slate-200 min-h-[600px] flex flex-col overflow-hidden relative">
            
            {/* Top Info Bar */}
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-slate-100 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2 md:gap-3">
                <span className="bg-blue-600 text-white text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg shadow-blue-200 shadow-md">No. {currentIdx + 1}</span>
                {exam.max_questions && <span className="text-[10px] md:text-xs font-bold text-slate-400">dari {exam.max_questions} Soal</span>}
                {currentQ.tipe_soal === 'PGK' && <span className="text-[10px] md:text-xs text-red-600 font-bold bg-red-50 px-2 md:px-3 py-1 rounded-full border border-red-100">Pilih Jawaban &gt; 1</span>}
              </div>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {(['sm', 'md', 'lg'] as const).map(s => (<button key={s} onClick={() => setFontSize(s)} className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold transition ${fontSize === s ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>A{s === 'lg' ? '+' : s === 'sm' ? '-' : ''}</button>))}
              </div>
            </div>

            {/* Question Body with Responsive Padding */}
            <div className={`p-4 md:p-10 flex-1 ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg md:text-xl' : 'text-base'} text-slate-800 leading-relaxed`}>
              <div className={currentQ.gambar ? "grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 items-start" : "w-full flex flex-col gap-8"}>
                
                {/* Image Section */}
                {currentQ.gambar && (
                    <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex flex-col items-center justify-center min-h-[200px] md:min-h-[300px] relative group overflow-hidden shadow-inner">
                        <div className="relative cursor-zoom-in w-full h-full flex items-center justify-center" onClick={() => setZoomedImage(currentQ.gambar!)}>
                            <img src={currentQ.gambar} alt="Soal" className="max-w-full h-auto rounded-xl shadow-sm max-h-[300px] md:max-h-[450px] object-contain transition-transform duration-300 group-hover:scale-[1.02]" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center rounded-xl">
                                <div className="bg-white/90 backdrop-blur text-slate-800 px-4 py-2 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 flex items-center gap-2 shadow-lg">
                                    <Maximize size={14} /> Perbesar Gambar
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Text & Options Section */}
                <div className="flex flex-col gap-6 md:gap-8 w-full">
                    <div className="font-medium whitespace-pre-wrap text-justify">{currentQ.text_soal}</div>
                    
                    {/* Options */}
                    <div className="space-y-3 md:space-y-4">
                        {currentQ.tipe_soal === 'PG' && currentQ.options.map((opt, idx) => {
                        const isSelected = answers[currentQ.id] === opt.id;
                        return (
                            <label key={opt.id} className={`flex items-start p-3 md:p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 group active:scale-[0.99] ${isSelected ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                                <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center mr-3 md:mr-4 font-bold text-sm md:text-base transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <input type="radio" className="hidden" checked={isSelected} onChange={() => handleAnswer(opt.id, 'PG')} />
                                <div className={`flex-1 pt-1 md:pt-2 break-words ${isSelected ? 'text-blue-900 font-bold' : 'text-slate-700'}`}>
                                    <OptionContent text={opt.text_jawaban} onZoom={setZoomedImage} />
                                </div>
                                {isSelected && <div className="ml-2 text-blue-600 pt-1 md:pt-2"><Check size={18} strokeWidth={3}/></div>}
                            </label>
                        );
                        })}

                        {currentQ.tipe_soal === 'PGK' && currentQ.options.map((opt) => {
                        const currentArr = (answers[currentQ.id] as string[]) || [];
                        const isChecked = currentArr.includes(opt.id);
                        return (
                            <label key={opt.id} className={`flex items-start p-3 md:p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 group active:scale-[0.99] ${isChecked ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center mr-4 transition-colors ${isChecked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}>
                                    {isChecked && <Check size={16} strokeWidth={4} />}
                                </div>
                                <input type="checkbox" className="hidden" checked={isChecked} onChange={() => handleAnswer(opt.id, 'PGK')} />
                                <div className="flex-1 pt-1 text-slate-700 font-medium break-words"><OptionContent text={opt.text_jawaban} onZoom={setZoomedImage} /></div>
                            </label>
                        );
                        })}

                        {currentQ.tipe_soal === 'BS' && (
                            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm mt-2 overflow-x-auto">
                                <table className="w-full text-xs md:text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] md:text-xs">
                                        <tr>
                                            <th className="p-3 md:p-4">Pernyataan</th>
                                            <th className="p-3 md:p-4 w-16 md:w-24 text-center text-emerald-600">Benar</th>
                                            <th className="p-3 md:p-4 w-16 md:w-24 text-center text-red-600">Salah</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {currentQ.options.map((opt) => { 
                                            const val = (answers[currentQ.id] as Record<string, boolean>)?.[opt.id]; 
                                            return (
                                                <tr key={opt.id} className="hover:bg-slate-50 transition">
                                                    <td className="p-3 md:p-4 font-medium text-slate-800"><OptionContent text={opt.text_jawaban} onZoom={setZoomedImage} /></td>
                                                    <td className="p-3 md:p-4 text-center"><label className="cursor-pointer block h-full w-full flex justify-center"><input type="radio" name={`bs-${opt.id}`} className="w-5 h-5 md:w-6 md:h-6 accent-emerald-500 cursor-pointer" checked={val === true} onChange={() => handleAnswer(true, 'BS', opt.id)} /></label></td>
                                                    <td className="p-3 md:p-4 text-center"><label className="cursor-pointer block h-full w-full flex justify-center"><input type="radio" name={`bs-${opt.id}`} className="w-5 h-5 md:w-6 md:h-6 accent-red-500 cursor-pointer" checked={val === false} onChange={() => handleAnswer(false, 'BS', opt.id)} /></label></td>
                                                </tr>
                                            ); 
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* SIDEBAR NAVIGATION */}
        {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsSidebarOpen(false)} />}
        <aside className={`fixed inset-y-0 right-0 z-50 w-[85vw] md:w-[320px] bg-white shadow-2xl transform transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col border-l border-slate-200`}>
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2"><LayoutDashboard size={20} className="text-blue-600"/> NAVIGASI SOAL</h3>
              <button onClick={()=>setIsSidebarOpen(false)} className="text-slate-400 p-2 hover:bg-slate-50 rounded-full transition"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div className="grid grid-cols-5 gap-3">
                {examQuestions.map((q, idx) => { 
                    const isDoubt = doubtful[q.id]; 
                    const hasAnswer = answers[q.id] && (Array.isArray(answers[q.id]) ? (answers[q.id] as []).length > 0 : typeof answers[q.id] === 'object' ? Object.keys(answers[q.id]).length > 0 : true); 
                    const isActive = currentIdx === idx; 
                    
                    let btnClass = "bg-white border-2 border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600"; 
                    if (isActive) btnClass = "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-110 z-10"; 
                    else if (isDoubt) btnClass = "bg-orange-100 border-orange-400 text-orange-700 font-bold"; 
                    else if (hasAnswer) btnClass = "bg-slate-800 border-slate-800 text-white"; 
                    
                    return (<button key={q.id} onClick={() => { setCurrentIdx(idx); setIsSidebarOpen(false); }} className={`aspect-square rounded-xl font-bold text-sm transition-all duration-200 ${btnClass}`}>{idx + 1}</button>); 
                })}
            </div>
            
            <div className="mt-8 space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Keterangan Warna</p>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-4 h-4 bg-blue-600 rounded-md shadow-sm"></div> Sedang Dikerjakan</div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-4 h-4 bg-slate-800 rounded-md shadow-sm"></div> Sudah Dijawab</div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-4 h-4 bg-orange-100 border-2 border-orange-400 rounded-md"></div> Ragu-ragu</div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-4 h-4 bg-white border-2 border-slate-200 rounded-md"></div> Belum Dijawab</div>
            </div>
          </div>
        </aside>
      </div>

      {/* FOOTER CONTROLS */}
      <footer className="bg-white border-t border-slate-200 p-3 md:p-4 z-30 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-2 md:gap-4">
          <button onClick={() => setCurrentIdx(p => Math.max(0, p - 1))} disabled={currentIdx === 0 || isSubmitting} className={`px-4 py-3 md:px-6 md:py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-xs md:text-base ${currentIdx === 0 ? 'opacity-0 cursor-default' : 'bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50 active:scale-95'}`}><ChevronLeft size={18} /> <span className="hidden md:inline">SEBELUMNYA</span></button>
          
          <label className={`flex items-center gap-2 md:gap-3 px-4 py-3 md:px-6 md:py-3 rounded-xl border-2 cursor-pointer transition-all select-none group active:scale-95 ${doubtful[currentQ.id] ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:border-orange-200 hover:text-orange-600'}`}>
              <input type="checkbox" className="w-4 h-4 md:w-5 md:h-5 accent-orange-500 rounded cursor-pointer hidden" checked={!!doubtful[currentQ.id]} onChange={() => setDoubtful(p => ({...p, [currentQ.id]: !p[currentQ.id]}))} disabled={isSubmitting} />
              <Flag size={18} className={doubtful[currentQ.id] ? 'fill-orange-600' : ''} />
              <span className="font-bold text-xs md:text-base">RAGU-RAGU</span>
          </label>
          
          {isLastQuestion ? (
            <button onClick={() => setShowConfirmFinish(true)} disabled={isSubmitting} className={`px-6 py-3 md:px-8 md:py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-1 active:scale-95 text-xs md:text-base ${isSubmitting ? 'bg-slate-400 text-white cursor-wait' : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-200'}`}>{isSubmitting ? (<>Proses... <div className="loader border-white w-4 h-4 border-2"></div></>) : (<>SELESAI <Check size={18} strokeWidth={3} /></>)}</button>
          ) : (
            <button onClick={() => setCurrentIdx(p => Math.min(examQuestions.length - 1, p + 1))} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 md:px-6 md:py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 active:scale-95 text-xs md:text-base"><span className="hidden md:inline">BERIKUTNYA</span> <ChevronRight size={18} /></button>
          )}
        </div>
      </footer>

      {/* CONFIRMATION MODAL */}
      {showConfirmFinish && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all border border-slate-100">
                  <div className="p-8 text-center">
                      <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-orange-100 animate-bounce-slow">
                          <AlertTriangle size={40} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-800 mb-2">Selesaikan Ujian?</h3>
                      <p className="text-slate-500 mb-8 text-sm leading-relaxed">Anda akan mengakhiri sesi untuk <br/><span className="font-bold text-slate-800 text-lg">{userFullName}</span>.<br/>Jawaban akan dikirim permanen.</p>
                      
                      <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100 space-y-3">
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 font-medium">Soal Terjawab</span>
                              <span className="font-black text-blue-600 text-lg">{Object.keys(answers).length} <span className="text-slate-400 text-xs font-normal">/ {examQuestions.length}</span></span>
                          </div>
                          <div className="h-px bg-slate-200"></div>
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 font-medium">Ragu-ragu</span>
                              <span className="font-black text-orange-500 text-lg">{Object.values(doubtful).filter(Boolean).length}</span>
                          </div>
                      </div>

                      <div className="flex gap-4">
                          <button onClick={() => setShowConfirmFinish(false)} className="flex-1 py-4 px-4 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition">Batal</button>
                          <button onClick={() => executeFinish(false)} className="flex-1 py-4 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:shadow-lg transition">Ya, Selesai</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudentExam;