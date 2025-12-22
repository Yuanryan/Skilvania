'use client';

import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface InterestSelectorProps {
  interests: string[];
  onChange: (interests: string[]) => void;
  placeholder?: string;
  maxInterests?: number;
}

export default function InterestSelector({
  interests,
  onChange,
  placeholder = 'Add an interest...',
  maxInterests = 10
}: InterestSelectorProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addInterest(inputValue.trim());
    }
  };

  const addInterest = (interest: string) => {
    if (interest && !interests.includes(interest) && interests.length < maxInterests) {
      onChange([...interests, interest]);
      setInputValue('');
    }
  };

  const removeInterest = (index: number) => {
    const newInterests = interests.filter((_, i) => i !== index);
    onChange(newInterests);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {interests.map((interest, index) => (
          <span
            key={index}
            className="inline-flex items-center space-x-1 bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-sm"
          >
            <span>{interest}</span>
            <button
              onClick={() => removeInterest(index)}
              className="hover:bg-emerald-800/30 rounded-full p-0.5 transition-colors"
              aria-label={`Remove ${interest}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {interests.length < maxInterests && (
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-500"
            maxLength={30}
          />
          <button
            onClick={() => addInterest(inputValue.trim())}
            disabled={!inputValue.trim()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      )}

      {interests.length >= maxInterests && (
        <p className="text-sm text-slate-500">
          Maximum of {maxInterests} interests reached
        </p>
      )}
    </div>
  );
}

