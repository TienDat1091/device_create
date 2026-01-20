const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);
const sheet = wb.Sheets['ICX8100-C08PFVM_90'];
const data = XLSX.utils.sheet_to_json(sheet);

console.log("--- REPAIR/ROLLBACK LOGIC IN ROUTE2 ---");
data.filter(r => r.RTYPE2 === 'R' || r.RTYPE2 === 'B').forEach((r, i) => {
    console.log(`RIDX: ${r.RIDX} | RTYPE2: ${r.RTYPE2} | STEP: ${r.STEP} | MSTEP: ${r.MSTEP} | OSTEP: ${r.OSTEP} | GRP: ${r.GRP}`);
});
