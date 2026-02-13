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

export function UserClassifiedsListSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <UserClassifiedSkeleton key={index} />
      ))}
    </div>
  );
}
