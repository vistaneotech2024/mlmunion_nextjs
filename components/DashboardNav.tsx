'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ProfileImage } from './ProfileImage';
import {
  BarChart3,
  Users,
  Settings,
  FileText,
  MessageSquare,
  Building2,
  Newspaper,
  UserCheck,
  Mail,
  HelpCircle,
  LayoutDashboard,
  Trophy,
  DollarSign,
  ChevronDown,
  LogOut,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  image_url: string;
  is_admin: boolean;
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

export function DashboardNav() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [showAdminMenu, setShowAdminMenu] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      void loadProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, image_url, is_admin')
        .eq('id', user?.id)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error('Error signing out');
    }
  };

  const isAdmin = profile?.is_admin || false;

  const [openDropdowns, setOpenDropdowns] = React.useState<{ [key: string]: boolean }>({});

  const toggleDropdown = (key: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // User menu items (moved to user dropdown)
  const userMenuItems: MenuItem[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: BarChart3,
    },
    {
      name: 'Connections',
      path: '/connections',
      icon: Users,
    },
    {
      name: 'Blog',
      path: '/blog',
      icon: FileText,
      hasDropdown: true,
      subItems: [
        {
          name: 'Write Blog',
          path: '/blog/new',
          icon: FileText,
        },
        {
          name: 'My Blogs',
          path: '/dashboard?tab=blogs',
          icon: FileText,
        },
      ]
    },
    {
      name: 'Classifieds',
      path: '/classifieds',
      icon: MessageSquare,
      hasDropdown: true,
      subItems: [
        {
          name: 'Manage Classifieds',
          path: '/admin/classifieds',
          icon: MessageSquare,
        },
        {
          name: 'My Classifieds',
          path: '/dashboard?tab=classifieds',
          icon: MessageSquare,
        },
      ]
    },
  ];

  const adminMenuItems = [
    {
      name: 'Admin Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Companies',
      path: '/admin/companies',
      icon: Building2,
    },
    {
      name: 'Blogs',
      path: '/admin/blogs',
      icon: FileText,
    },
    {
      name: 'News',
      path: '/admin/news',
      icon: Newspaper,
    },
    {
      name: 'Classifieds',
      path: '/admin/classifieds',
      icon: MessageSquare,
    },
    {
      name: 'Direct Sellers',
      path: '/admin/direct-sellers',
      icon: UserCheck,
    },
    {
      name: 'Users',
      path: '/admin/users',
      icon: Users,
    },
    {
      name: 'Messages',
      path: '/admin/messages',
      icon: MessageSquare,
    },
    {
      name: 'FAQ',
      path: '/admin/faq',
      icon: HelpCircle,
    }
  ];

  const effectiveUserMenuItems = React.useMemo(() => {
    if (!isAdmin) return userMenuItems;

    // Admins should not see links that go to the non-admin dashboard (or its tabs)
    return userMenuItems
      .filter(item => !item.path.startsWith('/dashboard'))
      .map(item => {
        if (!item.subItems) return item;
        return {
          ...item,
          subItems: item.subItems.filter(sub => !sub.path.startsWith('/dashboard'))
        };
      });
  }, [isAdmin, userMenuItems]);

  // Don't render if user is not logged in
  if (!user) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Right side - User menu */}
          <div className="flex items-center justify-end space-x-3">
            {/* Admin Menu Dropdown */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className={`flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname.startsWith('/admin')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5 mr-1" />
                  Admin
                  <ChevronDown className="h-3 w-3 ml-1" />
                </button>

                {showAdminMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    {adminMenuItems.filter(item => item.path).map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.path;
                      
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          onClick={() => setShowAdminMenu(false)}
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
                  </div>
                )}
              </div>
            )}

            {/* User Profile Dropdown - Hidden, merged into Header */}
            {/* Profile icon is now in the main Header component */}
          </div>
      </div>

      {/* Mobile Menu (right drawer) */}
      <div className={`md:hidden fixed inset-0 z-[60] ${isMobileMenuOpen ? '' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between">
            <span className="font-semibold text-gray-900">Menu</span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              aria-label="Close menu"
            >
                <X className="h-5 w-5" />
            </button>
      </div>

          <div className="px-4 pt-2 pb-3 space-y-1 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
            {effectiveUserMenuItems.filter(item => item.path).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || 
                              (item.subItems && item.subItems.some(sub => pathname === sub.path));
              const isDropdownOpen = openDropdowns[`mobile-${item.name}`] || false;
              
              if (item.hasDropdown && item.subItems) {
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleDropdown(`mobile-${item.name}`)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium ${
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
                      <div className="ml-6 mt-1 space-y-1">
                        {item.subItems.filter(subItem => subItem.path).map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = pathname === subItem.path;
                          
                          return (
                            <Link
                              key={subItem.path}
                              href={subItem.path}
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                setOpenDropdowns({});
                              }}
                              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
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
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
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
            
            {isAdmin && (
              <>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Admin
                </div>
                {adminMenuItems.filter(item => item.path).map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
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
              </>
            )}
            
            <div className="border-t border-gray-200 my-2"></div>
            <Link
              href="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-5 w-5 mr-3" />
              Edit Profile
            </Link>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleSignOut();
              }}
              className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Click outside to close menus */}
      {(showAdminMenu || Object.keys(openDropdowns).some(key => openDropdowns[key])) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowAdminMenu(false);
            setOpenDropdowns({});
          }}
        />
      )}
    </nav>
  );
}

