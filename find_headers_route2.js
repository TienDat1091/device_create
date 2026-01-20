const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

data.forEach((row, i) => {
    if (row.length > 5) {
        console.log(`Row ${i}:`, row.join(' | '));
    }
});
