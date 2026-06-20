import { Badge, Button, Card } from './ui/index.js'

export function ClassCard({ item, onReserve }) {
  const isFull = item.spots === 0
  const maxSpots = item.maxSpots ?? 12

  return (
    <Card as="article" className="p-4" variant="standard">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-black text-white">{item.time}</p>
          <h3 className="mt-1 text-lg font-black uppercase">{item.name}</h3>
          <p className="text-sm text-white/60">Coach {item.coach} · {item.level}</p>
          <p className="mt-1 text-xs font-black uppercase text-white/60">Máximo {maxSpots} alumnos</p>
        </div>
        <Badge state={isFull ? 'full' : 'available'}>{isFull ? 'Clase completa' : `${item.spots} cupos`}</Badge>
      </div>
      <Button className="mt-4 w-full" disabled={isFull} variant={isFull ? 'secondary' : 'primary'} onClick={onReserve}>
        {isFull ? 'Clase completa' : 'Reservar clase'}
      </Button>
    </Card>
  )
}
