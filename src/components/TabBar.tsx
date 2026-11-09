import { NavLink } from 'react-router-dom'
import { AccountIcon, ClassesIcon, HomeIcon, LearnIcon, ReviewIcon } from './icons.tsx'

const tabs = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/classes', label: 'Classes', Icon: ClassesIcon, end: false },
  { to: '/review', label: 'Review', Icon: ReviewIcon, end: false },
  { to: '/learn', label: 'Learn', Icon: LearnIcon, end: false },
  { to: '/account', label: 'Account', Icon: AccountIcon, end: false },
]

export default function TabBar() {
  return (
    <nav className="tab-bar" aria-label="Main">
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="tab">
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
