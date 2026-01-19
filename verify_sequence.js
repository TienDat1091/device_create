const XLSX = require('xlsx');
const fs = require('fs');

const ROUTE_ALL_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\ROUTE_ALL.xls";

function verifySequence() {
    if (!fs.existsSync(ROUTE_ALL_PATH)) return;

    const wb = XLSX.readFile(ROUTE_ALL_PATH);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    let tsaToTsb = 0;
    let tsbToTsa = 0;

    for (let i = 0; i < data.length - 1; i++) {
        const current = data[i];
        const next = data[i + 1];

        if (current.ROUTE !== next.ROUTE) continue;

        if (current.GRP === 'TSA' && next.GRP === 'TSB') tsaToTsb++;
        if (current.GRP === 'TSB' && next.GRP === 'TSA') tsbToTsa++;
    }

    console.log(`TSA -> TSB count: ${tsaToTsb}`);
    console.log(`TSB -> TSA count: ${tsbToTsa}`);
}

verifySequence();
