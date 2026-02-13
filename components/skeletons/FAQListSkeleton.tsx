export function FAQListSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-8">
            {/* Title skeleton */}
            <div className="h-9 w-80 bg-gray-200 rounded mb-6 animate-pulse"></div>

            {/* Category Filter skeleton */}
            <div className="mb-8">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-9 w-20 bg-gray-200 rounded-full animate-pulse"
                  ></div>
                ))}
              </div>
            </div>

            {/* FAQs skeleton */}
            <div className="space-y-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                  {/* Question skeleton */}
                  <div className="h-6 w-3/4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  {/* Answer skeleton */}
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
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
