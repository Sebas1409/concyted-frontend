const fs = require('fs');
const path = require('path');

// Generar timestamp actual
const timestamp = Date.now();
const version = {
    version: '1.0.0',
    timestamp: timestamp
};

// Escribir el archivo version.json
const versionFilePath = path.join(__dirname, 'src', 'version.json');
fs.writeFileSync(versionFilePath, JSON.stringify(version, null, 2));

console.log(`Version file generated with timestamp: ${timestamp}`);
