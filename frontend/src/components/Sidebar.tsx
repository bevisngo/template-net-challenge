import { Link, useLocation } from 'react-router-dom'
import { Puzzle, Zap } from 'lucide-react'
import clsx from 'clsx'
import BrandLogo from './BrandLogo'

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-[72px] flex flex-col items-center bg-white border-r border-gray-200 py-3 flex-shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="pb-4 pt-2 flex justify-center">
        <BrandLogo />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom group */}
      <nav className="flex flex-col items-center gap-0.5 w-full pb-2">
        <Link
          to="/components"
          title="Components"
          className={clsx(
            'flex flex-col items-center justify-center gap-[3px] w-[60px] h-14 rounded-xl transition-colors duration-150',
            location.pathname === '/components'
              ? 'bg-brand-light text-brand'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <Puzzle size={20} strokeWidth={1.6} />
          <span className="text-[10px] font-medium leading-none text-center truncate max-w-full px-1">
            UI Kit
          </span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-gray-200 w-full">
        <button
          title="Upgrade"
          className="flex flex-col items-center justify-center gap-[3px] w-11 h-11 rounded-full bg-brand hover:bg-brand-dark transition-colors text-white"
        >
          <Zap size={16} fill="#fff" strokeWidth={0} />
          <span className="text-[9px] font-semibold leading-none">Pro</span>
        </button>
      </div>
    </aside>
  )
}
