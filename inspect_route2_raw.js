const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);
console.log("SheetNames:", wb.SheetNames);
const sheet = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log("First 5 rows (raw):", JSON.stringify(raw.slice(0, 5), null, 2));
