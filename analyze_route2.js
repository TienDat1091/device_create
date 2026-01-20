const XLSX = require('xlsx');
const path = require('path');

const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
console.log(`Analyzing ${file}...`);

const wb = XLSX.readFile(file);
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

console.log(`Total rows: ${data.length}`);

// Look for RTYPE2 = 'R' (Repair) and its corresponding 'B' (Rollback) rows
// In Route2, they should be clustered or serial.

const repairRows = data.filter(r => r.RTYPE2 === 'R');

console.log("\n--- REPAIR ROWS ANALYSIS ---");
repairRows.forEach(r => {
    // A repair row usually has a GRP (Source) and a STEP (Target)
    // And a corresponding Rollback row follows it.
    console.log(`ROUTE: ${r.ROUTE} | GRP: ${r.GRP} | STEP: ${r.STEP} | MSTEP: ${r.MSTEP} | RTYPE2: ${r.RTYPE2}`);
});

console.log("\n--- ROLLBACK ROWS ANALYSIS ---");
data.filter(r => r.RTYPE2 === 'B').slice(0, 20).forEach(r => {
    console.log(`ROUTE: ${r.ROUTE} | STEP: ${r.STEP} | MSTEP: ${r.MSTEP} | OSTEP: ${r.OSTEP} | GRP: ${r.GRP}`);
});
