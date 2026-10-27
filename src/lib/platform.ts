import { Capacitor } from '@capacitor/core'

/** True inside the installed Android app (Capacitor), false in a browser. */
export const isNativeApp = Capacitor.isNativePlatform()

/** Public web address, used for email links (the Android app runs on an internal address). */
export const WEB_URL = 'https://pearl-omphile.github.io/spruce/'

/** Always downloads the newest Android build from the repo's releases. */
export const APK_URL = 'https://github.com/Pearl-Omphile/spruce/releases/latest/download/spruce.apk'
