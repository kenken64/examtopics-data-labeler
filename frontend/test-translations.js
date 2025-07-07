// Test translation functionality
const translations = {
  en: {
    settings: {
      title: 'Settings',
      theme: {
        light: 'Light',
        dark: 'Dark',
      }
    }
  },
  zh: {
    settings: {
      title: '设置',
      theme: {
        light: '浅色',
        dark: '深色',
      }
    }
  },
};

function t(key, language = 'en') {
  const keys = key.split('.');
  let value = translations[language];
  
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
}

// Test cases
console.log('Testing English translations:');
console.log('settings.title:', t('settings.title', 'en'));
console.log('settings.theme.light:', t('settings.theme.light', 'en'));

console.log('\nTesting Chinese translations:');
console.log('settings.title:', t('settings.title', 'zh'));
console.log('settings.theme.light:', t('settings.theme.light', 'zh'));

console.log('\nTesting missing key:');
console.log('missing.key:', t('missing.key', 'en'));
