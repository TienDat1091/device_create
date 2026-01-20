const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);
const sheet = wb.Sheets['ICX8100-C08PFVM_90'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

data.forEach((row, i) => {
    console.log(`[${i}]`, row.join(' | '));
});
