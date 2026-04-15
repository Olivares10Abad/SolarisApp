const fs = require('fs');
const files = [
    'src/pages/Perfil.tsx',
    'src/pages/Cotizaciones.tsx',
    'src/pages/Proyectos.tsx',
    'src/pages/Home.tsx',
    'src/pages/Usuarios.tsx',
    'src/pages/Revisión.tsx',
    'src/pages/Viabilidad.tsx',
    'src/pages/MetricasSLA.tsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    // Skip if already processed
    if (content.includes('const { showAlert, showConfirm } = useDialog()')) {
        console.log(`Skipped ${file}`);
        continue;
    }

    // Insert Import
    if (!content.includes('useDialog')) {
        content = content.replace("import React,", "import React, { useState, useEffect } from 'react'\nimport { useDialog } from '../context/DialogContext'");
        if (!content.includes('useDialog')) {
            content = "import { useDialog } from '../context/DialogContext'\n" + content;
        }
    }

    // Inject hook
    const functionMatch = content.match(/export default function ([a-zA-Z0-9_]+)\(\) \{/);
    const constMatch = content.match(/const ([a-zA-Z0-9_]+) = \(\) => \{/);
    
    if (functionMatch) {
        content = content.replace(functionMatch[0], `${functionMatch[0]}\n    const { showAlert, showConfirm } = useDialog();`);
    } else if (constMatch && file.includes('Proyectos')) { // For ProyectosList or something
        content = content.replace(constMatch[0], `${constMatch[0]}\n    const { showAlert, showConfirm } = useDialog();`);
    } else {
        content = content.replace(/export default function ([a-zA-Z0-9_]+)\(.*?\) \{/, (match) => `${match}\n    const { showAlert, showConfirm } = useDialog();`);
    }

    // Convert confirm
    content = content.replace(/!confirm\((.+?)\)/g, "!(await showConfirm($1))");
    content = content.replace(/confirm\((.+?)\)/g, "await showConfirm($1)");
    
    // Convert alert inside return
    content = content.replace(/return alert\((.+?)\);/g, "{ await showAlert('Aviso', $1); return; }");
    content = content.replace(/return alert\((.+?)\)/g, "{ await showAlert('Aviso', $1); return; }");

    // Convert generic alerts
    content = content.replace(/alert\((['"`].+?['"`])\)/g, "await showAlert('Aviso', $1)");
    content = content.replace(/alert\((.+?)\)/g, "await showAlert('Aviso', $1)");
    
    content = content.replace(/await await/g, "await");

    fs.writeFileSync(file, content);
    console.log(`${file} refactorizado.`);
}
