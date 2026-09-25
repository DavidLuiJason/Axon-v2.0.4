/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, User, Sliders, Shield, Terminal } from 'lucide-react';
import AxonLogo from './AxonLogo.jsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onUpdateUserName: (name: string) => void;
  onLogoClick?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userName,
  onUpdateUserName,
  onLogoClick,
}) => {
  if (!isOpen) return null;

  const handleLogoTap = () => {
    onClose();
    onLogoClick?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200" 
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md bg-[#18191C] border border-white/10 rounded-3xl p-6 shadow-2xl text-[#ECECEC] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleLogoTap}
              aria-label="AXON Navigation"
              className="cursor-pointer hover:opacity-85 transition-opacity"
            >
              <AxonLogo className="w-[24px] h-[24px] shrink-0" />
            </button>
            <h2 className="font-serif text-lg font-semibold tracking-wide text-white">AXON Settings</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#A0A2A7] hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* User Identity Setting */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#8E9094] flex items-center gap-1.5">
            <User size={13} />
            <span>User Profile Name</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={userName}
              onChange={(e) => onUpdateUserName(e.target.value)}
              placeholder="e.g. Luidel"
              className="flex-1 bg-[#1F2023] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#E85A3C] transition-colors"
            />
          </div>
          <p className="text-[11px] text-[#7A7C82]">Reflected across the welcome state and AXON greeting.</p>
        </div>

        {/* Foundation Status & Decoupled Architecture */}
        <div className="p-3.5 bg-[#141517] rounded-2xl border border-white/5 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-white font-medium">
            <Shield size={14} className="text-[#E85A3C]" />
            <span>Architecture Boundary Verification</span>
          </div>
          <p className="text-[#9A9B9F] leading-relaxed text-[11.5px]">
            The AXON Body foundation is running autonomously. The intelligence layer is staged behind a strict architectural interface and will be connected in Phase 2.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white text-black font-medium text-xs hover:bg-[#F0F0F0] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
