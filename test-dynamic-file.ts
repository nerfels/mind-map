
// Regular imports
import fs from 'fs';
import { readFile } from 'fs/promises';
const path = require('path');

// Dynamic imports
async function loadModule() {
  const module1 = await import('./module1.js');
  const module2 = await import(`./modules/${name}.js`);
  const module3 = await import(moduleName);
}

// Require calls
function loadWithRequire() {
  const config = require('./config.json');
  const template = require(`./templates/${type}.js`);
  const dynamic = require(getModuleName());
}

export default loadModule;
