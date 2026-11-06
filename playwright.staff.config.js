import mobile from './playwright.mobile.config.js'
import { defineConfig } from '@playwright/test'

export default defineConfig({ ...mobile, testMatch: /staff-reservations-notifications\.spec\.js/ })
