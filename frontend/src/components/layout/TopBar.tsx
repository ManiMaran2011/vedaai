'use client';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, LayoutGrid, Bell } from 'lucide-react';
import { useStore } from '@/store';

export function TopBar() {
  const router = useRouter();
  const path = usePathname();
  const { profile } = useStore();
  const isRoot = path === '/assignments' || path === '/';

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-2.5">
        {!isRoot ? (
          <button onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <ArrowLeft size={16} />
          </button>
        ) : (
          <LayoutGrid size={16} className="text-gray-400" />
        )}
        <span className="text-sm text-gray-500">Assignment</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell size={16} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#E8650A] rounded-full" />
        </button>
        <button onClick={() => router.push('/settings')}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-xs font-bold text-amber-700">{profile.avatarInitials}</span>
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{profile.name}</span>
        </button>
      </div>
    </header>
  );
}
