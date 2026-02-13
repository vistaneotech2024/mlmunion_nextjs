// Global Skeleton Loader Components
// Centralized skeleton loaders for consistent loading states across the app
import React from 'react';

// Classified Card Skeleton
export function ClassifiedSkeleton() {
  return (
    <div className="bg-white shadow-md overflow-hidden h-full flex flex-col animate-pulse">
      <div className="w-full h-40 sm:h-44 md:h-48 lg:h-40 bg-gray-200"></div>
      <div className="p-3 md:p-4 lg:p-6 flex flex-col flex-grow">
        <div className="mb-2 md:mb-3 flex items-center gap-2">
          <div className="h-3 w-20 bg-gray-200 rounded"></div>
          <div className="h-4 w-16 bg-gray-200 rounded-full"></div>
        </div>
        <div className="mb-2 md:mb-3">
          <div className="h-5 w-full bg-gray-200 rounded mb-2"></div>
          <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
        </div>
        <div className="mb-3 md:mb-4 flex-grow space-y-2">
          <div className="h-3 w-full bg-gray-200 rounded"></div>
          <div className="h-3 w-full bg-gray-200 rounded"></div>
          <div className="h-3 w-2/3 bg-gray-200 rounded"></div>
        </div>
        <div className="hidden sm:flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="h-4 w-12 bg-gray-200 rounded"></div>
            <div className="h-4 w-12 bg-gray-200 rounded"></div>
            <div className="h-4 w-10 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
        </div>
        <div className="mt-auto hidden sm:block">
          <div className="h-8 w-full bg-gray-200 rounded-md"></div>
        </div>
        <div className="mt-auto sm:hidden">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

// Classifieds List Skeleton
export function ClassifiedsListSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ClassifiedSkeleton key={index} />
      ))}
    </div>
  );
}

// User Classified Card Skeleton
export function UserClassifiedSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col animate-pulse">
      <div className="relative h-32 sm:h-40 lg:h-48 bg-gray-200">
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          <div className="h-5 w-16 bg-gray-300 rounded"></div>
          <div className="h-5 w-20 bg-gray-300 rounded"></div>
        </div>
      </div>
      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        <div className="mb-2">
          <div className="h-5 w-full bg-gray-200 rounded mb-1"></div>
          <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
        </div>
        <div className="mb-3 flex-grow">
          <div className="h-3 w-full bg-gray-200 rounded mb-1"></div>
          <div className="h-3 w-2/3 bg-gray-200 rounded"></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-gray-100">
          <div className="h-3 w-12 bg-gray-200 rounded"></div>
          <div className="h-3 w-1 bg-gray-200 rounded"></div>
          <div className="h-3 w-20 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-8 w-full bg-gray-200 rounded-md"></div>
          <div className="flex gap-2">
            <div className="h-8 flex-1 bg-gray-200 rounded-md"></div>
            <div className="h-8 flex-1 bg-gray-200 rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// User Classifieds List Skeleton
export function UserClassifiedsListSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <UserClassifiedSkeleton key={index} />
      ))}
    </div>
  );
}

// Classified Detail Page Skeleton
export function ClassifiedDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-6 md:pb-12">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        {/* Back button skeleton */}
        <div className="h-6 w-32 bg-gray-200 rounded mb-3 md:mb-4 animate-pulse"></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <article className="bg-white shadow-xl overflow-hidden border border-indigo-50 animate-pulse">
              {/* Image skeleton */}
              <div className="h-48 sm:h-64 md:h-96 bg-gray-200"></div>
              
              <div className="p-3 md:p-4 lg:p-6 xl:p-8">
                {/* Title skeleton */}
                <div className="mb-3 md:mb-4">
                  <div className="h-8 w-full bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 w-3/4 bg-gray-200 rounded"></div>
                </div>
                
                {/* Meta info skeleton */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6 pb-4 md:pb-6 border-b border-gray-100">
                  <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded-full"></div>
                  <div className="h-4 w-20 bg-gray-200 rounded"></div>
                </div>
                
                {/* Description skeleton */}
                <div className="mb-4 md:mb-6 space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
                  <div className="h-4 w-4/5 bg-gray-200 rounded"></div>
                </div>
                
                {/* Button skeleton */}
                <div className="h-10 w-40 bg-gray-200 rounded-lg mb-4 md:mb-6"></div>
                
                {/* Actions skeleton */}
                <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-gray-100">
                  <div className="flex gap-3 md:gap-4">
                    <div className="h-10 w-20 bg-gray-200 rounded-full"></div>
                    <div className="h-10 w-20 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            </article>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-3 md:space-y-4 lg:space-y-6">
            {/* Advertiser card skeleton */}
            <div className="bg-white shadow-lg p-3 md:p-4 lg:p-6 border border-indigo-50 animate-pulse">
              <div className="h-6 w-40 bg-gray-200 rounded mb-3 md:mb-4"></div>
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-32 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="h-10 w-full bg-gray-200 rounded-lg"></div>
            </div>
            
            {/* Safety tips skeleton */}
            <div className="bg-white shadow-lg p-3 md:p-4 lg:p-6 border border-indigo-50 animate-pulse">
              <div className="h-6 w-32 bg-gray-200 rounded mb-3 md:mb-4"></div>
              <div className="space-y-2 md:space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start">
                    <div className="h-4 w-4 rounded-full bg-gray-200 mr-2"></div>
                    <div className="h-4 flex-1 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generic Page Skeleton
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center animate-pulse">
      <div className="text-center">
        <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto mb-4"></div>
        <div className="h-4 w-32 bg-gray-200 rounded mx-auto"></div>
      </div>
    </div>
  );
}

// Card Grid Skeleton
export function CardGridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: 1 | 2 | 3 | 4 }) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };
  
  return (
    <div className={`grid ${gridCols[cols]} gap-4`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="h-40 bg-gray-200 rounded mb-4"></div>
          <div className="h-5 w-full bg-gray-200 rounded mb-2"></div>
          <div className="h-5 w-3/4 bg-gray-200 rounded mb-4"></div>
          <div className="h-3 w-full bg-gray-200 rounded mb-1"></div>
          <div className="h-3 w-5/6 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}

// News Card Skeleton (Grid View)
export function NewsCardSkeleton() {
  return (
    <article className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden animate-pulse">
      <div className="relative h-40 sm:h-44 md:h-48 bg-gray-200">
        <div className="absolute top-2 md:top-3 left-2 md:left-3">
          <div className="h-6 w-20 bg-gray-300 rounded-full"></div>
        </div>
      </div>
      <div className="p-3 md:p-4 lg:p-5">
        <div className="h-5 w-full bg-gray-200 rounded mb-2"></div>
        <div className="h-5 w-3/4 bg-gray-200 rounded mb-3"></div>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
          <div className="h-4 w-1 bg-gray-200 rounded"></div>
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
        </div>
        <div className="h-4 w-full bg-gray-200 rounded mb-1"></div>
        <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
      </div>
    </article>
  );
}

// News List Skeleton (Card View)
export function NewsListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-0 bg-white">
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>
          <article className="group bg-white hover:bg-gray-50 transition-colors animate-pulse">
            <div className="flex flex-col sm:flex-row gap-2 md:gap-4 p-2 md:p-3">
              <div className="flex-shrink-0 w-full sm:w-32 h-32 md:w-40 md:h-40 bg-gray-200 rounded"></div>
              <div className="flex-1 min-w-0">
                <div className="h-3 w-24 bg-gray-200 rounded mb-2"></div>
                <div className="h-5 w-full bg-gray-200 rounded mb-2"></div>
                <div className="h-5 w-3/4 bg-gray-200 rounded mb-3"></div>
                <div className="space-y-2 mb-3">
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                </div>
                <div className="h-3 w-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </article>
          {index < count - 1 && <hr className="border-gray-200" />}
        </React.Fragment>
      ))}
    </div>
  );
}

// News Grid Skeleton
export function NewsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <NewsCardSkeleton key={index} />
      ))}
    </div>
  );
}

// News Detail Page Skeleton
export function NewsDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white py-2 md:py-4">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 animate-pulse">
            {/* Back button */}
            <div className="h-6 w-24 bg-gray-200 rounded mb-3 md:mb-4"></div>
            
            {/* Image */}
            <div className="h-64 md:h-96 bg-gray-200 rounded-lg mb-4 md:mb-6"></div>
            
            {/* Title */}
            <div className="mb-3 md:mb-4">
              <div className="h-8 w-full bg-gray-200 rounded mb-2"></div>
              <div className="h-8 w-4/5 bg-gray-200 rounded"></div>
            </div>
            
            {/* Author info */}
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-200"></div>
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
            
            {/* Content */}
            <div className="space-y-3 mb-4 md:mb-6">
              <div className="h-4 w-full bg-gray-200 rounded"></div>
              <div className="h-4 w-full bg-gray-200 rounded"></div>
              <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-gray-200">
              <div className="flex gap-4">
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                <div className="h-6 w-12 bg-gray-200 rounded"></div>
              </div>
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4 animate-pulse">
              <div className="h-6 w-40 bg-gray-200 rounded mb-3 md:mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-2 md:p-3 border border-gray-200 rounded-lg">
                    <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                    <div className="h-24 md:h-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-full bg-gray-200 rounded mb-1"></div>
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-1"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Blog Detail Page Skeleton (similar to News Detail)
export function BlogDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white py-2 md:py-4">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 animate-pulse">
            {/* Back button */}
            <div className="h-6 w-24 bg-gray-200 rounded mb-3 md:mb-4"></div>
            
            {/* Title */}
            <div className="mb-3 md:mb-4">
              <div className="h-8 w-full bg-gray-200 rounded mb-2"></div>
              <div className="h-8 w-4/5 bg-gray-200 rounded"></div>
            </div>
            
            {/* Author info */}
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <div className="w-10 h-10 rounded-full bg-gray-200"></div>
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
            
            {/* Cover image */}
            <div className="h-48 sm:h-64 md:h-96 bg-gray-200 rounded-lg mb-4 md:mb-6"></div>
            
            {/* Content */}
            <div className="space-y-3 mb-4 md:mb-6">
              <div className="h-4 w-full bg-gray-200 rounded"></div>
              <div className="h-4 w-full bg-gray-200 rounded"></div>
              <div className="h-4 w-full bg-gray-200 rounded"></div>
              <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
              <div className="h-4 w-4/5 bg-gray-200 rounded"></div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-gray-200">
              <div className="flex gap-4">
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                <div className="h-6 w-20 bg-gray-200 rounded"></div>
              </div>
              <div className="h-8 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-3 md:p-4 lg:p-6 lg:sticky lg:top-4 animate-pulse">
              <div className="h-6 w-32 bg-gray-200 rounded mb-4 md:mb-6"></div>
              <div className="flex flex-wrap gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 w-20 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-2 md:p-3 border border-gray-200 rounded-lg">
                    <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                    <div className="h-24 md:h-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-full bg-gray-200 rounded mb-1"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Blog Card Skeleton
export function BlogCardSkeleton() {
  return (
    <article className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse h-full flex flex-col">
      <div className="h-32 sm:h-36 bg-gray-200"></div>
      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        <div className="h-3 w-20 bg-gray-200 rounded mb-1.5"></div>
        <div className="h-4 sm:h-5 w-full bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
        <div className="space-y-1.5 mb-3 flex-grow">
          <div className="h-3 w-full bg-gray-200 rounded"></div>
          <div className="h-3 w-5/6 bg-gray-200 rounded"></div>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <div className="h-3 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    </article>
  );
}

// Blog List Skeleton
export function BlogListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <BlogCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Hero Banner Skeleton
export function HeroSkeleton() {
  return (
    <div className="h-[400px] sm:h-[500px] md:h-[600px] bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 to-indigo-900/70 flex items-center justify-center px-4 sm:px-6">
        <div className="text-center text-white max-w-4xl w-full">
          <div className="h-12 sm:h-16 md:h-20 lg:h-24 xl:h-28 w-3/4 mx-auto bg-white/20 rounded-lg mb-4 sm:mb-6"></div>
          <div className="h-6 sm:h-8 md:h-10 lg:h-12 w-2/3 mx-auto bg-white/15 rounded-lg mb-6 sm:mb-8"></div>
          <div className="h-12 sm:h-14 md:h-16 w-48 sm:w-64 mx-auto bg-white/25 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

// User Blogs List Skeleton (for My Blog page)
export function UserBlogsListSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
          {/* Image skeleton */}
          <div className="relative h-32 sm:h-40 lg:h-48 bg-gray-200"></div>
          
          {/* Content skeleton */}
          <div className="p-3 sm:p-4">
            <div className="h-5 w-full bg-gray-200 rounded mb-2"></div>
            <div className="h-5 w-3/4 bg-gray-200 rounded mb-3"></div>
            <div className="space-y-2 mb-3">
              <div className="h-3 w-full bg-gray-200 rounded"></div>
              <div className="h-3 w-full bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 w-20 bg-gray-200 rounded mb-3"></div>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
              <div className="h-3 w-16 bg-gray-200 rounded"></div>
              <div className="h-3 w-20 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-9 w-full bg-gray-200 rounded"></div>
              <div className="flex gap-2">
                <div className="h-9 flex-1 bg-gray-200 rounded"></div>
                <div className="h-9 flex-1 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Company Card Skeleton
export function CompanyCardSkeleton() {
  return (
    <div className="bg-white shadow-md overflow-hidden hover:shadow-xl transition-all duration-200 border border-gray-200 flex flex-col h-full animate-pulse">
      <div className="p-3 md:p-4 flex flex-col flex-grow">
        <div className="w-16 h-16 md:w-20 md:h-20 mb-2 md:mb-3 bg-gray-200 rounded"></div>
        <div className="h-5 md:h-6 w-full bg-gray-200 rounded mb-1.5 md:mb-2"></div>
        <div className="h-4 w-3/4 bg-gray-200 rounded mb-2 md:mb-3"></div>
        <div className="flex items-center mb-2 md:mb-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-3 h-3 md:w-3.5 md:h-3.5 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="ml-1 md:ml-1.5 h-3 w-8 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-1 mb-2 md:mb-3 flex-grow">
          <div className="h-3 w-2/3 bg-gray-200 rounded"></div>
          <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
          <div className="h-3 w-2/3 bg-gray-200 rounded"></div>
        </div>
        <div className="mt-auto h-8 md:h-9 w-full bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

// Companies List Skeleton
export function CompaniesListSkeleton({ count = 16 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <CompanyCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Company Detail Skeleton
export function CompanyDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          {/* Company Header */}
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-200 rounded"></div>
            <div className="flex-1">
              <div className="h-8 w-3/4 bg-gray-200 rounded mb-3"></div>
              <div className="flex gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-6 h-6 bg-gray-200 rounded"></div>
                ))}
                <div className="h-6 w-16 bg-gray-200 rounded ml-2"></div>
              </div>
              <div className="h-4 w-1/2 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3 mb-6">
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                <div className="h-5 w-24 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>

          {/* Reviews Section */}
          <div className="border-t pt-6">
            <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-b pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 rounded mb-1"></div>
                      <div className="h-3 w-20 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="h-3 w-full bg-gray-200 rounded"></div>
                    <div className="h-3 w-5/6 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

