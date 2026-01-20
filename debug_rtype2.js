const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);
const sheet = wb.Sheets['ICX8100-C08PFVM_90'];
const data = XLSX.utils.sheet_to_json(sheet);

data.forEach(r => {
    console.log(`RIDX: ${r.RIDX} | RTYPE2: "${r.RTYPE2}" | GRP: ${r.GRP}`);
});
