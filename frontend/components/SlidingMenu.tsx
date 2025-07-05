"use client";

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  Home, 
  TrendingUp, 
  Bookmark, 
  Library, 
  LogOut,
  User,
  Settings,
  CreditCard,
  KeySquare
} from "lucide-react";

const SlidingMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/'); // Still redirect even if logout fails
    }
    closeMenu();
  };

  const handleNavigation = (path: string) => {
    // Only navigate if we're not already on the target path
    // This prevents unnecessary re-renders that clear form state
    if (pathname !== path) {
      router.push(path);
    }
    closeMenu();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="fixed top-4 left-4 z-50 h-10 w-10 sm:h-12 sm:w-12 bg-background/95 backdrop-blur-sm border shadow-lg hover:bg-accent hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/10">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <SheetTitle className="text-lg font-semibold text-foreground">
                Welcome back!
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                AWS Certification Helper
              </SheetDescription>
              <Badge variant="outline" className="mt-1 text-xs">
                Admin User
              </Badge>
            </div>
          </div>
        </SheetHeader>
        
        <Separator />
        
        <div className="flex-1 p-6">
          <nav className="space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 px-4 text-left font-normal hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleNavigation('/home')}
            >
              <Home className="mr-3 h-5 w-5" />
              Home
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 px-4 text-left font-normal hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleNavigation('/home')}
            >
              <Library className="mr-3 h-5 w-5" />
              Exam Q Labeler
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 px-4 text-left font-normal hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleNavigation('/certificates')}
            >
              <TrendingUp className="mr-3 h-5 w-5" />
              Certificates
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 px-4 text-left font-normal hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleNavigation('/saved-questions')}
            >
              <Bookmark className="mr-3 h-5 w-5" />
              Saved Questions
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 px-4 text-left font-normal hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleNavigation('/access-codes')}
            >
              <KeySquare className="mr-3 h-5 w-5" />
              Access codes
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 px-4 text-left font-normal hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleNavigation('/access-code-questions')}
            >
              <Settings className="mr-3 h-5 w-5" />
              Manage Questions
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 px-4 text-left font-normal hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleNavigation('/payees')}
            >
              <CreditCard className="mr-3 h-5 w-5" />
              Payees
            </Button>

            <Separator className="my-4" />

            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 px-4 text-left font-normal hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleNavigation('#')}
            >
              <Settings className="mr-3 h-5 w-5" />
              Settings
            </Button>
          </nav>
        </div>
        
        <div className="p-6 pt-0 mt-auto">
          <Separator className="mb-4" />
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground px-4 mb-2">
              Account
            </div>
            <Button 
              variant="ghost"
              className="w-full justify-start h-12 px-4 text-left font-normal hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleNavigation('#')}
            >
              <User className="mr-3 h-5 w-5" />
              Profile Settings
            </Button>
            <Button 
              variant="destructive"
              className="w-full justify-start h-12 px-4 hover:bg-destructive/90"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SlidingMenu;
