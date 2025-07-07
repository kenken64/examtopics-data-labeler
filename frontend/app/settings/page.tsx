"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Moon, Sun, Monitor, Languages, Palette, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useLanguage } from "@/app/contexts/LanguageContext";

const SettingsPage = () => {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const handleGoBack = () => {
    router.back();
  };

  const themes = [
    { value: 'light', label: t('settings.theme.light'), icon: Sun },
    { value: 'dark', label: t('settings.theme.dark'), icon: Moon },
    { value: 'system', label: t('settings.theme.system'), icon: Monitor },
  ];

  const languages = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'zh', label: '中文', flag: '🇨🇳' },
  ];

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('settings.description')}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('settings.appearance.title')}
              </CardTitle>
              <CardDescription>
                {t('settings.appearance.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {t('settings.theme.title')}
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {themes.map((themeOption) => {
                    const IconComponent = themeOption.icon;
                    const isSelected = theme === themeOption.value;
                    
                    return (
                      <Button
                        key={themeOption.value}
                        variant={isSelected ? "default" : "outline"}
                        className={`relative h-auto p-4 justify-start ${
                          isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                        }`}
                        onClick={() => setTheme(themeOption.value as 'light' | 'dark' | 'system')}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <IconComponent className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">{themeOption.label}</div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 ml-auto" />
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.theme.description')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                {t('settings.language.title')}
              </CardTitle>
              <CardDescription>
                {t('settings.language.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {t('settings.language.select')}
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {languages.map((lang) => {
                    const isSelected = language === lang.value;
                    
                    return (
                      <Button
                        key={lang.value}
                        variant={isSelected ? "default" : "outline"}
                        className={`relative h-auto p-4 justify-start ${
                          isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                        }`}
                        onClick={() => setLanguage(lang.value as 'en' | 'zh')}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-2xl">{lang.flag}</span>
                          <div className="text-left">
                            <div className="font-medium">{lang.label}</div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 ml-auto" />
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.language.note')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* App Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.about.title')}</CardTitle>
              <CardDescription>
                {t('settings.about.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-foreground">{t('settings.about.version')}</div>
                  <div className="text-muted-foreground">1.0.0</div>
                </div>
                <div>
                  <div className="font-medium text-foreground">{t('settings.about.lastUpdated')}</div>
                  <div className="text-muted-foreground">December 2024</div>
                </div>
              </div>
              <Separator />
              <div>
                <div className="font-medium text-foreground mb-2">{t('settings.about.features')}</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{t('settings.about.feature1')}</Badge>
                  <Badge variant="secondary">{t('settings.about.feature2')}</Badge>
                  <Badge variant="secondary">{t('settings.about.feature3')}</Badge>
                  <Badge variant="secondary">{t('settings.about.feature4')}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
