function getRecapData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RESULTS);
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues();
  const results = [];
  for(let i=1; i<data.length; i++) { if(data[i][0]) results.push({ timestamp: data[i][0], username: data[i][1], nama: data[i][2], sekolah: data[i][3], mapel: data[i][4], nilai: data[i][5], analisis: data[i][6], durasi: data[i][7] }); }
  return results;
}

function getAnalysisData(subject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RESULTS);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getDisplayValues();
  const results = [];
  
  // Filter by subject directly on server side to save bandwidth
  for(let i=1; i<data.length; i++) {
    if (!data[i][0]) continue;
    // Column 4 (index 4) is 'Mapel' based on submitAnswers
    if (String(data[i][4]).trim().toLowerCase() === String(subject).trim().toLowerCase()) {
        results.push({
            timestamp: data[i][0],
            username: data[i][1],
            nama: data[i][2],
            sekolah: data[i][3],
            nilai: data[i][5],
            analisis: data[i][6] // This is the JSON string {Q1:1, Q2:0...}
        });
    }
  }
  return results;
}