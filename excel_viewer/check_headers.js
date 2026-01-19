const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Adjust path as needed based on previous find result
const filePath = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\Ho tro tao all - Copy - Copy.xlsx";

if (fs.existsSync(filePath)) {
    const workbook = XLSX.readFile(filePath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]; // Assuming data is in first sheet or ROUTE_STEP
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    console.log("Headers:", jsonData[0]);
    console.log("First row data:", jsonData[1]);
} else {
    console.log("File not found at:", filePath);
}
