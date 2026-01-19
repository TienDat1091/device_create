const XLSX = require('xlsx');
const fs = require('fs');

const ROUTE_ALL_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\ROUTE_ALL.xls";

function analyzePairs() {
    if (!fs.existsSync(ROUTE_ALL_PATH)) {
        console.log("File not found");
        return;
    }

    const wb = XLSX.readFile(ROUTE_ALL_PATH);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const pairCounts = {};

    for (let i = 0; i < data.length - 1; i++) {
        const current = data[i];
        const next = data[i + 1];

        // Ensure same route
        if (current.ROUTE !== next.ROUTE) continue;

        const cursGrp = current.GRP;
        const nextGrp = next.GRP;

        if (!pairCounts[cursGrp]) pairCounts[cursGrp] = {};
        if (!pairCounts[cursGrp][nextGrp]) pairCounts[cursGrp][nextGrp] = 0;

        pairCounts[cursGrp][nextGrp]++;
    }

    console.log("Analysis for TSA:", JSON.stringify(pairCounts['TSA'], null, 2));
}

analyzePairs();
