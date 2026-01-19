const XLSX = require('xlsx');
const FILE_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\ROUTE_ALL.xls";
if (require('fs').existsSync(FILE_PATH)) {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
    console.log("Headers of ROUTE_ALL:", headers);
} else {
    console.log("ROUTE_ALL.xls not found");
}
