/**
 * CBT SYSTEM BACKEND - GOOGLE APPS SCRIPT
 * Integrated Version: Auth, Exam Logic, Scoring, Data Persistence, and Config.
 */

// --- CONFIGURATION CONSTANTS ---
const SHEET_USERS = "Users";         // Data Siswa
const SHEET_ADMINS = "Admins";       // Data Admin (Pusat & Sekolah)
const SHEET_CONFIG = "Config";       // Konfigurasi Global
const SHEET_RESULTS = "Nilai";       // Hasil Nilai Akhir
const SHEET_REKAP = "Rekap_Analisis";// Detail Jawaban per Soal
const SHEET_LOGS = "Logs";           // Aktivitas User
const SHEET_SCHEDULE = "Jadwal_Sekolah"; // Jadwal Ujian Sekolah

const IGNORED_SHEETS = [
  SHEET_USERS, SHEET_ADMINS, SHEET_CONFIG, SHEET_RESULTS, 
  SHEET_REKAP, SHEET_LOGS, SHEET_SCHEDULE, 'Template'
];

// --- HTTP HANDLERS ---

function doGet(e) {
  // Simple connectivity check
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "online", 
    message: "CBT Backend is Running." 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // Lock to prevent race conditions during heavy submissions
  const lock = LockService.getScriptLock();
  // Wait for up to 10 seconds for other processes to finish
  lock.tryLock(10000); 

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ error: "Invalid Request" });
    }
    
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const args = params.args || [];
    
    let result;
    
    // Router
    switch (action) {
      // Auth & User
      case 'login': result = loginUser(args[0], args[1]); break;
      case 'checkUserStatus': result = checkUserStatus(args[0]); break;
      case 'resetLogin': result = resetLogin(args[0]); break;
      case 'saveUser': result = adminSaveUser(args[0]); break;
      case 'deleteUser': result = adminDeleteUser(args[0]); break;
      case 'getUsers': result = getUsers(); break;
      case 'importUsers': result = adminImportUsers(args[0]); break;
      case 'updateUserSessions': result = updateUserSessions(args[0]); break;
      case 'assignTestGroup': result = assignTestGroup(args[0], args[1], args[2]); break;

      // Exam Config & Questions
      case 'getSubjectList': result = getSubjectList(); break;
      case 'saveSubjectConfig': result = saveSubjectConfig(args[0], args[1]); break;
      case 'saveBatchSubjectConfig': result = saveBatchSubjectConfig(args[0]); break; 
      case 'getQuestionsFromSheet': result = getQuestionsFromSheet(args[0]); break;
      // FIX: Changed adminGetQuestions to getRawQuestions to match function definition
      case 'getRawQuestions': result = getRawQuestions(args[0]); break;
      case 'saveQuestion': result = adminSaveQuestion(args[0], args[1]); break;
      case 'importQuestions': result = adminImportQuestions(args[0], args[1]); break;
      case 'deleteQuestion': result = adminDeleteQuestion(args[0], args[1]); break;
      
      // Global Config
      case 'getTokenFromConfig': result = getConfigValue('TOKEN', 'TOKEN'); break;
      case 'saveConfig': result = saveConfig(args[0], args[1]); break; // General config saver
      case 'saveDuration': result = saveConfig('DURATION', args[0]); break;
      case 'saveToken': result = saveConfig('TOKEN', args[0]); break;

      // Schedule
      case 'getSchoolSchedules': result = getSchoolSchedules(); break;
      case 'saveSchoolSchedules': result = saveSchoolSchedules(args[0]); break;

      // Exam Execution
      case 'startExam': result = startExam(args[0], args[1], args[2]); break;
      case 'submitAnswers': result = submitAnswers(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]); break;

      // Dashboard & Reports
      case 'getDashboardData': result = getDashboardData(); break;
      case 'getRecapData': result = getRecapData(); break;
      case 'getAnalysisData': result = getAnalysisData(args[0]); break;

      default: 
        throw new Error("Function not found: " + action);
    }
    
    return responseJSON(result);

  } catch (err) {
    return responseJSON({ error: "Server Error: " + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- HELPER FUNCTIONS ---

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function toSheetValue(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  // Force text for numbers with leading zeros (e.g. '00123')
  if (str.length > 1 && str.startsWith('0') && /^\d+$/.test(str)) return "'" + str;
  return val;
}

function logUserActivity(username, fullname, action, details) {
  try {
    const sheet = getSheet(SHEET_LOGS);
    if (sheet.getLastRow() === 0) sheet.appendRow(["Timestamp", "Username", "Nama", "Action", "Details"]);
    sheet.appendRow([new Date(), username, fullname, action, details]);
  } catch (e) { console.error("Log failed", e); }
}

function setUserStatus(username, status) {
  try {
    const sheet = getSheet(SHEET_USERS);
    const data = sheet.getDataRange().getDisplayValues();
    
    // Ensure header for Status exists (Column 12 / Index 11)
    if (data.length > 0 && data[0].length < 12) {
       sheet.getRange(1, 12).setValue("Status");
    }

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
        sheet.getRange(i + 1, 12).setValue(status);
        break;
      }
    }
  } catch (e) { console.error("Set Status Failed", e); }
}

function getConfigValue(key, defaultValue) {
  const sheet = getSheet(SHEET_CONFIG);
  const data = sheet.getDataRange().getValues();
  for(let i=0; i<data.length; i++) {
    if(String(data[i][0]) === String(key)) {
      return data[i][1];
    }
  }
  return defaultValue;
}

function saveConfig(key, value) {
  const sheet = getSheet(SHEET_CONFIG);
  // Ensure headers if empty
  if (sheet.getLastRow() === 0) sheet.appendRow(["Key", "Value"]);
  
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  for(let i=0; i<data.length; i++) {
    if(String(data[i][0]) === String(key)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 2).setValue(String(value));
  } else {
    sheet.appendRow([key, String(value)]);
  }
  return { success: true };
}

// --- AUTHENTICATION ---

function loginUser(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inputUser = String(username).trim().toLowerCase();
  const inputPass = String(password).trim();

  // 1. Check Admins
  const adminSheet = ss.getSheetByName(SHEET_ADMINS);
  if (adminSheet) {
    const data = adminSheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
        if (!data[i][1]) continue;
        if (String(data[i][1]).trim().toLowerCase() === inputUser && String(data[i][2]).trim() === inputPass) {
             const role = data[i][3];
             const schoolName = data[i][6] || '-';
             
             // VALIDASI TANGGAL UNTUK ADMIN SEKOLAH (PROKTOR)
             if (role === 'admin_sekolah') {
                 const schData = getSchoolSchedules();
                 const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
                 const mySched = schData.find(s => String(s.school).toLowerCase() === String(schoolName).toLowerCase());
                 
                 if (mySched) {
                     const start = mySched.tanggal;
                     const end = mySched.tanggal_selesai || start;
                     if (todayStr < start || todayStr > end) {
                         const msgDate = (start === end) ? start : `${start} s.d ${end}`;
                         return { success: false, message: `Login Ditolak. Jadwal ujian sekolah Anda adalah ${msgDate}.` };
                     }
                 }
             }

             return {
                success: true,
                user: { 
                    username: data[i][1], role: role, fullname: data[i][4], gender: data[i][5] || '-', school: schoolName, kecamatan: data[i][7] || '-', photo_url: data[i][8] || ''
                }
             };
        }
    }
  }

  // 2. Check Users (Students)
  const userSheet = getSheet(SHEET_USERS);
  const data = userSheet.getDataRange().getDisplayValues();
  
  for (let i = 1; i < data.length; i++) {
    if (!data[i][1]) continue;
    if (String(data[i][1]).trim().toLowerCase() === inputUser && String(data[i][2]).trim() === inputPass) {
      logUserActivity(inputUser, data[i][4], "LOGIN", "Success");
      // UPDATE STATUS TO LOGGED_IN
      setUserStatus(data[i][1], 'LOGGED_IN');
      
      return {
        success: true,
        user: { 
            username: data[i][1], role: 'siswa', fullname: data[i][4], gender: data[i][5] || '-', school: data[i][6] || '-', 
            active_exam: data[i][7] || '-', session: data[i][8] || '-', kecamatan: data[i][9] || '-', photo_url: data[i][10] || ''
        }
      };
    }
  }
  
  return { success: false, message: "Username atau Password salah." };
}

// --- EXAM CONFIGURATION & QUESTIONS ---

function getSubjectList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const subjectMap = new Map();

  const globalToken = getConfigValue('TOKEN', 'TOKEN');
  const globalDuration = getConfigValue('DURATION', 60);
  
  // Parse Config per Subject
  let subjectConfig = {};
  try {
    const rawConfig = getConfigValue('SUBJECT_CONFIG', '{}');
    subjectConfig = JSON.parse(rawConfig);
  } catch(e) {}

  // 1. Mandatory Subjects (Matematika, IPA, IPS)
  const defaults = ["Matematika", "IPA", "IPS"];
  defaults.forEach(d => {
      subjectMap.set(d, subjectConfig[d] || 0);
  });

  // 2. Scan for existing sheets that are not system sheets
  for (let i = 0; i < sheets.length; i++) {
    const name = sheets[i].getName();
    if (IGNORED_SHEETS.indexOf(name) === -1) {
       subjectMap.set(name, subjectConfig[name] || 0);
    }
  }

  const subjects = [];
  subjectMap.forEach((limit, name) => {
      subjects.push({ name: name, limit: limit });
  });

  return {
    subjects: subjects,
    token: globalToken,
    duration: Number(globalDuration),
    maxQuestions: 0
  };
}

function saveSubjectConfig(subject, maxQuestions) {
  try {
    let config = {};
    try {
      const saved = getConfigValue('SUBJECT_CONFIG', '{}');
      config = JSON.parse(saved);
    } catch(e) { config = {}; }
    
    config[subject] = Number(maxQuestions);
    saveConfig('SUBJECT_CONFIG', JSON.stringify(config));
    
    return { success: true, message: "Konfigurasi mapel berhasil disimpan." };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

function saveBatchSubjectConfig(configMap) {
  try {
    let config = {};
    try {
      const saved = getConfigValue('SUBJECT_CONFIG', '{}');
      config = JSON.parse(saved);
    } catch(e) { config = {}; }
    
    // Merge updates
    for (const key in configMap) {
        config[key] = Number(configMap[key]);
    }
    
    saveConfig('SUBJECT_CONFIG', JSON.stringify(config));
    
    return { success: true, message: "Konfigurasi batch berhasil disimpan." };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

function getRawQuestions(subject) {
  const sheet = getSheet(subject);
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) return [];
  
  // INDEX SHIFTED DUE TO 'KETERANGAN GAMBAR' at Col 4 (Index 4)
  return data.slice(1).map(row => ({
    id: row[0],
    text_soal: row[1],
    tipe_soal: row[2],
    gambar: row[3],
    keterangan_gambar: row[4] || "", // NEW FIELD
    opsi_a: row[5],
    opsi_b: row[6],
    opsi_c: row[7],
    opsi_d: row[8],
    kunci_jawaban: row[9],
    bobot: row[10] ? Number(row[10]) : 10
  }));
}

function getQuestionsFromSheet(subject) {
  const raw = getRawQuestions(subject);
  return raw.map(q => {
    const options = [];
    if(q.tipe_soal !== 'BS') {
        if(q.opsi_a) options.push({ id: 'A', text_jawaban: q.opsi_a });
        if(q.opsi_b) options.push({ id: 'B', text_jawaban: q.opsi_b });
        if(q.opsi_c) options.push({ id: 'C', text_jawaban: q.opsi_c });
        if(q.opsi_d) options.push({ id: 'D', text_jawaban: q.opsi_d });
    } else {
        if(q.opsi_a) options.push({ id: 'S1', text_jawaban: q.opsi_a });
        if(q.opsi_b) options.push({ id: 'S2', text_jawaban: q.opsi_b });
        if(q.opsi_c) options.push({ id: 'S3', text_jawaban: q.opsi_c });
        if(q.opsi_d) options.push({ id: 'S4', text_jawaban: q.opsi_d });
    }

    return {
        id: q.id,
        text: q.text_soal,
        type: q.tipe_soal,
        image: q.gambar,
        caption: q.keterangan_gambar, // Pass to frontend as 'caption'
        options: options
    };
  });
}

function adminSaveQuestion(subject, qData) {
  const sheet = getSheet(subject);
  // HEADER UPDATED: Added Keterangan Gambar
  if (sheet.getLastRow() === 0) sheet.appendRow(["ID Soal", "Teks Soal", "Tipe Soal", "Link Gambar", "Keterangan Gambar", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Kunci Jawaban", "Bobot"]);
  
  const data = sheet.getDataRange().getDisplayValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(qData.id)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  // Added qData.keterangan_gambar at index 4
  const rowVals = [
    toSheetValue(qData.id), qData.text_soal, qData.tipe_soal, qData.gambar||"", 
    qData.keterangan_gambar||"", 
    qData.opsi_a||"", qData.opsi_b||"", qData.opsi_c||"", qData.opsi_d||"", 
    qData.kunci_jawaban, qData.bobot
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, 11).setValues([rowVals]); // Range extended to 11
  } else {
    sheet.appendRow(rowVals);
  }
  return { success: true };
}

function adminImportQuestions(subject, questionsList) {
  const sheet = getSheet(subject);
  if (sheet.getLastRow() === 0) sheet.appendRow(["ID Soal", "Teks Soal", "Tipe Soal", "Link Gambar", "Keterangan Gambar", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Kunci Jawaban", "Bobot"]);
  
  const newRows = questionsList.map(q => [
    toSheetValue(q.id), q.text_soal, q.tipe_soal||'PG', q.gambar||'', 
    q.keterangan_gambar||'',
    q.opsi_a||'', q.opsi_b||'', q.opsi_c||'', q.opsi_d||'', 
    q.kunci_jawaban||'', q.bobot||10
  ]);
  
  if(newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 11).setValues(newRows);
  }
  return { success: true };
}

function adminDeleteQuestion(subject, id) {
  const sheet = getSheet(subject);
  const data = sheet.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false };
}

// --- USER MANAGEMENT ---

function getUsers() {
  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getDisplayValues();
  return data.slice(1).map(row => ({
    id: row[0],
    username: row[1],
    password: row[2],
    role: 'siswa',
    fullname: row[4],
    gender: row[5],
    school: row[6],
    active_exam: row[7],
    session: row[8],
    kecamatan: row[9],
    photo_url: row[10],
    status: row[11] || 'OFFLINE'
  }));
}

function adminSaveUser(userData) {
    const isStudent = (userData.role === 'siswa');
    const targetSheetName = isStudent ? SHEET_USERS : SHEET_ADMINS;
    const sheet = getSheet(targetSheetName);
    
    if (sheet.getLastRow() === 0) {
        if(isStudent) sheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Active_Exam", "Session", "Kecamatan", "Photo", "Status"]);
        else sheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Kecamatan", "Photo"]);
    }

    const data = sheet.getDataRange().getDisplayValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) { 
        if (String(data[i][1]).toLowerCase() === String(userData.username).toLowerCase()) { 
            rowIndex = i + 1; break; 
        } 
    }
    
    const id = userData.id || (isStudent ? 'U' : 'A') + new Date().getTime();
    let photoUrl = userData.photo_url || "";
    
    const rowValues = isStudent 
        ? [toSheetValue(id), toSheetValue(userData.username), toSheetValue(userData.password), 'siswa', userData.fullname, userData.gender, userData.school, userData.active_exam||'-', userData.session||'-', userData.kecamatan, photoUrl]
        : [toSheetValue(id), toSheetValue(userData.username), toSheetValue(userData.password), userData.role, userData.fullname, userData.gender, userData.school, userData.kecamatan, photoUrl];

    if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
        sheet.appendRow(rowValues);
    }
    return { success: true };
}

function adminDeleteUser(username) {
    const s1 = deleteFromSheet(SHEET_USERS, username);
    const s2 = deleteFromSheet(SHEET_ADMINS, username);
    return { success: s1 || s2 };
}

function deleteFromSheet(sheetName, username) {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getDisplayValues();
    for(let i=1; i<data.length; i++) {
        if(String(data[i][1]).toLowerCase() === String(username).toLowerCase()) {
            sheet.deleteRow(i+1);
            return true;
        }
    }
    return false;
}

function adminImportUsers(users) {
    const sheet = getSheet(SHEET_USERS);
    if(sheet.getLastRow() === 0) sheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Active_Exam", "Session", "Kecamatan", "Photo", "Status"]);
    
    const rows = users.map(u => [
        toSheetValue('U'+Math.floor(Math.random()*100000)), 
        toSheetValue(u.username), toSheetValue(u.password), 'siswa', 
        u.fullname, u.gender, u.school, '-', '-', u.kecamatan, u.photo_url || ''
    ]);
    
    if(rows.length > 0) sheet.getRange(sheet.getLastRow()+1, 1, rows.length, rows[0].length).setValues(rows);
    return { success: true };
}

function assignTestGroup(usernames, examId, session) {
    const sheet = getSheet(SHEET_USERS);
    const data = sheet.getDataRange().getDisplayValues();
    const rowMap = {};
    for(let i=1; i<data.length; i++) rowMap[data[i][1]] = i+1;

    usernames.forEach(u => {
        if(rowMap[u]) {
            sheet.getRange(rowMap[u], 8).setValue(examId);
            if(session) sheet.getRange(rowMap[u], 9).setValue(session);
        }
    });
    return { success: true };
}

function updateUserSessions(updates) {
    const sheet = getSheet(SHEET_USERS);
    const data = sheet.getDataRange().getDisplayValues();
    const rowMap = {};
    for(let i=1; i<data.length; i++) rowMap[data[i][1]] = i+1;

    updates.forEach(u => {
        if(rowMap[u.username]) sheet.getRange(rowMap[u.username], 9).setValue(u.session);
    });
    return { success: true };
}

function resetLogin(username) {
    logUserActivity(username, "Admin", "RESET", "Manual Reset Login");
    setUserStatus(username, 'OFFLINE'); 
    return { success: true };
}

function checkUserStatus(username) {
    const sheet = getSheet(SHEET_USERS);
    const data = sheet.getDataRange().getDisplayValues();
    
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).toLowerCase() === String(username).toLowerCase()) {
            const status = data[i][11];
            if (status === 'OFFLINE') return { status: 'RESET' };
            return { status: 'OK' };
        }
    }
    return { status: 'RESET' };
}

// --- EXAM LOGIC ---

function startExam(username, fullname, subject) {
    const sheet = getSheet(SHEET_LOGS);
    const data = sheet.getDataRange().getValues();
    let startTime = new Date().getTime();
    let isResuming = false;

    for (let i = data.length - 1; i >= 1; i--) {
        const rowUser = String(data[i][1]).toLowerCase();
        const rowAction = String(data[i][3]).toUpperCase();
        const rowDetail = String(data[i][4]); 
        
        if (rowUser === String(username).toLowerCase()) {
            if (rowAction === 'FINISH' && rowDetail.includes(subject)) {
                break;
            }
            if ((rowAction === 'START' || rowAction === 'RESUME') && rowDetail === subject) {
                startTime = new Date(data[i][0]).getTime();
                isResuming = true;
                break;
            }
        }
    }
    
    logUserActivity(username, fullname, isResuming ? "RESUME" : "START", subject);
    setUserStatus(username, 'WORKING');
    return { success: true, startTime: startTime, isResuming: isResuming };
}

function submitAnswers(username, fullname, school, subject, answers, scoreInfo, startTime, displayedCount, questionIds) {
    const now = new Date();
    answers = answers || {};
    
    const rawQuestions = getRawQuestions(subject);
    let targetQuestions = rawQuestions;
    if (questionIds && questionIds.length > 0) {
        targetQuestions = rawQuestions.filter(q => questionIds.includes(q.id));
    } else if (displayedCount > 0) {
        targetQuestions = rawQuestions.slice(0, displayedCount);
    }

    let totalScore = 0;
    let maxPossibleScore = 0;
    const analysisMap = {};
    
    targetQuestions.forEach(q => {
        const weight = Number(q.bobot) || 10;
        maxPossibleScore += weight;
        
        const userAns = answers[q.id];
        let isCorrect = 0;
        
        if (q.tipe_soal === 'PG') {
            if (String(userAns).toUpperCase() === String(q.kunci_jawaban).toUpperCase()) {
                totalScore += weight;
                isCorrect = 1;
            }
        } else if (q.tipe_soal === 'PGK') {
            const keys = String(q.kunci_jawaban).toUpperCase().split(',').map(s=>s.trim()).sort();
            const uVals = Array.isArray(userAns) ? userAns.map(s=>String(s).toUpperCase()).sort() : [];
            if (keys.length === uVals.length && keys.every((v,i) => v === uVals[i])) {
                totalScore += weight;
                isCorrect = 1;
            }
        } else if (q.tipe_soal === 'BS') {
            if(userAns) {
                totalScore += weight; 
                isCorrect = 1;
            }
        }
        
        analysisMap[q.id] = isCorrect;
    });

    const finalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const durationSec = Math.floor((now.getTime() - startTime) / 1000);
    const h = Math.floor(durationSec / 3600);
    const m = Math.floor((durationSec % 3600) / 60);
    const s = durationSec % 60;
    const durationStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

    const sheetNilai = getSheet(SHEET_RESULTS);
    if(sheetNilai.getLastRow()===0) sheetNilai.appendRow(["Timestamp", "Username", "Nama", "Sekolah", "Mapel", "Nilai", "Analisis_JSON", "Durasi"]);
    sheetNilai.appendRow([now, toSheetValue(username), fullname, school, subject, finalScore.toFixed(2), JSON.stringify(analysisMap), durationStr]);

    logUserActivity(username, fullname, "FINISH", `${subject}: ${finalScore.toFixed(2)}`);
    setUserStatus(username, 'FINISHED');
    return { success: true };
}

// --- DASHBOARD & REPORTS ---

function getRecapData() {
  const sheet = getSheet(SHEET_RESULTS);
  const data = sheet.getDataRange().getDisplayValues();
  const results = [];
  for(let i=1; i<data.length; i++) { 
    if(data[i][0]) {
      results.push({ 
        timestamp: data[i][0], 
        username: data[i][1], 
        nama: data[i][2], 
        sekolah: data[i][3], 
        mapel: data[i][4], 
        nilai: data[i][5], 
        analisis: data[i][6], 
        durasi: data[i][7] 
      }); 
    }
  }
  return results;
}

function getAnalysisData(subject) {
  const sheet = getSheet(SHEET_RESULTS);
  const data = sheet.getDataRange().getDisplayValues();
  const results = [];
  
  for(let i=1; i<data.length; i++) {
    if (!data[i][0]) continue;
    if (String(data[i][4]).trim().toLowerCase() === String(subject).trim().toLowerCase()) {
        results.push({
            timestamp: data[i][0],
            username: data[i][1],
            nama: data[i][2],
            sekolah: data[i][3],
            nilai: data[i][5],
            analisis: data[i][6]
        });
    }
  }
  return results;
}

function getSchoolSchedules() {
    const sheet = getSheet(SHEET_SCHEDULE);
    const data = sheet.getDataRange().getDisplayValues();
    if(data.length < 2) return [];
    return data.slice(1).map(row => ({
        school: row[0],
        gelombang: row[1],
        tanggal: row[2],
        tanggal_selesai: row[3]
    }));
}

function saveSchoolSchedules(schedules) {
    const sheet = getSheet(SHEET_SCHEDULE);
    sheet.clear();
    sheet.appendRow(["School", "Gelombang", "Tanggal", "Tanggal_Selesai"]);
    
    const rows = schedules.map(s => [s.school, s.gelombang, s.tanggal, s.tanggal_selesai]);
    if(rows.length > 0) sheet.getRange(2, 1, rows.length, 4).setValues(rows);
    return { success: true };
}

function getDashboardData() {
    const globalToken = getConfigValue('TOKEN', 'TOKEN');
    const globalDuration = getConfigValue('DURATION', 60);
    
    const allUsers = getUsers();
    const logSheet = getSheet(SHEET_LOGS);
    const logs = logSheet.getDataRange().getValues();

    const schedules = getSchoolSchedules();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const subjectCounts = [];
    const processed = new Set();
    const mandatory = ["Matematika", "IPA", "IPS"];

    // 1. Process Mandatory Subjects Explicitly
    // This ensures they appear in the dashboard even if the sheet doesn't exist (count 0)
    mandatory.forEach(name => {
        const sheet = ss.getSheetByName(name);
        const count = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
        subjectCounts.push({ name: name, count: count });
        processed.add(name);
    });

    // 2. Process other valid sheets that are not system sheets and not already processed
    const allSheets = ss.getSheets();
    allSheets.forEach(sheet => {
        const name = sheet.getName();
        if (!processed.has(name) && IGNORED_SHEETS.indexOf(name) === -1) {
            const count = Math.max(0, sheet.getLastRow() - 1);
            subjectCounts.push({ name: name, count: count });
        }
    });
    
    const activityFeed = [];
    const feedSize = 50;
    for(let i = logs.length - 1; i >= Math.max(1, logs.length - feedSize); i--) {
        const userDet = allUsers.find(u => u.username == logs[i][1]);
        activityFeed.push({
            timestamp: logs[i][0],
            username: logs[i][1],
            fullname: logs[i][2],
            action: logs[i][3],
            details: logs[i][4],
            school: userDet ? userDet.school : '-',
            kecamatan: userDet ? userDet.kecamatan : '-'
        });
    }

    return {
        token: globalToken,
        duration: Number(globalDuration),
        allUsers: allUsers,
        schedules: schedules,
        subjects: subjectCounts,
        activityFeed: activityFeed
    };
}
