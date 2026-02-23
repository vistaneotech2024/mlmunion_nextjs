'use client'

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { 
  LayoutDashboard, Building2, FileText, MessageSquare, Users, 
  LogOut, MapPin, UserCheck, Image, File, Mail, HelpCircle, 
  Newspaper, Award, Star, Settings, Tag, ChevronDown, ChevronRight,
  PanelLeft, PanelRight, Key, Menu, X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { signOut } = useAuth();
  const { collapsed: sidebarCollapsed, toggleSidebar } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [isCategoryManagementOpen, setIsCategoryManagementOpen] = React.useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    // Check if current path is related to category management
    if (pathname.includes('/admin/category-management')) {
      setIsCategoryManagementOpen(true);
    }
    // Close mobile sidebar when route changes
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      router.push('/admin/login');
    } catch (error: any) {
      toast.error('Error signing out');
    }
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/hero-banners', icon: Image, label: 'Hero Banners' },
    { path: '/admin/locations', icon: MapPin, label: 'Locations' },
    { path: '/admin/companies', icon: Building2, label: 'Companies' },
    { path: '/admin/blogs', icon: FileText, label: 'Blogs' },
    { path: '/admin/news', icon: Newspaper, label: 'News' },
    { path: '/admin/classifieds', icon: MessageSquare, label: 'Classifieds' },
    { path: '/admin/direct-sellers', icon: UserCheck, label: 'Direct Sellers' },
    { path: '/admin/users', icon: Users, label: 'User Management' },
    { path: '/admin/pages', icon: File, label: 'Pages' },
    { path: '/admin/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/admin/faq', icon: HelpCircle, label: 'FAQ' },
    { path: '/admin/points', icon: Award, label: 'Points' },
    { path: '/admin/badges', icon: Star, label: 'Badges' },
    { path: '/admin/ranks', icon: Settings, label: 'Ranks' },
    { path: '/admin/settings', icon: Key, label: 'API Settings' }
  ];

  const categorySubItems = [
    { tab: 'news', label: 'News Category' },
    { tab: 'blog', label: 'Blog Category' },
    { tab: 'classified', label: 'Classify Category' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      <div className={`lg:hidden fixed inset-0 z-[60] ${isMobileSidebarOpen ? '' : 'pointer-events-none'}`}>
        <div 
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      </div>
      
      <div className="flex">
        {/* Sidebar */}
        <div className={`
          ${sidebarCollapsed ? 'w-20 lg:w-20' : 'w-64 max-w-[85vw] lg:max-w-none lg:w-64'} 
          bg-white shadow-2xl border-l border-gray-200 h-screen flex flex-col fixed right-0 lg:left-0 lg:right-auto top-0 bottom-0 transform transition-transform duration-300 ease-out z-[70]
          ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          lg:translate-x-0 lg:shadow-sm lg:border-l-0 lg:border-r lg:border-gray-200
        `}>
          <div className="px-4 py-4 sm:px-5 sm:py-5 lg:p-6 border-b border-gray-200 flex-shrink-0 bg-white">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <Link href="/" className="hover:opacity-80 transition-opacity">
                  <h1 className="text-xl sm:text-2xl font-bold text-indigo-600 whitespace-nowrap cursor-pointer">Admin Panel</h1>
                </Link>
              )}
              {sidebarCollapsed && (
                <Link href="/" className="flex justify-center w-full hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center cursor-pointer">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                </Link>
              )}
              {/* Mobile Close Button */}
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
                aria-label="Close sidebar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto overflow-x-hidden">
            {menuItems.filter(item => item.path).map((item) => {
              const Icon = item.icon;
              // Check if current path matches or starts with the menu item path
              const isActive = pathname === item.path || 
                (item.path !== '/admin/dashboard' && pathname.startsWith(item.path + '/'));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center ${sidebarCollapsed ? 'lg:justify-center' : ''} px-6 sm:px-5 py-4 sm:py-3 text-base sm:text-sm font-medium ${
                    isActive
                      ? 'text-indigo-600 bg-indigo-50 border-r-2 border-indigo-600'
                      : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                  }`}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon className={`h-7 w-7 sm:h-6 sm:w-6 flex-shrink-0 ${sidebarCollapsed ? 'lg:mr-0' : 'mr-4'}`} />
                  <span className={`whitespace-nowrap ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                </Link>
              );
            })}
            
            {/* Category Management with Submenu */}
            {!sidebarCollapsed && (
              <div>
                <button
                  onClick={() => setIsCategoryManagementOpen(!isCategoryManagementOpen)}
                  className={`w-full flex items-center justify-between px-6 sm:px-5 py-4 sm:py-3 text-base sm:text-sm font-medium ${
                    pathname.includes('/admin/category-management')
                      ? 'text-indigo-600 bg-indigo-50 border-r-2 border-indigo-600'
                      : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center min-w-0">
                    <Tag className="h-7 w-7 sm:h-6 sm:w-6 mr-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">Category Management</span>
                  </div>
                  {isCategoryManagementOpen ? (
                    <ChevronDown className="h-6 w-6 sm:h-5 sm:w-5 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-6 w-6 sm:h-5 sm:w-5 flex-shrink-0" />
                  )}
                </button>
                {isCategoryManagementOpen && (
                  <div className="bg-gray-50">
                    {categorySubItems.filter(subItem => subItem.tab).map((subItem) => {
                      const currentTab = new URLSearchParams(location.search).get('tab');
                      const isSubActive = pathname === '/admin/category-management' && 
                        currentTab === subItem.tab;
                      return (
                        <Link
                          key={subItem.tab}
                          href={`/admin/category-management?tab=${subItem.tab}`}
                          onClick={() => setIsMobileSidebarOpen(false)}
                          className={`flex items-center px-6 sm:px-5 py-3 sm:py-2.5 pl-16 sm:pl-14 text-base sm:text-sm ${
                            isSubActive
                              ? 'text-indigo-600 bg-indigo-50 border-r-2 border-indigo-600'
                              : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
                          }`}
                        >
                          <span className="whitespace-nowrap">{subItem.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {sidebarCollapsed && (
              <Link
                href="/admin/category-management"
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`flex items-center lg:justify-center px-6 sm:px-5 py-4 sm:py-3 text-base sm:text-sm font-medium ${
                  pathname.includes('/admin/category-management')
                    ? 'text-indigo-600 bg-indigo-50 border-r-2 border-indigo-600'
                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                }`}
                title="Category Management"
              >
                <Tag className="h-7 w-7 sm:h-6 sm:w-6 lg:mr-0 mr-4 flex-shrink-0" />
                <span className="lg:hidden whitespace-nowrap">Category Management</span>
              </Link>
            )}
            <div className="mt-auto border-t border-gray-200 pt-2 pb-2">
              <button
                onClick={handleSignOut}
                className={`w-full flex items-center ${sidebarCollapsed ? 'lg:justify-center' : ''} px-6 sm:px-5 py-4 sm:py-3 text-base sm:text-sm font-medium text-red-600 hover:bg-red-50`}
                title={sidebarCollapsed ? 'Sign Out' : ''}
              >
                <LogOut className={`h-7 w-7 sm:h-6 sm:w-6 flex-shrink-0 ${sidebarCollapsed ? 'lg:mr-0' : 'mr-4'}`} />
                <span className={`whitespace-nowrap ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Sign Out</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
          {/* Top bar with toggle button - Sticky */}
          <div className="bg-white shadow-sm p-3 sm:p-4 flex justify-between items-center sticky top-0 z-40 w-full">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile Hamburger Button - Sticky */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
              {/* Desktop Toggle Button */}
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label="Toggle sidebar"
              >
                {sidebarCollapsed ? (
                  <PanelRight className="h-5 w-5" />
                ) : (
                  <PanelLeft className="h-5 w-5" />
                )}
              </button>
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
                {pathname.split('/').pop()?.replace(/^\w/, c => c.toUpperCase()) || 'Dashboard'}
              </h1>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}