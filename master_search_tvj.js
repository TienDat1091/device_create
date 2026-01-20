const XLSX = require('xlsx');
const fs = require('fs');

const files = [
    'ROUTE_ALL.xls',
    'VNFB.xls',
    'Route2.xls',
    'uploads/Route2.xls',
    'Ho tro tao all - Copy - Copy.xlsx'
];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    console.log(`\n--- Searching ${f} ---`);
    const wb = XLSX.readFile(f);
    wb.SheetNames.forEach(sn => {
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1 });
        data.forEach((row, i) => {
            if (row.join(' ').includes('TVJ')) {
                console.log(`[${sn} Row ${i}]`, row.join(' | '));
            }
        });
    });
});
