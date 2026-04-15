const fs = require('fs');

const run = () => {
    let content = fs.readFileSync('src/pages/Inventario.tsx', 'utf8');

    // Insert Import
    if (!content.includes('useDialog')) {
        content = content.replace("import React,", "import React, { useState, useEffect, useMemo } from 'react'\nimport { useDialog } from '../context/DialogContext'");
    }

    // Inject hook inside Inventario component
    if (!content.includes('const { showAlert, showConfirm } = useDialog()')) {
        content = content.replace("export default function Inventario() {", "export default function Inventario() {\n    const { showAlert, showConfirm } = useDialog();");
    }

    // Export to CSV isn't async right now. Let's make it async
    content = content.replace("const exportarCSV = () => {", "const exportarCSV = async () => {");
    
    // Convert alerts
    // We use regex to match alert('...') or alert(...)
    content = content.replace(/alert\((['"`].+?['"`])\)/g, "await showAlert('Aviso', $1)");
    content = content.replace(/alert\((.+?)\)/g, "await showAlert('Aviso', $1)");
    
    // Fix multiple await await
    content = content.replace(/await await/g, "await");

    // Convert confirm
    content = content.replace(/!confirm\((.+?)\)/g, "!(await showConfirm($1))");
    
    // return alert(...) -> await showAlert(...); return;
    content = content.replace(/return await showAlert('Aviso', (.+?));/g, "{ await showAlert('Aviso', $1); return; }");

    fs.writeFileSync('src/pages/Inventario.tsx', content);
    console.log("Inventario.tsx refactorizado.");
}

run();
