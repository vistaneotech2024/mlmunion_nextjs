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
  Award,
  Building2,
  Newspaper,
  UserCheck,
  File,
  Mail,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  PanelLeft,
  PanelRight,
  Trophy,
  Star,
  Medal,
  Crown,
  DollarSign,
  TrendingUp,
  CheckCircle,
  FileSpreadsheet,
  FileBarChart,
  FileCheck,
  Download
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  image_url: string;
  is_admin: boolean;
}

export function DashboardSidebar({ collapsed, toggleSidebar }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isPageManagementOpen, setIsPageManagementOpen] = React.useState(false);
  const [isPointsManagementOpen, setIsPointsManagementOpen] = React.useState(false);
  const [isPremiumSellerOpen, setIsPremiumSellerOpen] = React.useState(false);
  const [isTopEarnersOpen, setIsTopEarnersOpen] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  React.useEffect(() => {
    // Check if current path is related to page management
    if (pathname.includes('/admin/pages')) {
      setIsPageManagementOpen(true);
    }
    
    // Check if current path is related to points management
    if (pathname.includes('/admin/points') || 
        pathname.includes('/admin/badges') || 
        pathname.includes('/admin/ranks')) {
      setIsPointsManagementOpen(true);
    }
    
    // Check if current path is related to premium sellers
    if (pathname.includes('/admin/premium-sellers')) {
      setIsPremiumSellerOpen(true);
    }
    
    // Check if current path is related to top earners
    if (pathname.includes('/admin/top-earners')) {
      setIsTopEarnersOpen(true);
    }
  }, [pathname]);

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

  const isAdmin = profile?.is_admin || false;

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: BarChart3,
      admin: false
    }
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

  const pageManagementItems = [
    {
      name: 'All Pages',
      path: '/admin/pages',
      icon: File,
    },
    {
      name: 'Add New Page',
      path: '/admin/pages?action=new',
      icon: FileText,
    },
    {
      name: 'Hero Banners',
      path: '/admin/hero-banners',
      icon: Award,
    }
  ];
  
  const pointsManagementItems = [
    {
      name: 'Points Activities',
      path: '/admin/points',
      icon: Trophy,
    },
    {
      name: 'Badges',
      path: '/admin/badges',
      icon: Medal,
    },
    {
      name: 'Ranks',
      path: '/admin/ranks',
      icon: Crown,
    }
  ];
  
  const premiumSellerItems = [
    {
      name: 'Applications',
      path: '/admin/premium-sellers/applications',
      icon: FileCheck,
    },
    {
      name: 'Active Sellers',
      path: '/admin/premium-sellers/active',
      icon: CheckCircle,
    },
    {
      name: 'Performance Metrics',
      path: '/admin/premium-sellers/metrics',
      icon: TrendingUp,
    },
    {
      name: 'Settings',
      path: '/admin/premium-sellers/settings',
      icon: Settings,
    }
  ];
  
  const topEarnersItems = [
    {
      name: 'Data Submissions',
      path: '/admin/top-earners/submissions',
      icon: FileText,
    },
    {
      name: 'Approval Workflow',
      path: '/admin/top-earners/approvals',
      icon: CheckCircle,
    },
    {
      name: 'Reports',
      path: '/admin/top-earners/reports',
      icon: FileSpreadsheet,
      subItems: [
        {
          name: 'Performance Reports',
          path: '/admin/top-earners/reports/performance',
          icon: FileBarChart,
        },
        {
          name: 'Earnings Reports',
          path: '/admin/top-earners/reports/earnings',
          icon: DollarSign,
        },
        {
          name: 'Compliance Reports',
          path: '/admin/top-earners/reports/compliance',
          icon: FileCheck,
        },
        {
          name: 'Export Data',
          path: '/admin/top-earners/reports/export',
          icon: Download,
        }
      ]
    }
  ];

  return (
    <div 
      ref={sidebarRef}
      className={`fixed h-full bg-white shadow-sm transition-all duration-300 z-20 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="h-full flex flex-col">
        {/* Profile section */}
        <div className={`p-4 ${collapsed ? 'items-center' : ''}`}>
          <div className={`${collapsed ? 'flex justify-center' : 'text-center mb-6'}`}>
            <ProfileImage
              imageUrl={profile?.image_url}
              username={profile?.username || ''}
              fullName={collapsed ? undefined : profile?.full_name}
              size={collapsed ? "md" : "lg"}
              showInfo={!collapsed}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <nav className="px-2 space-y-1">
            {!isAdmin &&
              menuItems.filter(item => item.path).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                    } transition-colors`}
                  >
                    <div className="flex items-center">
                      <Icon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
                      {!collapsed && <span>{item.name}</span>}
                    </div>
                  </Link>
                );
              })}

            {isAdmin && (
              <>
                <div className={`mt-6 mb-2 ${collapsed ? 'text-center' : 'px-3'}`}>
                  <div className={`${collapsed ? 'border-b pb-2' : 'text-xs font-semibold text-gray-500 tracking-wider'}`}>
                    {!collapsed && 'Admin'}
                  </div>
                </div>

                {/* Premium Seller Management Section with dropdown */}
                <div>
                  <button
                    onClick={() => setIsPremiumSellerOpen(!isPremiumSellerOpen)}
                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors ${
                      pathname.includes('/admin/premium-sellers')
                        ? 'bg-indigo-50 text-indigo-700'
                        : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <DollarSign className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
                      {!collapsed && <span>Premium Sellers</span>}
                    </div>
                    {!collapsed && (
                      isPremiumSellerOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    )}
                  </button>

                  {/* Premium Seller Management Dropdown items */}
                  {isPremiumSellerOpen && !collapsed && (
                    <div className="ml-6 mt-1 space-y-1">
                      {premiumSellerItems.filter(item => item.path).map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path;
                        
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center p-2 rounded-lg ${
                              isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                            } transition-colors`}
                          >
                            <Icon className="h-4 w-4 mr-3" />
                            <span className="text-sm">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Top Earners Management Section with dropdown */}
                <div>
                  <button
                    onClick={() => setIsTopEarnersOpen(!isTopEarnersOpen)}
                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors ${
                      pathname.includes('/admin/top-earners')
                        ? 'bg-indigo-50 text-indigo-700'
                        : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <Trophy className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
                      {!collapsed && <span>Top Earners</span>}
                    </div>
                    {!collapsed && (
                      isTopEarnersOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    )}
                  </button>

                  {/* Top Earners Management Dropdown items */}
                  {isTopEarnersOpen && !collapsed && (
                    <div className="ml-6 mt-1 space-y-1">
                      {topEarnersItems.filter(item => item.path).map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path;
                        
                        return (
                          <div key={item.path}>
                            <Link
                              href={item.path}
                              className={`flex items-center p-2 rounded-lg ${
                                isActive
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                              } transition-colors`}
                            >
                              <Icon className="h-4 w-4 mr-3" />
                              <span className="text-sm">{item.name}</span>
                              {item.subItems && (
                                <ChevronRight className="h-4 w-4 ml-auto" />
                              )}
                            </Link>
                            
                            {/* Render sub-items if they exist */}
                            {item.subItems && pathname.includes(item.path) && (
                              <div className="ml-4 mt-1 space-y-1">
                                {item.subItems.filter(subItem => subItem.path).map((subItem) => {
                                  const SubIcon = subItem.icon;
                                  const isSubActive = pathname === subItem.path;
                                  
                                  return (
                                    <Link
                                      key={subItem.path}
                                      href={subItem.path}
                                      className={`flex items-center p-2 rounded-lg ${
                                        isSubActive
                                          ? 'bg-indigo-50 text-indigo-700'
                                          : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                                      } transition-colors`}
                                    >
                                      <SubIcon className="h-4 w-4 mr-3" />
                                      <span className="text-sm">{subItem.name}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Points Management Section with dropdown */}
                <div>
                  <button
                    onClick={() => setIsPointsManagementOpen(!isPointsManagementOpen)}
                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors ${
                      pathname.includes('/admin/points') || 
                      pathname.includes('/admin/badges') || 
                      pathname.includes('/admin/ranks')
                        ? 'bg-indigo-50 text-indigo-700'
                        : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <Trophy className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
                      {!collapsed && <span>Points & Rewards</span>}
                    </div>
                    {!collapsed && (
                      isPointsManagementOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    )}
                  </button>

                  {/* Points Management Dropdown items */}
                  {isPointsManagementOpen && !collapsed && (
                    <div className="ml-6 mt-1 space-y-1">
                      {pointsManagementItems.filter(item => item.path).map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path;
                        
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center p-2 rounded-lg ${
                              isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                            } transition-colors`}
                          >
                            <Icon className="h-4 w-4 mr-3" />
                            <span className="text-sm">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Page Management Section with dropdown */}
                <div>
                  <button
                    onClick={() => setIsPageManagementOpen(!isPageManagementOpen)}
                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors ${
                      pathname.includes('/admin/pages') || 
                      pathname.includes('/admin/hero-banners')
                        ? 'bg-indigo-50 text-indigo-700'
                        : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <File className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
                      {!collapsed && <span>Page Management</span>}
                    </div>
                    {!collapsed && (
                      isPageManagementOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    )}
                  </button>

                  {/* Dropdown items */}
                  {isPageManagementOpen && !collapsed && (
                    <div className="ml-6 mt-1 space-y-1">
                      {pageManagementItems.filter(item => item.path).map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path || 
                                        (pathname.includes(item.path) && item.path !== '/admin/pages');
                        
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center p-2 rounded-lg ${
                              isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                            } transition-colors`}
                          >
                            <Icon className="h-4 w-4 mr-3" />
                            <span className="text-sm">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Other admin menu items */}
                {adminMenuItems.filter(item => item.path).map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  
                  // Skip rendering if it's in the page management section and sidebar is not collapsed
                  if (!collapsed && pageManagementItems.some(pageItem => pageItem.path === item.path)) {
                    return null;
                  }
                  
                  // Skip rendering if it's in the points management section and sidebar is not collapsed
                  if (!collapsed && pointsManagementItems.some(pointItem => pointItem.path === item.path)) {
                    return null;
                  }
                  
                  // Skip rendering if it's in the premium seller section and sidebar is not collapsed
                  if (!collapsed && premiumSellerItems.some(sellerItem => sellerItem.path === item.path)) {
                    return null;
                  }
                  
                  // Skip rendering if it's in the top earners section and sidebar is not collapsed
                  if (!collapsed && topEarnersItems.some(earnerItem => earnerItem.path === item.path)) {
                    return null;
                  }
                  
                  return (
                          <Link
                            key={item.path}
                            href={item.path}
                      className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                      } transition-colors`}
                    >
                      <div className="flex items-center">
                        <Icon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
                        {!collapsed && <span>{item.name}</span>}
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          {!collapsed && (
            <div className="text-xs text-gray-500 text-center">
              <p>MLM Union Dashboard</p>
              <p>© {new Date().getFullYear()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}