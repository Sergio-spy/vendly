#!/usr/bin/env node
// Genera el hash de una password para pegar en api/_lib/comerciales.js
// Uso: node scripts/hash-password.js "tu-password"

import { scryptSync, randomBytes } from 'node:crypto';

const plain = process.argv[2];
if (!plain) {
  console.error('Uso: node scripts/hash-password.js "tu-password"');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(plain, salt, 64).toString('hex');
console.log(`${salt}:${hash}`);
