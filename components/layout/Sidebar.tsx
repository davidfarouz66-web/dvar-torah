'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FilePlus, History, Settings, LogOut, BookOpen } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/feuillet/nouveau', label: 'Nouveau feuillet', icon: FilePlus },
  { href: '/historique', label: 'Historique', icon: History },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
]

interface SidebarProps {
  nomOrg: string
  nomFeuillet: string
}

export default function Sidebar({ nomOrg, nomFeuillet }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-[#2e6da4]" />
          <span className="font-bold text-[#2e6da4] text-base leading-tight">{nomFeuillet}</span>
        </div>
        <p className="text-xs text-gray-400 pl-7">{nomOrg}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                ? 'bg-[#2e6da4]/10 text-[#2e6da4]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 pb-5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
