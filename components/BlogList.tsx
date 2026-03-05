import React from 'react';
import Link from 'next/link';
import { Clock, User, Eye, ArrowRight, ThumbsUp, ThumbsDown, Share2 } from 'lucide-react';
import { SocialShare } from './SocialShare';

interface Blog {
  id: string;
  title: string;
  content: string;
  created_at: string;
  category?: string;
  author: {
    username: string;
  };
  view_count?: number;
  likes?: number;
  dislikes?: number;
  slug: string;
  cover_image?: string;
}

export function BlogList({ blogs }: { blogs: Blog[] }) {
  if (blogs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No blog posts found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
      {blogs.map((blog) => {
        if (!blog.slug) {
          console.error('Blog missing slug:', blog.id);
          return null;
        }
        return (
        <Link key={blog.id} href={`/blog/${blog.slug || blog.id}`} className="group">
          <article className="bg-white shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            <div className="relative w-full h-40 sm:h-44 md:h-48 overflow-hidden">
              {blog.cover_image ? (
                <img
                  src={blog.cover_image}
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 flex items-center justify-center px-3">
                  <div className="text-center space-y-0.5">
                    <div className="text-[9px] sm:text-[10px] font-semibold tracking-[0.2em] text-slate-300 uppercase">
                      Blog
                    </div>
                    <h2 className="text-xs sm:text-sm md:text-base font-extrabold uppercase tracking-wide bg-gradient-to-r from-indigo-300 via-purple-300 to-emerald-300 text-transparent bg-clip-text leading-snug line-clamp-3">
                      {blog.title}
                    </h2>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 md:p-4 lg:p-6 flex flex-col flex-grow">
              <div className="mb-2 md:mb-3">
                <span className="text-xs md:text-sm text-gray-500">
                  {new Date(blog.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 md:mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                {blog.title}
              </h3>
              
              <div className="mb-3 md:mb-4 text-gray-600 line-clamp-2 md:line-clamp-3 flex-grow text-xs md:text-sm leading-relaxed">
                {blog.content.replace(/<[^>]*>/g, '').substring(0, 120)}...
              </div>
              
              <div className="mt-auto">
                <span className="text-orange-600 font-medium flex items-center group-hover:translate-x-1 transition-transform text-xs md:text-sm">
                  Read More <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 ml-1" />
                </span>
              </div>
            </div>
          </article>
        </Link>
        );
      })}
    </div>
  );
}