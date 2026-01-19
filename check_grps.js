const XLSX = require('xlsx');
const fs = require('fs');
const ROUTE_ALL_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\ROUTE_ALL.xls";

function checkUniqueGrps() {
    if (!fs.existsSync(ROUTE_ALL_PATH)) return;
    const wb = XLSX.readFile(ROUTE_ALL_PATH);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const grps = new Set();
    data.forEach(r => {
        if (r.GRP) grps.add(r.GRP.toString().trim());
    });

    console.log("Unique GRPs (first 100):", Array.from(grps).slice(0, 100).join(", "));
    console.log("TSA exists?", grps.has("TSA"));
    console.log("TSB exists?", grps.has("TSB"));
}

checkUniqueGrps();
