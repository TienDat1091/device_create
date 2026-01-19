const XLSX = require('xlsx');
const fs = require('fs');
const ROUTE_ALL_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\ROUTE_ALL.xls";

function checkAI1() {
    if (!fs.existsSync(ROUTE_ALL_PATH)) return;
    const wb = XLSX.readFile(ROUTE_ALL_PATH);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const matches = data.filter(r => r.GRP === 'AI1' || r.GRP === 'AAI1' || r.GRP === 'AIA');
    console.log("Matches for AI1/AAI1/AIA:", JSON.stringify(matches.slice(0, 10), null, 2));
}

checkAI1();
