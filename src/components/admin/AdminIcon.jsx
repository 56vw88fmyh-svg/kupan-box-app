import {
  BarbellIcon,
  CalendarDotsIcon,
  ChartBarIcon,
  ClipboardTextIcon,
  CreditCardIcon,
  GearSixIcon,
  HouseIcon,
  IdentificationCardIcon,
  MegaphoneIcon,
  PlusCircleIcon,
  UserCircleGearIcon,
  UserPlusIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'

const icons = {
  AL: UsersThreeIcon,
  CF: GearSixIcon,
  CL: CalendarDotsIcon,
  CO: MegaphoneIcon,
  CU: CalendarDotsIcon,
  HO: CalendarDotsIcon,
  IN: HouseIcon,
  ME: IdentificationCardIcon,
  MC: UserCircleGearIcon,
  NA: UserPlusIcon,
  PG: CreditCardIcon,
  PL: CreditCardIcon,
  PR: ChartBarIcon,
  RE: ClipboardTextIcon,
  TX: ClipboardTextIcon,
  WD: BarbellIcon,
}

export function AdminIcon({ code, className = 'h-4 w-4', weight = 'bold' }) {
  const Icon = icons[code] ?? PlusCircleIcon
  return <Icon aria-hidden="true" className={className} weight={weight} />
}
