const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);

wb.SheetNames.forEach(sn => {
    const sheet = wb.Sheets[sn];
    const data = XLSX.utils.sheet_to_json(sheet);
    const rb = data.filter(r => r.RTYPE2 === 'R' || r.RTYPE2 === 'B');
    if (rb.length > 0) {
        console.log(`\n--- Sheet: ${sn} has ${rb.length} R/B rows ---`);
        rb.forEach(r => {
            console.log(`RIDX: ${r.RIDX} | RTYPE2: ${r.RTYPE2} | STEP: ${r.STEP} | MSTEP: ${r.MSTEP} | OSTEP: ${r.OSTEP} | GRP: ${r.GRP}`);
        });
    }
});
