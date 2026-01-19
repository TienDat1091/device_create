const XLSX = require('xlsx');
const fs = require('fs');

const ROUTE_ALL_PATH = "C:\\Users\\MyRogStrixPC\\Desktop\\TaoAll\\ROUTE_ALL.xls";

function checkSpecificRoute() {
    if (!fs.existsSync(ROUTE_ALL_PATH)) return;

    const wb = XLSX.readFile(ROUTE_ALL_PATH);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const routeName = "M_ARIAS_AB_REP";
    const routeRows = data.filter(r => r.ROUTE === routeName);

    console.log(`Rows for ${routeName}:`, routeRows.length);
    console.log(JSON.stringify(routeRows, null, 2));
}

checkSpecificRoute();
