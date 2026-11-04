/* global sessionStorage, MessageChannel, setTimeout, clearTimeout, setInterval, clearInterval */
import { useEffect, useRef, useState } from 'react'
import { Button, Card, Dialog } from './ui/index.js'
import { hasUnsavedForms } from '../utils/formProtection.js'
import { gymConfig } from '../config/gymConfig.js'

const deferredKey = `${gymConfig.id}:deferred-update`
function isDeferred(version) { try { return sessionStorage.getItem(deferredKey) === version } catch { return false } }
export function PwaUpdateBanner({ keepAboveModeNavigation = false }) {
  const [worker,setWorker]=useState(null)
  const [version,setVersion]=useState('available')
  const [visible,setVisible]=useState(false)
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const [confirmDiscard,setConfirmDiscard]=useState(false)
  const requested=useRef(false)
  const activated=useRef(false)
  const updateAction=useRef(null)
  useEffect(()=>{
    if(!('serviceWorker' in navigator)) return undefined
    let mounted=true, registration=null, installing=null, interval=null
    let hadController=Boolean(navigator.serviceWorker.controller)
    async function announce(waiting,manual=false) {
      if(!waiting || !mounted)return
      let found='available'
      const channel=new MessageChannel()
      found=await new Promise(resolve=>{
        const timer=setTimeout(()=>resolve('available'),800)
        channel.port1.onmessage=event=>{clearTimeout(timer);resolve(String(event.data?.version ?? 'available'))}
        waiting.postMessage({type:'GET_VERSION'},[channel.port2])
      })
      channel.port1.close()
      if(!mounted)return
      setWorker(waiting);setVersion(found)
      if(manual || !isDeferred(found))setVisible(true)
    }
    function stateChange(){if(installing?.state==='installed' && navigator.serviceWorker.controller)announce(registration?.waiting ?? installing)}
    function found(){installing?.removeEventListener('statechange',stateChange);installing=registration?.installing;installing?.addEventListener('statechange',stateChange)}
    function controllerChanged(){
      // First installation and updates initiated by another tab must not discard a form.
      if(!hadController){hadController=true;return}
      activated.current=true
      if(requested.current && !hasUnsavedForms()){window.location.reload();return}
      if(requested.current){setNotice('La actualización está lista. Guarda tus cambios antes de recargar.');setBusy(false);setVisible(true)}
    }
    async function check(){
      if(!navigator.onLine){setNotice('Conéctate a internet para buscar actualizaciones.');setVisible(true);return}
      if(!registration){setNotice('Preparando la búsqueda de actualizaciones. Intenta nuevamente.');setVisible(true);return}
      try { await registration.update(); if(registration?.waiting) await announce(registration.waiting,true);else {setNotice(activated.current?'Actualización lista para recargar.':'Tu app está al día.');setVisible(true)} } catch {setNotice('No pudimos comprobar actualizaciones. Intenta nuevamente.');setVisible(true)}
    }
    updateAction.current=check
    navigator.serviceWorker.addEventListener('controllerchange',controllerChanged)
    window.addEventListener('kupan:check-update',check)
    navigator.serviceWorker.register('/sw.js').then(value=>{
      if(!mounted)return
      registration=value;announce(value.waiting);found();value.addEventListener('updatefound',found)
      value.update().catch(()=>{})
      interval=setInterval(()=>{if(!document.hidden && navigator.onLine)value.update().catch(()=>{})},5*60*1000)
    }).catch(()=>{updateAction.current=()=>{setNotice('No pudimos comprobar actualizaciones. Intenta nuevamente.');setVisible(true)}})
    return()=>{mounted=false;if(interval)clearInterval(interval);installing?.removeEventListener('statechange',stateChange);registration?.removeEventListener('updatefound',found);navigator.serviceWorker.removeEventListener('controllerchange',controllerChanged);window.removeEventListener('kupan:check-update',check)}
  },[])
  function apply(discard=false){
    if(busy)return
    if(hasUnsavedForms() && !discard){setConfirmDiscard(true);return}
    setConfirmDiscard(false);requested.current=true
    try{sessionStorage.setItem(deferredKey,version)}catch{/* optional preference */}
    if(activated.current || !worker){window.location.reload();return}
    setBusy(true);worker.postMessage({type:'SKIP_WAITING'})
  }
  function defer(){try{sessionStorage.setItem(deferredKey,version)}catch{/* optional preference */}setVisible(false);setNotice('')}
  return <>
    {visible ? <Card role="status" className={`fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-3xl p-3 ${keepAboveModeNavigation?'lg:bottom-5':'sm:bottom-5'}`}>
      <p className="text-sm font-semibold text-white">{notice || 'Hay una actualización disponible.'}</p>
      <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="tertiary" onClick={defer}>{worker?'Ahora no':'Cerrar'}</Button>{worker || activated.current ? <Button size="sm" isLoading={busy} onClick={()=>apply()}>Actualizar ahora</Button> : null}</div>
    </Card> : null}
    <Dialog isOpen={confirmDiscard} onClose={()=>setConfirmDiscard(false)} title="Tienes cambios sin guardar" description="Actualizar recargará la app. Puedes volver al formulario para guardarlos o descartarlos explícitamente.">
      <div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={()=>setConfirmDiscard(false)}>Volver al formulario</Button><Button variant="destructive" onClick={()=>apply(true)}>Descartar y actualizar</Button></div>
    </Dialog>
  </>
}
