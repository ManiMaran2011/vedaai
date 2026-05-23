'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Users, FileText, Cpu, BookOpen, Settings, Plus } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '@/store';

const NAV_ITEMS = [
  { href: '/assignments', icon: LayoutGrid, label: 'Home' },
  { href: '/groups',      icon: Users,      label: 'My Groups' },
  { href: '/assignments', icon: FileText,   label: 'Assignments', exact: false },
  { href: '/toolkit',     icon: Cpu,        label: "AI Teacher's Toolkit" },
  { href: '/library',     icon: BookOpen,   label: 'My Library' },
];

export function Sidebar() {
  const path = usePathname();
  const { assignments, profile } = useStore();
  const pendingCount = assignments.filter(a => a.status === 'processing' || a.status === 'pending').length;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[215px] bg-white border-r border-gray-100 h-full flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="w-8 h-8 rounded-xl bg-[#E8650A] flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm leading-none">V</span>
          </div>
          <span className="font-semibold text-gray-900">VedaAI</span>
        </div>

        {/* Create button */}
        <div className="px-4 mb-4">
          <Link href="/assignments/new" className="btn-primary w-full text-xs py-2">
            <Plus size={14} />
            Create Assignment
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }, i) => {
            const isAssignments = label === 'Assignments';
            const active = isAssignments
              ? path.startsWith('/assignments')
              : path === href;

            return (
              <Link key={`${href}-${i}`} href={href}
                className={clsx('nav-item', active && 'active')}>
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {isAssignments && pendingCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-[#E8650A] text-white rounded-full w-4 h-4 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-100 p-3 space-y-1">
          <Link href="/settings" className={clsx('nav-item', path === '/settings' && 'active')}>
            <Settings size={16} />
            <span>Settings</span>
          </Link>
          <Link href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer mt-1">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-amber-700">{profile.avatarInitials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{profile.schoolName}</p>
              <p className="text-[11px] text-gray-400 truncate">{profile.schoolLocation || profile.name}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1C1C1C] flex items-center justify-around px-1 py-2">
        {[
          { href: '/assignments', icon: LayoutGrid, label: 'Home' },
          { href: '/assignments', icon: FileText,   label: 'Assignments' },
          { href: '/library',     icon: BookOpen,   label: 'Library' },
          { href: '/toolkit',     icon: Cpu,        label: 'AI Toolkit' },
        ].map(({ href, icon: Icon, label }, i) => {
          const active = path.startsWith(href);
          return (
            <Link key={i} href={href}
              className={clsx(
                'flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all',
                active ? 'text-white' : 'text-gray-500'
              )}>
              <Icon size={18} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
