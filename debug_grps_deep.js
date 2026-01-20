const XLSX = require('xlsx');
const path = require('path');

function analyze(file) {
    console.log(`\n--- Analyzing ${file} ---`);
    if (!require('fs').existsSync(file)) {
        console.log("File not found.");
        return;
    }
    const wb = XLSX.readFile(file);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    console.log(`Total rows: ${data.length}`);

    const tvPairings = data.filter(r =>
        (r.GRP && r.GRP.toString().includes('TV')) ||
        (r.MSTEP && r.MSTEP.toString().includes('TV')) ||
        (r.OSTEP && r.OSTEP.toString().includes('TV'))
    );

    console.log(`Rows containing 'TV': ${tvPairings.length}`);
    tvPairings.slice(0, 30).forEach(r => {
        console.log(`RTYPE2: ${r.RTYPE2} | GRP: ${r.GRP} | STEP: ${r.STEP} | MSTEP: ${r.MSTEP} | OSTEP: ${r.OSTEP} | SECTION: ${r.SECTION}`);
    });
}

analyze('ROUTE_ALL.xls');
analyze('VNFB.xls');
analyze('Ho tro tao all - Copy - Copy.xlsx');
