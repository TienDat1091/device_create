const XLSX = require('xlsx');
const fs = require('fs');

const ROUTE_ALL_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\ROUTE_ALL.xls";

function analyzeNeighborsDetailed() {
    if (!fs.existsSync(ROUTE_ALL_PATH)) return;

    const wb = XLSX.readFile(ROUTE_ALL_PATH);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log("Searching for TSA contexts...");

    let count = 0;
    for (let i = 0; i < data.length; i++) {
        const current = data[i];
        if (current.GRP === 'TSA') {
            const prev = i > 0 ? data[i - 1].GRP : "START";
            const pPrev = i > 1 ? data[i - 2].GRP : "START";
            const next = i < data.length - 1 ? data[i + 1].GRP : "END";

            console.log(`TSA found: Prev=${prev}, Next=${next}, Route=${current.ROUTE}`);
            count++;
            if (count > 10) break; // Limit output
        }
    }
}

analyzeNeighborsDetailed();
