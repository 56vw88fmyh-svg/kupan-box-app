import { test, expect } from '@playwright/test'
test('admin feedback stays stable across refresh and StrictMode remount', async ({page}) => {
  await page.goto('/tests/fixtures/admin-feedback.html')
  await expect(page.locator('#loads')).toHaveText('2')
  await expect(page.getByText('Actualizado',{exact:true})).toBeVisible()
  await page.waitForTimeout(800)
  await expect(page.locator('#loads')).toHaveText('2')
  await page.getByRole('button',{name:'Actualizar',exact:true}).click()
  await expect(page.locator('#loads')).toHaveText('3')
  await page.waitForTimeout(800)
  await expect(page.locator('#loads')).toHaveText('3')
})

test('WOD editor retains variants and athlete sees each prescription', async ({page}) => {
  await page.route('**/rest/v1/rpc/get_public_todays_wod_v2', route => route.fulfill({json:{id:'10000000-0000-4000-8000-000000000001',date:'2026-11-04',title:'Test',workout:'Base',training_details:{scaling:['Iniciado','Rookie','Scaled','RX'].map(level=>({level,items:[`Prescripción ${level}`]}))}}}))
  await page.route('**/rest/v1/rpc/get_public_box_news',route=>route.fulfill({json:[]}))
  await page.goto('/tests/fixtures/training-levels.html')
  await page.getByLabel('WOD Scaled',{exact:true}).fill('10 reps con 30 kg')
  await page.getByLabel('WOD RX',{exact:true}).fill('10 reps con 50 kg')
  await expect(page.locator('#draft')).toContainText('10 reps con 30 kg')
  await expect(page.locator('#draft')).toContainText('10 reps con 50 kg')
  await page.getByRole('button',{name:'Ver atleta',exact:true}).click()
  for (const level of ['Iniciado','Rookie','Scaled','RX']) {
    await page.getByRole('tab',{name:level,exact:true}).click()
    await expect(page.getByText(`Prescripción ${level}`,{exact:true})).toBeVisible()
  }
})
