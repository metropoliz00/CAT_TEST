import { User, Exam, QuestionWithOptions, QuestionRow, SchoolSchedule } from '../types';

// The Apps Script Web App URL provided
const GAS_EXEC_URL = "https://script.google.com/macros/s/AKfycbxbXFOgN0hvu7ZF-HEsGb5NE8WPFyXdnpJOAFX6maaNJwULQOFFxr-E7HJGajJQSYHs/exec";

// Check if running inside GAS iframe
const isEmbedded = typeof window !== 'undefined' && window.google && window.google.script;

// Helper to format Google Drive URLs to direct image links
const formatGoogleDriveUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    if (typeof url !== 'string') return url;
    try {
        if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
            const match = url.match(/[-\w]{25,}/);
            if (match) {
                return `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;
            }
        }
    } catch (e) { 
        return url; 
    }
    return url;
};

// Helper to call backend functions with RETRY Logic
const callBackend = async (fnName: string, ...args: any[]) => {
  if (isEmbedded) {
    return new Promise((resolve, reject) => {
      window.google!.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        [fnName](...args);
    });
  }

  if (GAS_EXEC_URL) {
      let attempt = 0;
      const maxAttempts = 3;
      
      while (attempt < maxAttempts) {
          try {
              const url = `${GAS_EXEC_URL}?t=${new Date().getTime()}`;
              
              const response = await fetch(url, {
                  redirect: "follow", 
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: fnName, args: args })
              });
              
              if (!response.ok) throw new Error(`Server Error (${response.status})`);
              
              const text = await response.text();
              try {
                  return JSON.parse(text);
              } catch (e) {
                  throw new Error("Invalid response from server");
              }

          } catch (error) {
              attempt++;
              if (attempt === maxAttempts) throw error;
              await new Promise(r => setTimeout(r, 1000 * attempt));
          }
      }
  }
  throw new Error("No backend connection available");
};

export const api = {
  login: async (username: string, password?: string): Promise<User | null> => {
    const result: any = await callBackend('login', username, password);
    if (result && result.success && result.user) {
        return {
            id: result.user.username,
            username: result.user.username,
            role: result.user.role,
            nama_lengkap: result.user.fullname,
            jenis_kelamin: result.user.gender, 
            kelas_id: result.user.school,
            kecamatan: result.user.kecamatan, 
            active_exam: result.user.active_exam, 
            session: result.user.session,
            photo_url: formatGoogleDriveUrl(result.user.photo_url) 
        };
    }
    return null;
  },

  startExam: async (username: string, fullname: string, subject: string): Promise<any> => {
      return await callBackend('startExam', username, fullname, subject);
  },

  checkStatus: async (username: string): Promise<string> => {
      const res: any = await callBackend('checkUserStatus', username);
      return res.status;
  },

  getExams: async (): Promise<Exam[]> => {
    const response: any = await callBackend('getSubjectList');
    let subjects: any[] = [];
    let duration = 60;
    
    // Parse response structure
    if (Array.isArray(response)) {
        subjects = response; // Legacy: just strings
    } else if (response && response.subjects) {
        subjects = response.subjects;
        duration = response.duration || 60;
    }

    if (subjects.length > 0) {
        return subjects.map((s) => {
            const name = typeof s === 'string' ? s : s.name;
            const limit = typeof s === 'object' && s.limit !== undefined ? s.limit : 0;
            
            return {
                id: name,
                nama_ujian: name,
                waktu_mulai: new Date().toISOString(),
                durasi: Number(duration),
                token_akses: 'TOKEN', 
                is_active: true,
                max_questions: Number(limit)
            };
        });
    }
    return [];
  },

  getServerToken: async (): Promise<string> => {
      return await callBackend('getTokenFromConfig') as string;
  },

  saveToken: async (newToken: string): Promise<{success: boolean}> => {
      return await callBackend('saveConfig', 'TOKEN', newToken);
  },
  
  saveDuration: async (minutes: number): Promise<{success: boolean}> => {
      return await callBackend('saveConfig', 'DURATION', minutes);
  },

  saveMaxQuestions: async (amount: number): Promise<{success: boolean}> => {
      return await callBackend('saveConfig', 'MAX_QUESTIONS', amount);
  },
  
  saveSubjectConfig: async (subject: string, maxQuestions: number): Promise<{success: boolean}> => {
      return await callBackend('saveSubjectConfig', subject, maxQuestions);
  },

  saveBatchSubjectConfig: async (configMap: Record<string, number>): Promise<{success: boolean}> => {
      return await callBackend('saveBatchSubjectConfig', configMap);
  },

  getQuestions: async (subject: string): Promise<QuestionWithOptions[]> => {
    const data: any = await callBackend('getQuestionsFromSheet', subject);
    if (!Array.isArray(data)) return [];

    return data.map((q: any, i: number) => ({
        id: q.id || `Q${i+1}`,
        exam_id: subject,
        text_soal: q.text || "Pertanyaan tanpa teks",
        tipe_soal: q.type || 'PG',
        bobot_nilai: 10,
        gambar: q.image || undefined,
        keterangan_gambar: q.caption || undefined, // Map caption from backend
        options: Array.isArray(q.options) ? q.options.map((o: any, idx: number) => ({
            id: o.id || `opt-${i}-${idx}`,
            question_id: q.id || `Q${i+1}`,
            text_jawaban: o.text_jawaban || o.text || "", 
            is_correct: false 
        })) : []
    }));
  },

  getRawQuestions: async (subject: string): Promise<QuestionRow[]> => {
      const result = await callBackend('getRawQuestions', subject);
      return Array.isArray(result) ? result : [];
  },
  
  saveQuestion: async (subject: string, data: QuestionRow): Promise<{success: boolean, message: string}> => {
      return await callBackend('saveQuestion', subject, data);
  },

  importQuestions: async (subject: string, data: QuestionRow[]): Promise<{success: boolean, message: string}> => {
      return await callBackend('importQuestions', subject, data);
  },

  deleteQuestion: async (subject: string, id: string): Promise<{success: boolean, message: string}> => {
      return await callBackend('deleteQuestion', subject, id);
  },

  getUsers: async (): Promise<any[]> => {
      const users: any = await callBackend('getUsers');
      if (Array.isArray(users)) {
          return users.map((u: any) => ({
              ...u,
              photo_url: formatGoogleDriveUrl(u.photo_url)
          }));
      }
      return [];
  },

  saveUser: async (userData: any): Promise<{success: boolean, message: string}> => {
      return await callBackend('saveUser', userData);
  },

  deleteUser: async (userId: string): Promise<{success: boolean, message: string}> => {
      return await callBackend('deleteUser', userId);
  },

  importUsers: async (users: any[]): Promise<{success: boolean, message: string}> => {
      return await callBackend('importUsers', users);
  },

  assignTestGroup: async (usernames: string[], examId: string, session: string): Promise<{success: boolean}> => {
      return await callBackend('assignTestGroup', usernames, examId, session);
  },

  updateUserSessions: async (updates: {username: string, session: string}[]): Promise<{success: boolean}> => {
      return await callBackend('updateUserSessions', updates);
  },

  resetLogin: async (username: string): Promise<{success: boolean}> => {
      return await callBackend('resetLogin', username);
  },
  
  getSchoolSchedules: async (): Promise<SchoolSchedule[]> => {
      return await callBackend('getSchoolSchedules');
  },

  saveSchoolSchedules: async (schedules: SchoolSchedule[]): Promise<{success: boolean}> => {
      return await callBackend('saveSchoolSchedules', schedules);
  },

  getRecap: async (): Promise<any[]> => {
      const res = await callBackend('getRecapData');
      return Array.isArray(res) ? res : [];
  },

  getAnalysis: async (subject: string): Promise<any> => {
      return await callBackend('getAnalysisData', subject);
  },

  submitExam: async (payload: { user: User, subject: string, answers: any, startTime: number, displayedQuestionCount?: number, questionIds?: string[] }) => {
      const scoreInfo = { total: 0, answered: Object.keys(payload.answers).length };
      return await callBackend(
          'submitAnswers', 
          payload.user.username, 
          payload.user.nama_lengkap, 
          payload.user.kelas_id, 
          payload.subject, 
          payload.answers, 
          scoreInfo, 
          payload.startTime, 
          payload.displayedQuestionCount || 0, 
          payload.questionIds || [] 
      );
  },
  
  getDashboardData: async () => {
      const data: any = await callBackend('getDashboardData');
      if (data && Array.isArray(data.allUsers)) {
          data.allUsers = data.allUsers.map((u: any) => ({
              ...u,
              photo_url: formatGoogleDriveUrl(u.photo_url)
          }));
      }
      return data;
  }
};
