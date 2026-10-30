import { Capacitor } from '@capacitor/core'

/** True inside the installed Android app (Capacitor), false in a browser. */
export const isNativeApp = Capacitor.isNativePlatform()

/** Public web address, used for email links (the Android app runs on an internal address). */
export const WEB_URL = 'https://pixelpearl.site/spruce/'

/** Always downloads the newest Android build from the repo's releases. */
export const APK_URL = 'https://github.com/Pearl-Omphile/spruce/releases/latest/download/spruce.apk'

/** Which phone the visitor is on, so we only offer downloads that work for them. */
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
export const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)
export const isAndroid = /Android/i.test(ua)
