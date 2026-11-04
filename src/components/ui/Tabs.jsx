import { useId, useRef } from 'react'

// WAI-ARIA automatic activation: arrow keys wrap, Home/End jump, one tab stop.
export function Tabs({ items, value, onChange, label, panelId, className = '' }) {
  const prefix = useId()
  const refs = useRef([])
  function keydown(event, index) {
    let target = index
    if (event.key === 'ArrowRight') target = (index + 1) % items.length
    else if (event.key === 'ArrowLeft') target = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = items.length - 1
    else return
    event.preventDefault()
    onChange(items[target].id)
    refs.current[target]?.focus()
  }
  return <div role="tablist" aria-label={label} className={`flex gap-2 overflow-x-auto pb-1 ${className}`}>
    {items.map((item,index)=><button key={item.id} id={`${prefix}-${item.id}`} ref={node=>{refs.current[index]=node}} type="button" role="tab" aria-selected={value===item.id} aria-controls={panelId} tabIndex={value===item.id?0:-1} onKeyDown={event=>keydown(event,index)} onClick={()=>onChange(item.id)} className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kupan-sand ${value===item.id ? 'border-kupan-ember bg-kupan-ember text-white' : 'border-kupan-border bg-kupan-gray/60 text-white/80'}`}>{item.label}</button>)}
  </div>
}
