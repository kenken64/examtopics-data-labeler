"use client";

import { useLanguage } from "@/app/contexts/LanguageContext";

export default function TranslationTest() {
  const { language, setLanguage, t } = useLanguage();

  const testKeys = [
    'settings.title',
    'settings.theme.light',
    'settings.theme.dark',
    'common.back'
  ];

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-white m-4">
      <h2 className="text-lg font-bold mb-4">Translation Debug</h2>
      <div className="mb-4">
        <p><strong>Current Language:</strong> {language}</p>
        <div className="flex gap-2 mt-2">
          <button 
            onClick={() => setLanguage('en')}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            English
          </button>
          <button 
            onClick={() => setLanguage('zh')}
            className="px-3 py-1 bg-green-500 text-white rounded"
          >
            中文
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold">Translation Tests:</h3>
        {testKeys.map(key => (
          <div key={key} className="flex justify-between">
            <span className="font-mono text-sm">{key}:</span>
            <span className="font-bold">{t(key)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
