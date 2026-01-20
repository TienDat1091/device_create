const XLSX = require('xlsx');
const fs = require('fs');

const files = ['ROUTE_ALL.xls', 'VNFB.xls', 'Route2.xls', 'uploads/Route2.xls'];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    const wb = XLSX.readFile(f);
    wb.SheetNames.forEach(sn => {
        const d = XLSX.utils.sheet_to_json(wb.Sheets[sn]);
        d.forEach((r, i) => {
            if (r.GRP === 'TVI' && d[i + 1]) {
                console.log(`[${f}][${sn}] TVI is followed by ${d[i + 1].GRP}`);
            }
        });
    });
});
