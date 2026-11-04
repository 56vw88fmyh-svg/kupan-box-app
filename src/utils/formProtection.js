const baselines = new WeakMap()
const tracked = new Set()
const revisions = new WeakMap()
function snapshot(form) {
  return JSON.stringify(Array.from(form.querySelectorAll('input,select,textarea')).filter(field => !['submit','button','hidden'].includes(field.type)).map(field => field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.value))
}
export function trackForm(form) {
  if (!form || baselines.has(form)) return
  baselines.set(form,snapshot(form))
  tracked.add(form)
}
export function markFormSaved(form) {
  if (!form) return
  baselines.set(form,snapshot(form))
  tracked.add(form)
}
export function hasUnsavedForms() {
  for (const form of tracked) {
    if (!form.isConnected) { tracked.delete(form); continue }
    if (snapshot(form) !== baselines.get(form)) return true
  }
  return false
}
export function installFormProtection() {
  const focus = event => trackForm(event.target.closest?.('form'))
  const edited = event => { const form = event.target.closest?.('form'); if (form) revisions.set(form,(revisions.get(form) ?? 0) + 1) }
  document.addEventListener('input',edited,true)
  document.addEventListener('change',edited,true)
  const beforeUnload = event => { if(hasUnsavedForms()){event.preventDefault(); event.returnValue=''} }
  document.addEventListener('focusin',focus,true)
  document.addEventListener('pointerdown',focus,true)
  window.addEventListener('beforeunload',beforeUnload)
  return()=>{document.removeEventListener('input',edited,true);document.removeEventListener('change',edited,true);document.removeEventListener('focusin',focus,true);document.removeEventListener('pointerdown',focus,true);window.removeEventListener('beforeunload',beforeUnload)}
}

// Call only after the specific submitted form has saved successfully.
export function captureFormSave(form) {
  if (!form) return () => {}
  const submitted = snapshot(form)
  const revision = revisions.get(form) ?? 0
  return () => {
    if (form.isConnected && (revisions.get(form) ?? 0) === revision && snapshot(form) === submitted) {
      markFormSaved(form)
      // React may reset the controlled fields after the successful response.
      window.requestAnimationFrame(() => {
        if (form.isConnected && (revisions.get(form) ?? 0) === revision) markFormSaved(form)
      })
    }
  }
}
