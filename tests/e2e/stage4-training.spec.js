import {test,expect} from '@playwright/test'
import {addCalendarDays,weekRange} from '../../src/utils/metricDefinitions.js'
import {formatCalendarDate} from '../../src/utils/displayFormats.js'
test.use({serviceWorkers:'block'})
const owner='00000000-0000-4000-8000-000000000001'
async function mockTraining(page,{empty=false,broken=false}={}){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 const prescription=JSON.stringify([['21-15-9'],[], '10'])
 const context={wod_id:'10000000-0000-4000-8000-000000000001',version:'v1',level:'RX',result_type:'time',benchmark_id:'fran',comparison_key:prescription}
 const sessions=empty?[]:[
  {id:'w1',profile_id:owner,movement:'WOD: Fran',value:780,unit:'tiempo',record_date:addCalendarDays(today,-7),result_context:context,rpe:6,duration_minutes:30,created_at:addCalendarDays(today,-7)+'T12:00:00Z'},
  {id:'w2',profile_id:owner,movement:'WOD: Fran',value:720,unit:'tiempo',record_date:today,result_context:{...context,wod_id:'10000000-0000-4000-8000-000000000002'},rpe:7,duration_minutes:35,created_at:today+'T12:00:00Z'},
  {id:'scaled',profile_id:owner,movement:'WOD: Fran',value:650,unit:'tiempo',record_date:today,result_context:{...context,level:'Scaled'},rpe:null,duration_minutes:null,created_at:today+'T12:01:00Z'},
  {id:'different',profile_id:owner,movement:'WOD: Fran',value:700,unit:'tiempo',record_date:today,result_context:{...context,comparison_key:JSON.stringify([['10 reps'],[],'10'])},rpe:8,duration_minutes:40,created_at:today+'T12:02:00Z'},
 ]
 let saved=null
 await page.route('**/*.supabase.co/**',route=>{
  const req=route.request(),url=req.url()
  if(url.includes('/get_public_todays_wod_v2'))return route.fulfill({json:{id:context.wod_id,date:today,title:'Fran',workout:'21-15-9',strength:'',time_cap:'10',training_details:{benchmarkId:'fran',type:'time'}}})
  if(url.includes('/get_my_training_attendance'))return route.fulfill({json:empty?[]:[{id:'past',reservation_date:addCalendarDays(today,-7),status:'attended',class_schedule:{class_name:'CrossFit anterior',time:'18:00'}},{id:'a',reservation_date:today,status:'attended',class_schedule:{class_name:'CrossFit',time:'18:00'}},{id:'r',reservation_date:today,status:'reserved',class_schedule:{class_name:'CrossFit',time:'19:00'}}]})
  if(url.includes('/athlete_preferences'))return route.fulfill({json:{weekly_goal:3}})
  if(url.includes('/workout_results')){
   if(broken)return route.fulfill({status:403,json:{message:'permission denied'}})
   if(req.method()==='POST'){saved={...req.postDataJSON(),created_at:today+'T13:00:00Z'};sessions.push(saved);return route.fulfill({status:201,json:saved})}
   return route.fulfill({json:sessions})
  }
  if(url.includes('/personal_records'))return route.fulfill({json:empty?[]:[{id:'p1',movement:'Back Squat',unit:'kg',value:80.5,record_date:addCalendarDays(today,-14)},{id:'p2',movement:'Back Squat',unit:'kg',value:90,record_date:today}]})
  return route.fulfill({status:403,json:{message:'Mock: blocked'}})
 })
 return {today,saved:()=>saved}
}
test('progress shows real series, separates benchmark variants and opens records',async({page})=>{
 const{today}=await mockTraining(page)
 await page.goto('/tests/fixtures/stage4-training.html')
 await page.getByRole('tab',{name:'Progreso',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Constancia semanal',exact:true})).toBeVisible()
 await expect(page.locator('figure[aria-label="Asistencias confirmadas por semana"] button')).toHaveCount(12)
 await page.getByLabel('Período',{exact:true}).selectOption('4')
 await expect(page.locator('figure[aria-label="Asistencias confirmadas por semana"] button')).toHaveCount(4)
 await page.getByRole('button',{name:new RegExp(formatCalendarDate(weekRange(addCalendarDays(today,-7)).start)+'.*1 sesión')}).click()
 await expect(page.getByText(/CrossFit anterior/)).toBeVisible()
 await expect(page.getByLabel('Benchmark, nivel y puntuación').getByRole('option')).toHaveCount(3)
 await page.getByRole('button',{name:/80,5 kg/}).click()
 await expect(page.getByRole('dialog',{name:'Detalle del registro'})).toBeVisible()
 await expect(page.getByRole('dialog').getByText('80,5 kg',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Cerrar',exact:true}).click()
 await page.getByRole('button',{name:new RegExp(formatCalendarDate(today)+'.*asistencia, reserva')}).click()
 await expect(page.getByText('Asistió · CrossFit',{exact:true})).toBeVisible()
 await page.setViewportSize({width:390,height:844})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 await page.screenshot({path:'test-results/stage4-progress.png',fullPage:true})
 await page.getByRole('tab',{name:'Historial',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Historial de resultados',exact:true})).toBeVisible()
 await page.goBack()
 await expect(page.getByRole('tab',{name:'Progreso',exact:true})).toHaveAttribute('aria-selected','true')
 await page.goForward()
 await expect(page.getByRole('tab',{name:'Historial',exact:true})).toHaveAttribute('aria-selected','true')
 await page.screenshot({path:'test-results/stage4-history.png',fullPage:true})
})
test('optional effort and duration persist on the workout result',async({page})=>{
 const response=await mockTraining(page)
 await page.goto('/tests/fixtures/stage4-training.html')
 await page.getByRole('button',{name:'Registrar resultado',exact:true}).click()
 await page.getByLabel('Tiempo',{exact:true}).fill('11:30')
 await page.getByLabel('Esfuerzo percibido (opcional)',{exact:true}).fill('8')
 await page.getByLabel('Duración en minutos (opcional)',{exact:true}).fill('45')
 await page.getByRole('button',{name:'Guardar resultado',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Registrar resultado',exact:true})).toHaveCount(0)
 expect(response.saved().rpe).toBe(8);expect(response.saved().duration_minutes).toBe(45);expect(response.saved().result_context.benchmark_id).toBe('fran')
 await page.getByRole('tab',{name:'Historial',exact:true}).click()
 await page.getByRole('button',{name:/Fran · 11:30/}).click()
 await expect(page.getByText('Esfuerzo: 8/10',{exact:true})).toBeVisible()
 await expect(page.getByText('Duración: 45 minutos',{exact:true})).toBeVisible()
})
test('failed session source does not become zero or fabricated trend',async({page})=>{
 await mockTraining(page,{broken:true})
 await page.goto('/tests/fixtures/stage4-training.html')
 await page.getByRole('tab',{name:'Progreso',exact:true}).click()
 await expect(page.getByText('No pudimos cargar las sesiones.',{exact:true}).first()).toBeVisible()
 await expect(page.getByText('Todavía no hay benchmarks registrados con una referencia y prescripción comparables.',{exact:true})).toHaveCount(0)
 await expect(page.locator('figure[aria-label="Asistencias confirmadas por semana"] button')).toHaveCount(12)
})
test('empty history has no invented marks; management charts reveal their detail',async({page})=>{
 await mockTraining(page,{empty:true})
 await page.setViewportSize({width:390,height:844})
 await page.goto('/tests/fixtures/stage4-training.html')
 await page.getByRole('tab',{name:'Progreso',exact:true}).click()
 await expect(page.getByText('Todavía no hay marcas registradas en este período.',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 await page.getByRole('button',{name:'Vista gestión',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Demanda por horario',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'1 / 10',exact:true}).click()
 await expect(page.getByText('Alumno de prueba · reserva ocupada',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:/Por renovar 1 alumno/}).click()
 await expect(page.getByText('Alumno por renovar',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 await page.screenshot({path:'test-results/stage4-management-mobile.png',fullPage:true})
})
