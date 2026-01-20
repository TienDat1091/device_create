const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

data.forEach((r, i) => {
    console.log(`[Row ${i}] STEP: ${r.STEP} | MSTEP: ${r.MSTEP} | OSTEP: ${r.OSTEP} | GRP: ${r.GRP} | RTYPE2: ${r.RTYPE2}`);
});
