const XLSX = require('xlsx');
const file = 'c:/Users/MyRogStrixPC/Desktop/TaoAll/uploads/Route2.xls';
const wb = XLSX.readFile(file);

wb.SheetNames.forEach(sn => {
    console.log(`\n--- Sheet: ${sn} ---`);
    const sheet = wb.Sheets[sn];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    data.forEach((row, i) => {
        const rowStr = row.join(' ');
        if (rowStr.includes('TVJ') || rowStr.includes('TBE') || rowStr.includes('TVI')) {
            console.log(`Row ${i}:`, row.join(' | '));
        }
    });
});
