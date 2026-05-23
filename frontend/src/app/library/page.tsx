import Link from 'next/link';
import { BookOpen } from 'lucide-react';
export default function LibraryPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <BookOpen size={20} className="text-gray-400" />
      </div>
      <h2 className="text-base font-semibold text-gray-700 mb-1">My Library</h2>
      <p className="text-sm text-gray-400 mb-4">Your saved papers and resources will appear here</p>
      <Link href="/assignments" className="text-xs text-[#E8650A] hover:underline">Back to Assignments</Link>
    </div>
  );
}
