#!/usr/bin/env node
/**
 * Страховка для локальных сборок: добавляет разрешения микрофона в
 * android/app/src/main/AndroidManifest.xml, если их там нет.
 *
 * В CI обычно достаточно плагина slink-native (его манифест мержится Gradle-ом),
 * но скрипт не помешает, если android-проект сгенерировали без плагина или
 * манифест приложения был перезаписан `npx cap add android`.
 *
 * Запуск: npm run android:permissions (или автоматически в npm run cap:sync)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MANIFEST = 'android/app/src/main/AndroidManifest.xml';
const PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
];
const MICROPHONE_FEATURE =
  '<uses-feature android:name="android.hardware.microphone" android:required="false" />';

if (!existsSync(MANIFEST)) {
  console.log('[slink] android-проект не найден — пропускаем (npx cap add android не выполнялся)');
  process.exit(0);
}

let manifest = readFileSync(MANIFEST, 'utf8');
const additions = [];

for (const permission of PERMISSIONS) {
  if (!manifest.includes(`android:name="${permission}"`)) {
    additions.push(`    <uses-permission android:name="${permission}" />`);
  }
}

if (!manifest.includes('android.hardware.microphone')) {
  additions.push(`    <!-- Микрофон не обязателен для установки приложения. -->`);
  additions.push(`    ${MICROPHONE_FEATURE}`);
}

if (additions.length === 0) {
  console.log('[slink] разрешения микрофона уже в манифесте');
  process.exit(0);
}

manifest = manifest.replace(/<\/manifest>/, `${additions.join('\n')}\n</manifest>`);
writeFileSync(MANIFEST, manifest, 'utf8');
console.log(`[slink] манифест обновлён: добавлено ${additions.length} строк(и)`);
