// Customises the generated Android project (run after `npx cap add android`).
// - Spruce icons and splash screen
// - Camera permission (check-in photos) and location permission ("near me")
// - Version number that increases with every build, so new APKs install over old ones
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const res = 'android/app/src/main/res'
if (!existsSync(res)) throw new Error('Run `npx cap add android` first')

// Remove Capacitor's default splash images so ours (drawable/splash.png) is used everywhere
for (const dir of readdirSync(res)) {
  if (/^drawable-(port|land)-/.test(dir)) rmSync(join(res, dir), { recursive: true, force: true })
}
cpSync('android-assets/res', res, { recursive: true })

const manifestPath = 'android/app/src/main/AndroidManifest.xml'
let manifest = readFileSync(manifestPath, 'utf8')
const extras = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
].filter((line) => !manifest.includes(line))
manifest = manifest.replace('</manifest>', `    ${extras.join('\n    ')}\n</manifest>`)
writeFileSync(manifestPath, manifest)

const gradlePath = 'android/app/build.gradle'
const build = Number(process.env.GITHUB_RUN_NUMBER || 1)
let gradle = readFileSync(gradlePath, 'utf8')
gradle = gradle.replace(/versionCode \d+/, `versionCode ${build}`).replace(/versionName "[^"]*"/, `versionName "1.0.${build}"`)
writeFileSync(gradlePath, gradle)

console.log(`Android project ready: icons, permissions, version 1.0.${build}`)
