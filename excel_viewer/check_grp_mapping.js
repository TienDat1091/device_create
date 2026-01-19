const XLSX = require('xlsx');
const fs = require('fs');
const ROUTE_ALL_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\ROUTE_ALL.xls";

function checkGrpToSection() {
    if (!fs.existsSync(ROUTE_ALL_PATH)) return;
    const wb = XLSX.readFile(ROUTE_ALL_PATH);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const mapped = {};
    data.forEach(r => {
        if (r.GRP && r.SECTION) {
            mapped[r.GRP] = r.SECTION;
        }
    });

    console.log("TSA Section:", mapped['TSA']);
    console.log("TSB Section:", mapped['TSB']);
    console.log("AI1 Section:", mapped['AI1']);
    console.log("AIA Section:", mapped['AIA']);
    console.log("WWINH Section:", mapped['WWINH'] || mapped['WINH']);
}

checkGrpToSection();
