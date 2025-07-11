"use client";

import { usePathname } from 'next/navigation';
import SlidingMenu from "../components/SlidingMenu";
import { ThemeProvider } from '@/app/contexts/ThemeContext';
import { LanguageProvider } from '@/app/contexts/LanguageContext';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const showSlidingMenu = pathname !== '/' && pathname !== '/register' && pathname !== '/fullscreen-pdf';

  return (
    <ThemeProvider>
      <LanguageProvider>
        {showSlidingMenu && <SlidingMenu />}
        {children}
      </LanguageProvider>
    </ThemeProvider>
  );
}
