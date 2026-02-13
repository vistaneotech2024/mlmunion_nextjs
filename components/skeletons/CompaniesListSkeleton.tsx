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

export function CompaniesListSkeleton({ count = 16 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <CompanyCardSkeleton key={index} />
      ))}
    </div>
  );
}
