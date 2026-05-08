'use client';

import { useState } from 'react';
import { Shield, Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';

export default function SettingsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passwordStrong = (pwd: string) =>
    pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.email) {
      showToast('You must be signed in to change your password.', 'error');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in every field.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }

    if (!passwordStrong(newPassword)) {
      showToast(
        'Password must be at least 8 characters and include upper, lower, and number.',
        'error'
      );
      return;
    }

    if (newPassword === currentPassword) {
      showToast('New password must be different from the current one.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully.', 'success');
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      let msg = 'Unable to update password. Please try again.';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        msg = 'Current password is incorrect.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please wait and try again later.';
      } else if (code === 'auth/weak-password') {
        msg = 'Password is too weak. Choose a stronger one.';
      } else if (code === 'auth/requires-recent-login') {
        msg = 'Session expired. Please log out and log back in.';
      }
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const ruleItem = (ok: boolean, label: string) => (
    <li className="flex items-center gap-2 text-xs">
      {ok ? (
        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
      ) : (
        <AlertCircle size={14} className="text-gray-500 shrink-0" />
      )}
      <span className={ok ? 'text-green-500' : 'text-gray-500'}>{label}</span>
    </li>
  );

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-serif text-[#C5A059] mb-2 tracking-wide">Settings</h1>
        <p className="text-gray-400 max-w-2xl font-sans tracking-wide">
          Manage your administrator account security.
        </p>
      </div>

      <div className="bg-[#141210] border border-[#2F2A26] rounded-xl p-8">
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-[#2F2A26]">
          <div className="w-12 h-12 rounded-lg bg-[#C5A059]/10 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6 text-[#C5A059]" />
          </div>
          <div>
            <h2 className="text-xl font-serif text-white mb-1">Change Password</h2>
            <p className="text-sm text-gray-400 font-sans tracking-wide">
              Signed in as <span className="text-[#C5A059]">{user?.email}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#C5A059] mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-colors"
              placeholder="Enter your current password"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#C5A059] mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-colors"
              placeholder="Choose a strong new password"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#C5A059] mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-colors"
              placeholder="Repeat the new password"
              required
            />
          </div>

          <div className="bg-[#0F0E0D] border border-[#2F2A26] rounded-lg p-4">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">
              Password Requirements
            </p>
            <ul className="space-y-1.5">
              {ruleItem(newPassword.length >= 8, 'At least 8 characters')}
              {ruleItem(/[A-Z]/.test(newPassword), 'Contains an uppercase letter')}
              {ruleItem(/[a-z]/.test(newPassword), 'Contains a lowercase letter')}
              {ruleItem(/[0-9]/.test(newPassword), 'Contains a number')}
              {ruleItem(
                confirmPassword.length > 0 && newPassword === confirmPassword,
                'Matches the confirmation'
              )}
            </ul>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-[#C5A059] text-black px-6 py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-[#d4b06a] transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <KeyRound size={18} />
            )}
            {submitting ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
