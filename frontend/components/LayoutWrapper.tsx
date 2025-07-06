"use client";

import { usePathname } from 'next/navigation';
import SlidingMenu from "@/components/SlidingMenu";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const showSlidingMenu = pathname !== '/' && pathname !== '/register';

  return (
    <>
      {showSlidingMenu && <SlidingMenu />}
      {children}
    </>
  );
}
