'use client';
import { useState } from 'react';
import { useStore } from '@/store';
import { profileApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Save, User, Building, MapPin, BookOpen } from 'lucide-react';

export default function SettingsPage() {
  const { profile, updateProfile } = useStore();
  const { add: toast } = useToast();
  const [form, setForm] = useState({ ...profile });
  const [saving, setSaving] = useState(false);

  const upd = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      updateProfile(form);
      await profileApi.update(form).catch(() => {}); // best-effort sync to backend
      toast('success', 'Profile saved successfully');
    } catch {
      toast('error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-16 md:pb-8">
      <div className="page-header">
        <h1 className="text-sm font-semibold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Manage your profile and preferences</p>
      </div>

      <div className="max-w-xl mx-auto px-4 md:px-6 py-6 space-y-4">
        <div className="section-card space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-xl font-bold text-amber-700 flex-shrink-0">
              {form.avatarInitials || 'U'}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{form.name || 'Your Name'}</p>
              <p className="text-sm text-gray-400">{form.schoolName || 'Your School'}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <User size={12} /> Teacher Name
              </label>
              <input className="input text-sm" placeholder="e.g. Mr. John Smith"
                value={form.name} onChange={e => upd('name', e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Building size={12} /> School Name
              </label>
              <input className="input text-sm" placeholder="e.g. Springfield High School"
                value={form.schoolName} onChange={e => upd('schoolName', e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <MapPin size={12} /> School Location
              </label>
              <input className="input text-sm" placeholder="e.g. Springfield, IL"
                value={form.schoolLocation} onChange={e => upd('schoolLocation', e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <BookOpen size={12} /> Primary Subject
              </label>
              <input className="input text-sm" placeholder="e.g. Physics, Mathematics"
                value={form.subject} onChange={e => upd('subject', e.target.value)} />
            </div>
          </div>

          <div className="pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        <div className="section-card">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">About</h3>
          <div className="space-y-2 text-xs text-gray-500">
            <p>VedaAI — AI-powered exam paper generator</p>
            <p>Powered by Llama 3.3 70b on Groq</p>
            <p className="text-gray-300">v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
