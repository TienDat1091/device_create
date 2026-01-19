const XLSX = require('xlsx');
const FILE_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\Ho tro tao all - Copy - Copy.xlsx";
const workbook = XLSX.readFile(FILE_PATH);
const sheet = workbook.Sheets["TaoRepair"];
const data = XLSX.utils.sheet_to_json(sheet);
if (data.length > 0) {
    console.log("SQL SAMPLE:", data[0]['CODE SQL']);
}
