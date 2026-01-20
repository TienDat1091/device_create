const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);

wb.SheetNames.forEach(sn => {
    const sheet = wb.Sheets[sn];
    const data = XLSX.utils.sheet_to_json(sheet);
    data.forEach(r => {
        const rt2 = (r.RTYPE2 || "").toString().trim().toUpperCase();
        if (rt2 === 'R' || rt2 === 'B') {
            console.log(`[${sn}] RIDX: ${r.RIDX} | RT2: ${rt2} | STEP: ${r.STEP} | MSTEP: ${r.MSTEP} | OSTEP: ${r.OSTEP} | GRP: ${r.GRP}`);
        }
    });
});
