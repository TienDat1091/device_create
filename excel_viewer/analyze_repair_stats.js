const XLSX = require('xlsx');
const fs = require('fs');
const ROUTE_ALL_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\ROUTE_ALL.xls";

function analyzeRepairPairs() {
    if (!fs.existsSync(ROUTE_ALL_PATH)) return;
    const wb = XLSX.readFile(ROUTE_ALL_PATH);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    // key: sourceGRP (from MSTEP), val: { targetGRP: count }
    const repairPairs = {};

    data.forEach(r => {
        if (r.RTYPE2 === 'R' && r.MSTEP && r.MSTEP !== '0') {
            // MSTEP usually looks like 'MSPVTTSA' or 'XBSZDD30'.
            // I need to extract the GRP part from MSTEP. 
            // Usually the last 4 chars?
            const mStep = r.MSTEP.toString().trim();
            const sourceGrpCandidate = mStep.slice(-3); // Trial: last 3 chars like TSA
            const targetGrp = r.GRP ? r.GRP.toString().trim() : "NULL";

            if (!repairPairs[sourceGrpCandidate]) repairPairs[sourceGrpCandidate] = {};
            if (!repairPairs[sourceGrpCandidate][targetGrp]) repairPairs[sourceGrpCandidate][targetGrp] = 0;
            repairPairs[sourceGrpCandidate][targetGrp]++;
        }
    });

    console.log("Repair Statistics for TSA (last 3 of MSTEP):", JSON.stringify(repairPairs['TSA'], null, 2));
    console.log("Repair Statistics for DD3 (last 3 of MSTEP):", JSON.stringify(repairPairs['DD3'], null, 2));
}

analyzeRepairPairs();
