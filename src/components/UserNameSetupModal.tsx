import React, { useState } from 'react';
import { User, Sparkles, Check } from 'lucide-react';

interface UserNameSetupModalProps {
  isOpen: boolean;
  onSaveName: (name: string) => void;
}

const PRESET_NAMES = ['まりな先輩', 'あやか', 'たくみ', 'サキ', 'ゆうき先輩', 'りょうた'];

export const UserNameSetupModal: React.FC<UserNameSetupModalProps> = ({
  isOpen,
  onSaveName,
}) => {
  const [inputName, setInputName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) {
      setError('お名前またはニックネームを入力してください');
      return;
    }
    onSaveName(trimmed);
  };

  const handleSelectPreset = (name: string) => {
    onSaveName(name);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-stone-200 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#2D4B3E] text-emerald-200 flex items-center justify-center mx-auto shadow-md">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-stone-900">
            あなたの表示名（ニックネーム）
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            誰がおすすめ・追加したお店かが全員の画面に表示されます。<br />
            会員登録やパスワードは不要です！
          </p>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#2D4B3E]" />
            <span>ワンタップで選択:</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleSelectPreset(name)}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-[#E8ECE8] hover:text-[#2D4B3E] text-stone-700 text-xs font-bold transition-all border border-stone-200 active:scale-95 cursor-pointer"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">
              直接入力する:
            </label>
            <input
              type="text"
              placeholder="例: たくみ、まりな先輩"
              value={inputName}
              onChange={(e) => {
                setInputName(e.target.value);
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-base sm:text-sm focus:outline-none focus:border-[#2D4B3E]"
            />
            {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#2D4B3E] hover:bg-[#233B31] text-white text-sm font-bold shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-200 stroke-[3]" />
            <span>この名前で手帳を始める</span>
          </button>
        </form>
      </div>
    </div>
  );
};
