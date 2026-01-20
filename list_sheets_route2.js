const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);
wb.SheetNames.forEach(sn => {
    const sheet = wb.Sheets[sn];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Sheet: ${sn} | Rows: ${data.length}`);
});
