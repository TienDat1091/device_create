const XLSX = require('xlsx');
const FILE_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\Ho tro tao all - Copy - Copy.xlsx";
const workbook = XLSX.readFile(FILE_PATH);
const sheetName = "TaoRepair";
if (workbook.Sheets[sheetName]) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Read raw rows
    console.log("Headers:", data[0]);
    console.log("Row 1:", data[1]);
    console.log("Row 2:", data[2]);
    console.log("Row 3:", data[3]);
} else {
    console.log("Sheet 'TaoRepair' still not found. Sheets:", workbook.SheetNames);
}
