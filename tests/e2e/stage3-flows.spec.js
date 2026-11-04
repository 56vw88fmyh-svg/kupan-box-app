/* global EventTarget, Event, sessionStorage, btoa */
import {test,expect} from '@playwright/test'
test.use({serviceWorkers:'block'})
const id='00000000-0000-4000-8000-000000000001'
async function mockData(page){
 await page.route('**/*.supabase.co/**',route=>{
  const url=route.request().url()
  if(url.includes('/get_my_profile'))return route.fulfill({json:{id,full_name:'Atleta de prueba',email:'test@example.invalid',role:'admin',status:'active',level:'RX',birth_date:'1990-01-01'}})
  if(url.includes('/athlete_preferences'))return route.fulfill({json:{weekly_goal:3,community_alias:'Alias',share_attendance:false,share_records:false,share_birthday:false}})
  if(url.includes('/get_active_membership'))return route.fulfill({json:null})
  if(url.includes('/get_my_reservations')||url.includes('/rest/v1/reservations')||url.includes('/personal_records'))return route.fulfill({json:[]})
  return route.fulfill({status:403,json:{message:'Mock: blocked'}})
 })
}
async function fakeWorker(page){
 await page.addInitScript(()=>{
  const events=new EventTarget()
  const worker={postMessage(message,ports){if(message.type==='GET_VERSION')ports[0].postMessage({version:'test-2'});if(message.type==='SKIP_WAITING')events.dispatchEvent(new Event('controllerchange'))},addEventListener(){},removeEventListener(){}}
  Object.defineProperty(navigator,'serviceWorker',{value:{controller:{},register:async()=>({waiting:worker,update:async()=>{},addEventListener(){},removeEventListener(){}}),addEventListener:(...args)=>events.addEventListener(...args),removeEventListener:(...args)=>events.removeEventListener(...args)}})
  window.testControllerChange=()=>events.dispatchEvent(new Event('controllerchange'))
  sessionStorage.setItem('test-boots',String(Number(sessionStorage.getItem('test-boots')??0)+1))
 })
}
test('Profile sections, management mode, keyboard tabs and dialog focus',async({page})=>{
 await mockData(page)
 await page.goto('/tests/fixtures/stage3-flows.html')
 await page.getByRole('tab',{name:'Uno',exact:true}).focus()
 await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Dos',exact:true})).toBeFocused()
 await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'Tres',exact:true})).toBeFocused()
 await page.getByRole('button',{name:'Abrir diálogo',exact:true}).click()
 const input=page.getByLabel('Texto del diálogo')
 await input.fill('Cambios');await input.press('End');await input.pressSequentially(' conservados')
 await expect(input).toHaveValue('Cambios conservados');await expect(input).toBeFocused()
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Abrir diálogo',exact:true})).toBeFocused()
 await page.getByRole('button',{name:'Abrir perfil',exact:true}).click()
 await expect(page.getByRole('tab',{name:'Membresía',exact:true})).toHaveAttribute('aria-selected','true')
 await expect(page.getByRole('button',{name:'Cerrar sesión',exact:true})).toBeHidden()
 await page.getByRole('tab',{name:'Cuenta',exact:true}).click()
 await expect(page.getByText('Tu ficha KUPAN',{exact:false})).toBeVisible()
 await page.getByRole('tab',{name:'Ajustes',exact:true}).click()
 await expect(page.getByRole('button',{name:'Cerrar sesión',exact:true})).toBeVisible()
 await expect(page.getByRole('link',{name:'Gestión',exact:true})).toHaveAttribute('href','/admin')
})
test('updates preserve edits, defer notices and never reload from another tab',async({page})=>{
 await mockData(page);await fakeWorker(page)
 await page.goto('/tests/fixtures/stage3-flows.html')
 await expect(page.getByRole('button',{name:'Actualizar ahora',exact:true})).toBeVisible()
 await page.getByLabel('Dato pendiente').fill('Sin guardar')
 await page.evaluate(()=>window.testControllerChange())
 await expect(page.getByLabel('Dato pendiente')).toHaveValue('Sin guardar')
 expect(await page.evaluate(()=>sessionStorage.getItem('test-boots'))).toBe('1')
 await page.getByRole('button',{name:'Actualizar ahora',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Tienes cambios sin guardar'})).toBeVisible()
 await page.getByRole('button',{name:'Volver al formulario',exact:true}).click()
 await expect(page.getByLabel('Dato pendiente')).toHaveValue('Sin guardar')
 await page.getByRole('button',{name:'Guardar prueba',exact:true}).click()
 await page.getByRole('button',{name:'Actualizar ahora',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('test-boots'))).toBe('2')
 await expect(page.getByRole('button',{name:'Actualizar ahora',exact:true})).toHaveCount(0)
})

async function mockApp(page){
 const user={id,aud:'authenticated',email:'test@example.invalid',user_metadata:{},app_metadata:{provider:'email'},created_at:new Date().toISOString()}
 const payload={sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)}
 const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify(payload))+'.test-signature'
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 const day=new Date(`${today}T12:00:00Z`).getUTCDay()||7
 await page.route('**/*.supabase.co/**',route=>{
  const url=route.request().url()
  if(url.includes('/auth/v1/token'))return route.fulfill({json:{access_token:token,refresh_token:'fake-refresh',expires_in:3600,token_type:'bearer',user}})
  if(url.includes('/auth/v1/user'))return route.fulfill({json:user})
  if(url.includes('/get_my_profile'))return route.fulfill({json:{id,full_name:'Atleta de prueba',email:user.email,role:'student',status:'active',level:'RX',birth_date:'1990-01-01'}})
  if(url.includes('/get_active_membership'))return route.fulfill({json:{id:'plan-test',status:'active',payment_status:'paid',classes_total:8,classes_used:1,plan_name:'8 clases',end_date:'2099-01-01'}})
  if(url.includes('/available_spots'))return route.fulfill({json:10})
  if(url.includes('/membership_remaining_tokens'))return route.fulfill({json:7})
  if(url.includes('/class_schedule'))return route.fulfill({json:[{id:'class-test',day_of_week:day,time:'23:59:00',class_name:'CrossFit',coach:'Coach de prueba',max_spots:10,active:true}]})
  if(url.includes('/get_public_todays_wod_v2'))return route.fulfill({json:{id:'wod-test',date:today,title:'WOD de prueba',workout:'10 repeticiones',training_details:{type:'AMRAP'}}})
  if(url.includes('/athlete_preferences'))return route.fulfill({json:{weekly_goal:3}})
  if(url.includes('/get_member_community_feed'))return route.fulfill({json:{news:[],records:[],ranking:[],birthdays:[]}})
  if(url.includes('/memberships'))return route.fulfill({json:{id:'plan-test',plan:{name:'8 clases',is_unlimited:false}}})
  if(url.includes('/rest/v1/'))return route.fulfill({json:[]})
  return route.fulfill({status:403,json:{message:'Mock: blocked'}})
 })
 return today
}
test('login restores selected reservation day and mobile action is visible',async({page})=>{
 const today=await mockApp(page)
 await page.setViewportSize({width:390,height:844})
 await page.goto('/login?returnTo='+encodeURIComponent('/reservas?date='+today))
 await page.getByLabel(/correo electrónico/i).fill('test@example.invalid')
 await page.getByLabel(/^contraseña/i).fill('Fake-Test-Password-123')
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click()
 await expect(page).toHaveURL(new RegExp('/reservas\\?date='+today))
 const reserve=page.getByRole('button',{name:'Reservar',exact:true})
 await expect(reserve).toBeVisible()
 const box=await reserve.boundingBox()
 expect(box.y+box.height).toBeLessThan(764)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 await page.screenshot({path:'test-results/stage3-reservas-mobile.png'})
})
test('quick actions open membership and WOD result with level and score preset',async({page})=>{
 await mockApp(page)
 await page.goto('/login?returnTo=%2F')
 await page.getByLabel(/correo electrónico/i).fill('test@example.invalid')
 await page.getByLabel(/^contraseña/i).fill('Fake-Test-Password-123')
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click()
 await expect(page).toHaveURL(/\/$/)
 await page.getByRole('button',{name:'Mi plan',exact:true}).click()
 await expect(page).toHaveURL(/\/perfil\?tab=membership$/)
 await expect(page.getByRole('tab',{name:'Membresía',exact:true})).toHaveAttribute('aria-selected','true')
 await page.getByRole('link',{name:'Inicio',exact:true}).click()
 await page.getByRole('button',{name:'Registrar resultado',exact:true}).click()
 await expect(page).toHaveURL(/\/wod\?action=result$/)
 await expect(page.getByRole('dialog',{name:'Registrar resultado',exact:true})).toBeVisible()
 await expect(page.getByText('WOD de prueba · Nivel RX',{exact:true})).toBeVisible()
 await expect(page.getByLabel('Rondas',{exact:true})).toBeVisible()
})

test('Profile remains usable with text enlarged to 200 percent',async({page})=>{
 await mockData(page)
 await page.setViewportSize({width:1280,height:1000})
 await page.goto('/tests/fixtures/stage3-flows.html')
 await page.getByRole('button',{name:'Abrir perfil',exact:true}).click()
 await page.getByRole('tab',{name:'Ajustes',exact:true}).click()
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%'})
 await expect(page.getByRole('button',{name:'Cerrar sesión',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})
