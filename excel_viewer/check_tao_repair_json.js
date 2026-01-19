const XLSX = require('xlsx');
const FILE_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\Ho tro tao all - Copy - Copy.xlsx";
const workbook = XLSX.readFile(FILE_PATH);
const sheet = workbook.Sheets["TaoRepair"];
if (sheet) {
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
}
