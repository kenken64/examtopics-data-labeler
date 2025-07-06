"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation keys and values
const translations = {
  en: {
    // Common
    'common.back': 'Back',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    
    // Settings page
    'settings.title': 'Settings',
    'settings.description': 'Manage your app preferences and account settings',
    
    // Appearance settings
    'settings.appearance.title': 'Appearance',
    'settings.appearance.description': 'Customize how the app looks and feels',
    
    // Theme settings
    'settings.theme.title': 'Theme',
    'settings.theme.description': 'Choose your preferred theme or follow system setting',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.theme.system': 'System',
    
    // Language settings
    'settings.language.title': 'Language & Region',
    'settings.language.description': 'Select your preferred language',
    'settings.language.select': 'Language',
    'settings.language.note': 'Changes will take effect immediately',
    
    // About section
    'settings.about.title': 'About',
    'settings.about.description': 'App information and version details',
    'settings.about.version': 'Version',
    'settings.about.lastUpdated': 'Last Updated',
    'settings.about.features': 'Features',
    'settings.about.feature1': 'PDF Processing',
    'settings.about.feature2': 'Question Management',
    'settings.about.feature3': 'AI Explanations',
    'settings.about.feature4': 'Multi-language Support',
  },
  zh: {
    // Common
    'common.back': '返回',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    
    // Settings page
    'settings.title': '设置',
    'settings.description': '管理您的应用程序偏好设置和账户设置',
    
    // Appearance settings
    'settings.appearance.title': '外观',
    'settings.appearance.description': '自定义应用程序的外观和感觉',
    
    // Theme settings
    'settings.theme.title': '主题',
    'settings.theme.description': '选择您偏好的主题或跟随系统设置',
    'settings.theme.light': '浅色',
    'settings.theme.dark': '深色',
    'settings.theme.system': '系统',
    
    // Language settings
    'settings.language.title': '语言和地区',
    'settings.language.description': '选择您偏好的语言',
    'settings.language.select': '语言',
    'settings.language.note': '更改将立即生效',
    
    // About section
    'settings.about.title': '关于',
    'settings.about.description': '应用程序信息和版本详情',
    'settings.about.version': '版本',
    'settings.about.lastUpdated': '最后更新',
    'settings.about.features': '功能',
    'settings.about.feature1': 'PDF 处理',
    'settings.about.feature2': '题目管理',
    'settings.about.feature3': 'AI 解释',
    'settings.about.feature4': '多语言支持',
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  // Initialize language from localStorage or browser preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language;
      if (savedLanguage && ['en', 'zh'].includes(savedLanguage)) {
        setLanguage(savedLanguage);
      } else {
        // Try to detect browser language
        const browserLanguage = navigator.language.toLowerCase();
        if (browserLanguage.startsWith('zh')) {
          setLanguage('zh');
        } else {
          setLanguage('en');
        }
      }
    }
  }, []);

  // Update language and persist to localStorage
  const updateLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', newLanguage);
    }
  };

  // Translation function
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        value = translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if translation not found
          }
        }
        break;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  const value: LanguageContextType = {
    language,
    setLanguage: updateLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
