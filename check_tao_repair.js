const XLSX = require('xlsx');
const FILE_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\Ho tro tao all - Copy - Copy.xlsx";
const workbook = XLSX.readFile(FILE_PATH);
const sheetName = "Tao Repair"; // Checking this specific sheet
if (workbook.Sheets[sheetName]) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log("Headers:", data[0]);
    console.log("Sample Data (Row 1):", data[1]);
    console.log("Sample Data (Row 2):", data[2]);
} else {
    console.log("Sheet 'Tao Repair' not found. Available:", workbook.SheetNames);
}
