const XLSX = require('xlsx');
const fs = require('fs');

function checkFile(path) {
    if (fs.existsSync(path)) {
        try {
            const wb = XLSX.readFile(path);
            console.log(`Sheets in ${path}:`, wb.SheetNames);
        } catch (e) {
            console.log(`Error reading ${path}:`, e.message);
        }
    }
}

checkFile("C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\ROUTE_ALL.xls");
checkFile("C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\route.xlsx");
