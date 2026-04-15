const fs = require('fs');
const path = require('path');

const lines = fs.readFileSync('supabase_types_tmp.ts', 'utf8').split('\n');
let inTables = false;
let currentTable = null;
let inRow = false;
const dbSchema = {};

for (const line of lines) {
  if (line.includes('public: {')) inTables = true;
  if (!inTables) continue;
  if (line.includes('Tables: {')) continue;
  
  const mTable = line.match(/^      ([a-zA-Z0-9_]+): \{/);
  if (mTable) {
    currentTable = mTable[1];
    dbSchema[currentTable] = [];
    continue;
  }
  
  if (currentTable && line.includes('Row: {')) {
    inRow = true;
    continue;
  }
  
  if (inRow && line.includes('}')) {
    inRow = false;
    currentTable = null;
    continue;
  }
  
  if (inRow) {
    const colName = line.split(':')[0].trim().replace(/\?/g, '');
    if (colName && !colName.includes(' ') && !colName.includes('[')) {
       dbSchema[currentTable].push(colName.replace(/"/g, ''));
    }
  }
}

function readAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'supabase') {
        readAllFiles(path.join(dir, file), fileList);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
         if (file !== 'supabase_types_tmp.ts' && file !== 'database.types.ts' && file !== 'find_unused_columns.cjs') {
            fileList.push(path.join(dir, file));
         }
      }
    }
  }
  return fileList;
}

const srcFiles = readAllFiles(path.join(__dirname, 'src'));
const allText = srcFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const unusedByTable = {};

for (const [table, columns] of Object.entries(dbSchema)) {
  for (const col of columns) {
    const regex = new RegExp(`\\b${col}\\b`);
    if (!regex.test(allText)) {
      if (!unusedByTable[table]) unusedByTable[table] = [];
      unusedByTable[table].push(col);
    }
  }
}

console.log(JSON.stringify(unusedByTable, null, 2));
