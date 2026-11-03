#!/usr/bin/env node
/**
 * Страховка для локальных сборок: добавляет разрешения микрофона в
 * android/app/src/main/AndroidManifest.xml, если их там нет.
 *
 * В CI обычно достаточно плагина slink-native (его манифест мержится Gradle-ом),
 * но скрипт не помешает, если android-проект сгенерировали без плагина.
 *
 * Запуск: npm run android:permissions
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MANIFEST = 'android/app/src/main/AndroidManifest.xml';
const PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
];

if (!existsSync(MANIFEST)) {
  console.log('[slink] android-проект не найден — пропускаем (npx cap add android не выполнялся)');
  process.exit(0);
}

let manifest = readFileSync(MANIFEST, 'utf8');
const missing = PERMISSIONS.filter((permission) => !manifest.includes(`android:name="${permission}"`));

if (missing.length === 0) {
  console.log('[slink] разрешения микрофона уже в манифесте');
  process.exit(0);
}

const block = missing
  .map((permission) => `    <uses-permission android:name="${permission}" />`)
  .join('\n');

manifest = manifest.replace(/<\/manifest>/, `${block}\n</manifest>`);
writeFileSync(MANIFEST, manifest, 'utf8');
console.log(`[slink] добавлены разрешения: ${missing.join(', ')}`);
