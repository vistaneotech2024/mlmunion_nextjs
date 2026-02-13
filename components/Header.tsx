'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Building2, Newspaper, MessageSquare, Trophy, ChevronDown, LogOut, LayoutDashboard, Settings, BarChart3, Users, User, FileText, UserCheck, UserCircle, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import { PageNavigation } from './PageNavigation';
import { ProfileImage } from './ProfileImage';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  image_url: string | null;
  is_admin?: boolean;
  points?: number;
}

interface SubMenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  hasDropdown?: boolean;
  subItems?: SubMenuItem[];
}

export function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [openDropdowns, setOpenDropdowns] = React.useState<{ [key: string]: boolean }>({});
  const [showDirectSellersDropdown, setShowDirectSellersDropdown] = React.useState(false);
  const [referralLink, setReferralLink] = React.useState<string>('');
  const [referralCopied, setReferralCopied] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      loadProfile();
      
      // Subscribe to profile changes for real-time points updates
      const subscription = supabase
        .channel('header-profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          () => {
            loadProfile();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setProfile(null);
    }
  }, [user?.id]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, image_url, is_admin, points')
        .eq('id', user?.id)
        .single();

      if (!error && data) {
        setProfile(data);
        // Generate referral link using username
        if (data.username) {
          const url = `${window.location.origin}/signup?ref=${encodeURIComponent(data.username)}`;
          setReferralLink(url);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function handleCopyReferralLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setReferralCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setReferralCopied(false), 2000);
    } catch (error: any) {
      console.error('Error copying referral link:', error);
      toast.error('Failed to copy referral link. You can copy it manually.');
    }
  }

  const toggleDropdown = (key: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // User menu items
  const userMenuItems: MenuItem[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: BarChart3,
    },
    {
      name: 'Messages',
      path: '/messages',
      icon: MessageSquare,
    },
    {
      name: 'Connections',
      path: '/connections',
      icon: Users,
    },
    {
      name: 'Top Earners',
      path: '/top-earners',
      icon: Trophy,
    },
  ];

  const adminMenuItems = [
    {
      name: 'Admin Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Messages',
      path: '/admin/messages',
      icon: MessageSquare,
    }
  ];

  const isAdmin = profile?.is_admin || false;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      setShowProfileMenu(false);
    } catch (error: any) {
      toast.error('Error signing out');
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!showProfileMenu) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-profile-menu]')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileMenu]);

  // Close mobile profile menu when clicking outside on mobile
  React.useEffect(() => {
    if (!showProfileMenu || window.innerWidth >= 640) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-profile-menu]')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileMenu]);

  // Close Direct Sellers dropdown when clicking outside
  React.useEffect(() => {
    if (!showDirectSellersDropdown) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-direct-sellers-dropdown]')) {
        setShowDirectSellersDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDirectSellersDropdown]);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          {/* Left side */}
          <div className="flex">
            <Link href="/" className="flex items-center">
              <img 
                src="/mlm_union.png" 
                alt="MLM Union" 
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-6">
            <PageNavigation />
            
            <Link href="/companies" className="flex items-center text-gray-700 hover:text-indigo-600 text-sm font-semibold">
              <Building2 className="h-4 w-4 mr-1" />
              MLM Companies
            </Link>
            <Link href="/blog" className="flex items-center text-gray-700 hover:text-indigo-600 text-sm font-semibold">
              <FileText className="h-4 w-4 mr-1" />
              Blog
            </Link>
            <Link href="/news" className="flex items-center text-gray-700 hover:text-indigo-600 text-sm font-semibold">
              <Newspaper className="h-4 w-4 mr-1" />
              News
            </Link>
            <Link href="/classifieds" className="flex items-center text-gray-700 hover:text-indigo-600 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 mr-1" />
              Classifieds
            </Link>
            
            {/* Direct Sellers Dropdown */}
            <div 
              className="relative" 
              data-direct-sellers-dropdown
            >
              <button
                className="flex items-center text-gray-700 hover:text-indigo-600 text-sm font-semibold"
                onClick={() => setShowDirectSellersDropdown(!showDirectSellersDropdown)}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Direct Sellers
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showDirectSellersDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showDirectSellersDropdown && (
                <div 
                  className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    href="/direct-sellers"
                    onClick={() => setShowDirectSellersDropdown(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Find Direct Sellers
                  </Link>
                  <Link
                    href="/recommended-direct-sellers"
                    onClick={() => setShowDirectSellersDropdown(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                  >
                    <UserCircle className="h-5 w-5 mr-2 stroke-2" />
                    Recommended Direct Sellers
                  </Link>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center space-x-3">
                <Link
                  href="/messages"
                  className="relative p-2 text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-full transition-colors"
                  title="Messages"
                >
                  <MessageSquare className="h-5 w-5" />
                </Link>
                <NotificationBell />
                
                {/* Points Display with Coin */}
                <Link
                  href="/points-rules"
                  className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 text-gray-800 rounded-full hover:bg-gray-100 hover:shadow-md transition-all duration-200 shadow-sm group"
                >
                  <img 
                    src="/coin.gif" 
                    alt="Coins" 
                    className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" 
                  />
                  <span className="font-semibold text-sm text-gray-800">
                    {profile?.points || 0}
                  </span>
                </Link>
                
                {/* Profile Dropdown */}
                <div className="relative" data-profile-menu>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-1.5 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <ProfileImage
                      imageUrl={profile?.image_url}
                      username={profile?.username || user.email || ''}
                      size="sm"
                    />
                    <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50 max-h-96 overflow-y-auto">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.full_name || profile?.username || user.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* Referral Link Section */}
                      {referralLink && (
                        <div className="px-4 py-2.5 border-b border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">Refer & Earn 250 Points</p>
                            <button
                              onClick={handleCopyReferralLink}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors flex items-center justify-center"
                              title="Copy referral link"
                            >
                              {referralCopied ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Admin Menu Section */}
                      {isAdmin && (
                        <>
                          <div className="px-4 py-2 bg-gray-50">
                            <p className="text-xs font-semibold text-gray-500 tracking-wide">Admin</p>
                          </div>
                          {adminMenuItems.filter(item => item.path).map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.path;
                            
                            return (
                              <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setShowProfileMenu(false)}
                                className={`flex items-center px-4 py-2 text-sm transition-colors ${
                                  isActive
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                                }`}
                              >
                                <Icon className="h-4 w-4 mr-3" />
                                {item.name}
                              </Link>
                            );
                          })}
                          <div className="border-t border-gray-200 my-1"></div>
                        </>
                      )}
                      
                      {/* User Menu Items */}
                      {userMenuItems
                        .filter(item => (!isAdmin || item.name !== 'Dashboard') && item.path)
                        .map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path || 
                                        (item.subItems && item.subItems.some(sub => pathname === sub.path));
                        const isDropdownOpen = openDropdowns[`header-${item.name}`] || false;
                        
                        if (item.hasDropdown && item.subItems) {
                          return (
                            <div key={item.name}>
                              <button
                                onClick={() => toggleDropdown(`header-${item.name}`)}
                                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                                  isActive
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                                }`}
                              >
                                <div className="flex items-center">
                                  <Icon className="h-4 w-4 mr-3" />
                                  {item.name}
                                </div>
                                <ChevronDown className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>
                              
                              {isDropdownOpen && (
                                <div className="ml-4 mt-1 space-y-1">
                                  {item.subItems.filter(subItem => subItem.path).map((subItem) => {
                                    const SubIcon = subItem.icon;
                                    const isSubActive = pathname === subItem.path;
                                    
                                    return (
                                      <Link
                                        key={subItem.path}
                                        href={subItem.path}
                                        onClick={() => {
                                          setShowProfileMenu(false);
                                          setOpenDropdowns({});
                                        }}
                                        className={`flex items-center px-4 py-1.5 text-sm transition-colors ${
                                          isSubActive
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                                        }`}
                                      >
                                        <SubIcon className="h-3.5 w-3.5 mr-3" />
                                        {subItem.name}
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }
                        
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            onClick={() => setShowProfileMenu(false)}
                            className={`flex items-center px-4 py-2 text-sm transition-colors ${
                              isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                            }`}
                          >
                            <Icon className="h-4 w-4 mr-3" />
                            {item.name}
                          </Link>
                        );
                      })}
                      
                      {/* Divider */}
                      <div className="border-t border-gray-200 my-1"></div>
                      
                      {/* Profile and Sign Out */}
                      <Link
                        href="/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Profile
                      </Link>
                <button
                        onClick={handleSignOut}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-indigo-600 font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button and profile */}
          <div className="flex items-center space-x-2 sm:hidden">
            {user && (
              <>
                <NotificationBell />
                
                {/* Points Display with Coin - Mobile */}
                <Link
                  href="/points-rules"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gray-50 text-gray-800 rounded-full hover:bg-gray-100 hover:shadow-md transition-all duration-200 shadow-sm group"
                >
                  <img 
                    src="/coin.gif" 
                    alt="Coins" 
                    className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" 
                  />
                  <span className="font-bold text-sm text-gray-800">
                    {profile?.points || 0}
                  </span>
                </Link>
              </>
            )}
                  <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-1.5 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </button>
          </div>
        </div>

        {/* Mobile menu (right drawer) */}
        <div className={`sm:hidden fixed inset-0 z-[60] ${isMenuOpen ? '' : 'pointer-events-none'}`}>
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer */}
          <div
            className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 ease-out ${
              isMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between">
              <span className="font-semibold text-gray-900">Menu</span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="pt-2 pb-3 space-y-0.5 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
              {/* User Info Section - Mobile Only */}
              {user && (
                <>
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <p className="text-base font-semibold text-gray-900">
                          {profile?.full_name || profile?.username || user.email}
                        </p>
                    <p className="text-sm text-gray-500 truncate mt-1">
                          {user.email}
                        </p>
                      </div>

                      {/* Referral Link Section - Mobile */}
                      {referralLink && (
                        <div className="px-4 py-2.5 border-b border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">Refer & Earn 250 Points</p>
                            <button
                              onClick={handleCopyReferralLink}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors flex items-center justify-center"
                              title="Copy referral link"
                            >
                              {referralCopied ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Admin Menu Section */}
                      {isAdmin && (
                        <>
                          <div className="px-4 py-2 bg-gray-50">
                            <p className="text-xs font-semibold text-gray-500 tracking-wide">Admin</p>
                          </div>
                          {adminMenuItems.filter(item => item.path).map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.path;
                            
                            return (
                              <Link
                                key={item.path}
                                href={item.path}
                            onClick={() => setIsMenuOpen(false)}
                            className={`flex items-center px-4 py-3 text-base font-medium transition-colors ${
                                  isActive
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                                }`}
                              >
                            <Icon className="h-5 w-5 mr-3" />
                                {item.name}
                              </Link>
                            );
                          })}
                          <div className="border-t border-gray-200 my-1"></div>
                        </>
                      )}
                      
                  {/* User Menu Items - Filter out Dashboard for admins */}
                  {userMenuItems
                    .filter(item => (!isAdmin || item.name !== 'Dashboard') && item.path)
                    .map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path || 
                                        (item.subItems && item.subItems.some(sub => pathname === sub.path));
                      const isDropdownOpen = openDropdowns[`mobile-menu-${item.name}`] || false;
                        
                        if (item.hasDropdown && item.subItems) {
                          return (
                            <div key={item.name}>
                              <button
                              onClick={() => toggleDropdown(`mobile-menu-${item.name}`)}
                              className={`w-full flex items-center justify-between px-4 py-3 text-base font-medium transition-colors ${
                                  isActive
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                                }`}
                              >
                                <div className="flex items-center">
                                <Icon className="h-5 w-5 mr-3" />
                                  {item.name}
                                </div>
                              <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>
                              
                              {isDropdownOpen && (
                              <div className="ml-4 mt-1 space-y-0.5">
                                  {item.subItems.filter(subItem => subItem.path).map((subItem) => {
                                    const SubIcon = subItem.icon;
                                    const isSubActive = pathname === subItem.path;
                                    
                                    return (
                                      <Link
                                        key={subItem.path}
                                        href={subItem.path}
                                        onClick={() => {
                                          setIsMenuOpen(false);
                                          setOpenDropdowns({});
                                        }}
                                      className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
                                          isSubActive
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                                        }`}
                                      >
                                      <SubIcon className="h-4 w-4 mr-3" />
                                        {subItem.name}
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }
                        
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center px-4 py-3 text-base font-medium transition-colors ${
                              isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                            }`}
                          >
                          <Icon className="h-5 w-5 mr-3" />
                            {item.name}
                          </Link>
                        );
                      })}
                      
                      <div className="border-t border-gray-200 my-1"></div>
                      
                  {/* Profile */}
                      <Link
                        href="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                      >
                        <User className="h-5 w-5 mr-3" />
                        Profile
                      </Link>

                      {/* Edit Profile */}
                      <Link
                        href="/profile/edit"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                      >
                        <Settings className="h-5 w-5 mr-3" />
                        Edit Profile
                      </Link>
                  
                  <div className="border-t border-gray-200 my-2"></div>
              </>
            )}

              {/* Navigation Links */}
              <Link
                href="/companies"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
              >
                <Building2 className="h-5 w-5 mr-3" />
                MLM Companies
              </Link>
              <Link
                href="/blog"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-5 w-5 mr-3" />
                Blog
              </Link>
              <Link
                href="/news"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
              >
                <Newspaper className="h-5 w-5 mr-3" />
                News
              </Link>
              <Link
                href="/classifieds"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="h-5 w-5 mr-3" />
                Classifieds
              </Link>
              
              {/* Direct Sellers Dropdown - Mobile */}
              <div>
                <button
                  onClick={() => toggleDropdown('mobile-direct-sellers')}
                  className="w-full flex items-center justify-between px-4 py-3 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <UserCheck className="h-5 w-5 mr-3" />
                    Direct Sellers
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openDropdowns['mobile-direct-sellers'] ? 'rotate-180' : ''}`} />
                </button>
                {openDropdowns['mobile-direct-sellers'] && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    <Link
                      href="/direct-sellers"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setOpenDropdowns({});
                      }}
                      className="flex items-center px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                    >
                      <UserCheck className="h-4 w-4 mr-3" />
                      Find Direct Sellers
                    </Link>
                    <Link
                      href="/recommended-direct-sellers"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setOpenDropdowns({});
                      }}
                      className="flex items-center px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                    >
                      <UserCircle className="h-5 w-5 mr-3 stroke-2" />
                      Recommended Direct Sellers
                    </Link>
                  </div>
                )}
              </div>
              {user && (
                <Link
                  href="/messages"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
                >
                  <MessageSquare className="h-5 w-5 mr-3" />
                  Messages
                </Link>
              )}
              
              {!user && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-3 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md mx-4"
                  >
                    Sign Up
                  </Link>
                </>
              )}
              
              {/* Sign Out - Bottom */}
              {user && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}