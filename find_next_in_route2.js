const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);
wb.SheetNames.forEach(sn => {
    const sheet = wb.Sheets[sn];
    const data = XLSX.utils.sheet_to_json(sheet);
    data.forEach((r, i) => {
        if (r.GRP === 'TVI' || r.GRP === 'TBE' || r.GRP === 'TVK') {
            console.log(`[${sn} Row ${i}] GRP: ${r.GRP} | STEP: ${r.STEP} | NEXT GRP: ${data[i + 1] ? data[i + 1].GRP : 'END'}`);
        }
    });
});
