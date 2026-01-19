const XLSX = require('xlsx');
const fs = require('fs');
const ROUTE_ALL_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\ROUTE_ALL.xls";

function checkRTypes() {
    if (!fs.existsSync(ROUTE_ALL_PATH)) return;
    const wb = XLSX.readFile(ROUTE_ALL_PATH);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const rtype2Values = new Set();
    const rtype3Values = new Set();

    data.forEach(r => {
        if (r.RTYPE2) rtype2Values.add(r.RTYPE2);
        if (r.RTYPE3) rtype3Values.add(r.RTYPE3);
    });

    console.log("Unique RTYPE2:", Array.from(rtype2Values).join(", "));
    console.log("Unique RTYPE3:", Array.from(rtype3Values).join(", "));

    // Search for rows where GRP is TSA or TSB
    const samples = data.filter(r => r.GRP === 'TSA' || r.GRP === 'TSB').slice(0, 10);
    console.log("Sample rows with TSA/TSB:", JSON.stringify(samples, null, 2));
}

checkRTypes();
