import React from 'react';
import Link from 'next/link';
import { Trophy, DollarSign, Building2, Star, Award, TrendingUp, ChevronRight, CheckCircle } from 'lucide-react';

export function PromotionalCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
      {/* Top Earners Spotlight Card */}
      <div className="bg-gradient-to-br from-indigo-700 to-blue-700 rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:scale-105">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Trophy className="h-8 w-8 text-yellow-300" />
            <div className="bg-indigo-800 bg-opacity-50 px-2 py-1 rounded-full text-xs font-medium text-white">
              Success Stories
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Top Earners Spotlight</h3>
          <p className="text-indigo-100 mb-4">
            Discover how top performers are earning $10,000+ monthly in network marketing.
          </p>
          
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm text-white">7-figure earners</span>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm text-white">Success strategies</span>
          </div>
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm text-white">Verified income reports</span>
          </div>
          
          <Link 
            href="/top-earners"
            className="inline-flex items-center justify-between w-full px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-white font-medium transition-colors"
          >
            <span>Discover Top Performers</span>
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
        
        {/* Visual elements */}
        <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-yellow-400 bg-opacity-20 -z-10"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full bg-blue-400 bg-opacity-20 -z-10"></div>
      </div>

      {/* Premium Seller Card */}
      <div className="bg-gradient-to-br from-yellow-600 to-amber-500 rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:scale-105 relative">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover opacity-10"></div>
        
        <div className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 text-white" />
            <div className="bg-yellow-800 bg-opacity-50 px-2 py-1 rounded-full text-xs font-medium text-white">
              Limited Time Offer
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Upgrade to Premium Seller</h3>
          <p className="text-yellow-100 mb-4">
            Stand out from the crowd with exclusive premium seller benefits.
          </p>
          
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="h-5 w-5 text-white" />
            <span className="text-sm text-white">Income verification badge</span>
          </div>
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="h-5 w-5 text-white" />
            <span className="text-sm text-white">Featured in premium listings</span>
          </div>
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="h-5 w-5 text-white" />
            <span className="text-sm text-white">Priority in search results</span>
          </div>
          <div className="flex items-center space-x-2 mb-6">
            <CheckCircle className="h-5 w-5 text-white" />
            <span className="text-sm text-white">Unlimited connections</span>
          </div>
          
          <Link 
            href="/income-verification"
            className="inline-flex items-center justify-between w-full px-4 py-2 bg-white text-yellow-700 hover:bg-yellow-50 rounded-lg font-medium transition-colors"
          >
            <span>Become Premium</span>
            <Star className="h-5 w-5" />
          </Link>
        </div>
        
        {/* Shine effect */}
        <div className="absolute -top-10 -left-10 w-20 h-60 bg-white opacity-10 rotate-12 transform-gpu animate-shine"></div>
      </div>

      {/* MLM Companies Card */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:scale-105">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Building2 className="h-8 w-8 text-indigo-600" />
            <div className="bg-indigo-100 px-2 py-1 rounded-full text-xs font-medium text-indigo-800">
              Verified Companies
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Leading MLM Companies</h3>
          <p className="text-gray-600 mb-4">
            Explore legitimate network marketing opportunities with top-rated companies.
          </p>
          
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-gray-100 rounded-md p-2 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-800">Herbalife</span>
            </div>
            <div className="bg-gray-100 rounded-md p-2 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-800">Amway</span>
            </div>
            <div className="bg-gray-100 rounded-md p-2 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-800">Avon</span>
            </div>
            <div className="bg-gray-100 rounded-md p-2 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-800">doTERRA</span>
            </div>
            <div className="bg-gray-100 rounded-md p-2 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-800">Jeunesse</span>
            </div>
            <div className="bg-gray-100 rounded-md p-2 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-800">+100 more</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
            <div className="flex items-center">
              <Award className="h-4 w-4 mr-1 text-indigo-600" />
              <span>Verified Reviews</span>
            </div>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
              <span>Growth Metrics</span>
            </div>
          </div>
          
          <Link 
            href="/companies"
            className="inline-flex items-center justify-between w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-colors"
          >
            <span>Explore Opportunities</span>
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}