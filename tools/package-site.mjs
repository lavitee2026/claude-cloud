#!/usr/bin/env node
// 打包可直接部署的网站：不写死域名，附 set-domain.py 与部署说明，输出 dist/医美选择网站-日期.zip
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const today = new Date().toISOString().slice(0, 10);
const STAGE = path.join(ROOT, 'build/package');
const SITE_DIR = path.join(STAGE, '医美选择网站');
fs.rmSync(STAGE, { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });
execFileSync('node', [path.join(ROOT, 'tools/build-site.mjs')], { env: { ...process.env, SITE_BASE: '', SITE_OUT: 'build/package/医美选择网站', SKIP_PREVIEW: '1' }, stdio: 'inherit' });
fs.cpSync(path.join(ROOT, 'site/og'), path.join(SITE_DIR, 'og'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'tools/package/set-domain.py'), path.join(SITE_DIR, 'set-domain.py'));
fs.copyFileSync(path.join(ROOT, 'tools/package/部署说明.txt'), path.join(STAGE, '部署说明.txt'));
fs.rmSync(path.join(SITE_DIR, '.nojekyll'), { force: true });
const zip = path.join(ROOT, 'dist', `医美选择网站-${today}.zip`);
fs.mkdirSync(path.dirname(zip), { recursive: true });
fs.rmSync(zip, { force: true });
execFileSync('python3', ['-c', `import shutil,sys; shutil.make_archive(sys.argv[1], 'zip', sys.argv[2])`, zip.replace(/\.zip$/, ''), STAGE]);
console.log('package:', path.relative(ROOT, zip), (fs.statSync(zip).size / 1024 / 1024).toFixed(1), 'MB');
