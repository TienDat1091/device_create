const XLSX = require('xlsx');
const fs = require('fs');

const files = ['ROUTE_ALL.xls', 'VNFB.xls', 'Route2.xls', 'uploads/Route2.xls', 'Ho tro tao all - Copy - Copy.xlsx'];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    console.log(`\n--- Analyzing ${f} ---`);
    const wb = XLSX.readFile(f);
    wb.SheetNames.forEach(sn => {
        const d = XLSX.utils.sheet_to_json(wb.Sheets[sn]);

        // Check Rollback Learning (Source TS0 -> Target ???)
        d.filter(r => r.RTYPE2 === 'B' && r.OSTEP && r.OSTEP.includes('TS0')).forEach(r => {
            console.log(`[ROLLBACK RULE] FOUND TS0 SOURCE! MSTEP: ${r.MSTEP} | OSTEP: ${r.OSTEP}`);
        });

        // Check Repair Learning (Group TS0 -> Repair ???)
        d.filter(r => r.RTYPE2 === 'R' && r.GRP && r.GRP.includes('TS0')).forEach(r => {
            console.log(`[REPAIR] FOUND TS0 GRP! STEP: ${r.STEP} (Usually implies TS0 repairs to this STEP)`);
        });

        // Check Sequence (TS0 -> Next GRP)
        d.forEach((r, i) => {
            if (r.GRP === 'TS0' && d[i + 1]) {
                console.log(`[SEQUENCE] TS0 is followed by GRP: ${d[i + 1].GRP}`);
            }
        });
    });
});
