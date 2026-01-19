const XLSX = require('xlsx');
const FILE_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\Ho tro tao all - Copy - Copy.xlsx";
const workbook = XLSX.readFile(FILE_PATH);
const sheet = workbook.Sheets['ALLDEV'];
const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
console.log("Headers of ALLDEV:", headers);
