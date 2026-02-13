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
