const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);
const sheet = wb.Sheets['ICX8100-C08PFVM_90'];
const data = XLSX.utils.sheet_to_json(sheet);

data.forEach((r, i) => {
    console.log(`[${i}] ROUTE: ${r.ROUTE} | RIDX: ${r.RIDX} | STEP: ${r.STEP} | MSTEP: ${r.MSTEP} | OSTEP: ${r.OSTEP} | GRP: ${r.GRP} | RTYPE2: ${r.RTYPE2}`);
});
