const locks = new WeakMap()
const properties = ['overflow', 'position', 'top', 'left', 'width']

// One owner per modal. Fixed positioning also locks the viewport on mobile Safari.
export function acquireBodyScrollLock(body) {
  let state = locks.get(body)
  if (!state) {
    const view = body.ownerDocument?.defaultView
    state = {
      count: 0,
      view,
      x: view?.scrollX ?? 0,
      y: view?.scrollY ?? 0,
      styles: properties.map((name) => [name, body.style.getPropertyValue(name), body.style.getPropertyPriority(name)]),
    }
    locks.set(body, state)
    body.style.setProperty('overflow', 'hidden')
    if (view) {
      body.style.setProperty('position', 'fixed')
      body.style.setProperty('top', `${-state.y}px`)
      body.style.setProperty('left', `${-state.x}px`)
      body.style.setProperty('width', '100%')
    }
  }
  state.count += 1
  let released = false
  return () => {
    if (released) return
    released = true
    if (--state.count !== 0) return
    for (const [name, value, priority] of state.styles) {
      if (value) body.style.setProperty(name, value, priority)
      else body.style.removeProperty(name)
    }
    locks.delete(body)
    state.view?.scrollTo({ left: state.x, top: state.y, behavior: 'instant' })
  }
}
