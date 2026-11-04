import { test, expect } from '@playwright/test'
test('personal goal and privacy choices are saved explicitly',async({page})=>{
 let saved
 await page.route('**/*.supabase.co/**',route=>{
   const req=route.request()
   if(req.url().includes('/athlete_preferences')) {
     if(req.method()==='POST'){saved=req.postDataJSON();return route.fulfill({status:201,json:saved})}
     return route.fulfill({json:{weekly_goal:null,community_alias:'',share_attendance:false,share_records:false,share_birthday:false}})
   }
   return route.fulfill({status:403,json:{message:'Mock: blocked'}})
 })
 await page.goto('/tests/fixtures/stage2-clarity.html')
 await expect(page.getByRole('button',{name:'Guardar preferencias',exact:true})).toBeEnabled()
 await expect(page.getByLabel('Aparecer en el ranking de asistencia')).not.toBeChecked()
 await page.getByLabel('Meta de sesiones por semana').fill('3')
 await page.getByLabel('Nombre o alias en Comunidad').fill('Mi alias')
 await page.getByLabel('Aparecer en el ranking de asistencia').check()
 await page.getByRole('button',{name:'Guardar preferencias',exact:true}).click()
 await expect(page.getByText('Preferencias guardadas.',{exact:true})).toBeVisible()
 await expect(page.locator('#goal')).toHaveText('3')
 expect(saved.weekly_goal).toBe(3);expect(saved.share_records).toBe(false);expect(saved.community_alias).toBe('Mi alias')
 await page.getByLabel('Aparecer en el ranking de asistencia').uncheck()
 await page.getByRole('button',{name:'Guardar preferencias',exact:true}).click()
 await expect.poll(()=>saved.share_attendance).toBe(false)
})

test('guest states and member feed use accurate labels and durations',async({page})=>{
 await page.route('**/*.supabase.co/**',route=>{
   if(route.request().url().includes('/athlete_preferences'))return route.fulfill({json:null})
   if(route.request().url().includes('/get_member_community_feed')) return route.fulfill({json:{news:[],birthdays:[],ranking:[{profile_id:'a',full_name:'Alias',attendance_count:2}],records:[{id:'pr',full_name:'Alias',movement:'Fran',unit:'tiempo',value:780,record_date:'2026-11-01',created_at:'2026-11-02T12:00:00Z'}]}})
   return route.fulfill({status:403,json:{message:'Mock: blocked'}})
 })
 await page.goto('/tests/fixtures/stage2-clarity.html')
 await page.getByRole('button',{name:'guest',exact:true}).click()
 await expect(page.getByText('Comunidad de miembros',{exact:true})).toBeVisible()
 await expect(page.getByRole('tab',{name:'Ranking'})).toHaveCount(0)
 await page.getByRole('button',{name:'reservations',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Inicia sesión para consultar disponibilidad y reservar',exact:true})).toBeVisible()
 await expect(page.getByText('No tienes permiso para ver o modificar esta información.',{exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'member',exact:true}).click()
 await expect(page.getByText('Fran · 13:00',{exact:true})).toBeVisible()
 await expect(page.getByText('Marca registrada',{exact:true})).toBeVisible()
 await page.getByRole('tab',{name:'Ranking',exact:true}).click()
 await expect(page.getByText('asistencias',{exact:true})).toBeVisible()
 await expect(page.getByText('2',{exact:true})).toBeVisible()
})
