import base from './playwright.config.js'
import { devices, defineConfig } from '@playwright/test'

export default defineConfig({
  ...base,
  testMatch: /admin-mobile-workspace\.spec\.js/,
  projects: [
    { name: 'android-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  ],
})
