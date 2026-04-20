#!/usr/bin/env node
import { runBuild } from './orchestrator.js';

async function main() {
  try {
    await runBuild();
    process.exit(0);
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

main();
