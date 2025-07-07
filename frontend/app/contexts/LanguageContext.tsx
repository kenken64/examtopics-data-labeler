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
    common: {
      back: 'Back',
      save: 'Save',
      cancel: 'Cancel',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
    },
    settings: {
      title: 'Settings',
      description: 'Manage your app preferences and account settings',
      appearance: {
        title: 'Appearance',
        description: 'Customize how the app looks and feels',
      },
      theme: {
        title: 'Theme',
        description: 'Choose your preferred theme or follow system setting',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
      },
      language: {
        title: 'Language & Region',
        description: 'Select your preferred language',
        select: 'Language',
        note: 'Changes will take effect immediately',
      },
      about: {
        title: 'About',
        description: 'App information and version details',
        version: 'Version',
        lastUpdated: 'Last Updated',
        features: 'Features',
        feature1: 'PDF Processing',
        feature2: 'Question Management',
        feature3: 'AI Explanations',
        feature4: 'Multi-language Support',
      },
    },
  },
  zh: {
    common: {
      back: '返回',
      save: '保存',
      cancel: '取消',
      loading: '加载中...',
      error: '错误',
      success: '成功',
    },
    settings: {
      title: '设置',
      description: '管理您的应用程序偏好设置和账户设置',
      appearance: {
        title: '外观',
        description: '自定义应用程序的外观和感觉',
      },
      theme: {
        title: '主题',
        description: '选择您偏好的主题或跟随系统设置',
        light: '浅色',
        dark: '深色',
        system: '系统',
      },
      language: {
        title: '语言和地区',
        description: '选择您偏好的语言',
        select: '语言',
        note: '更改将立即生效',
      },
      about: {
        title: '关于',
        description: '应用程序信息和版本详情',
        version: '版本',
        lastUpdated: '最后更新',
        features: '功能',
        feature1: 'PDF 处理',
        feature2: '题目管理',
        feature3: 'AI 解释',
        feature4: '多语言支持',
      },
    },
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
    
    // Try to get value from current language
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }
    
    // If not found in current language, try English fallback
    if (value === undefined) {
      value = translations.en;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          value = undefined;
          break;
        }
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
