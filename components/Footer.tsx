import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Trophy, CheckCircle, UserCircle } from 'lucide-react';
import { FooterNavigation } from './FooterNavigation';

export function Footer() {
  return (
    <footer className="bg-gradient-to-r from-indigo-900 to-blue-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-2">MLM UNION</h3>

            <p className="text-indigo-200">Your trusted platform for network marketing opportunities in India and worldwide.</p>
            <div className="mt-4 space-y-2">
              <Link href="/top-earners" className="flex items-center text-indigo-200 hover:text-white">
                <Trophy className="w-4 h-4 mr-2" />
                Top MLM Earners
              </Link>
              <Link href="/recommended-direct-sellers" className="flex items-center text-indigo-200 hover:text-white">
                <UserCircle className="w-5 h-5 mr-2 stroke-2" />
                Recommended Direct Sellers
              </Link>
              <Link href="/income-verification" className="flex items-center text-indigo-200 hover:text-white">
                <CheckCircle className="w-4 h-4 mr-2" />
                Income Verification
              </Link>
            </div>
          </div>
          
          <FooterNavigation column={1} title="Quick Links" extraLinks={[{ href: '/faq', label: 'FAQ' }]} />
          <FooterNavigation column={2} title="Support" />
          
          <div>
            <h4 className="text-lg font-semibold mb-2">Contact Us</h4>
            <p className="text-white font-semibold mb-1 text-sm">MLM UNION</p>
            <p className="text-white font-semibold mb-1 text-sm">Vista Neotech Private Limited</p>
            <ul className="space-y-3">
              <li className="flex items-start text-indigo-200">
                <MapPin className="w-4 h-4 mr-2 mt-1 flex-shrink-0" />
                <span className="text-sm">
                  517, Jaina Tower-1, District Centre,<br />
                  Janak Puri, New Delhi -110058 (India)
                </span>
              </li>
              <li className="flex items-center text-indigo-200">
                <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                <a 
                  href="https://mail.google.com/mail/?view=cm&to=support@mlmunion.in" 
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white text-sm transition-colors underline decoration-transparent hover:decoration-white cursor-pointer"
                >
                  support@mlmunion.in
                </a>
              </li>
              <li className="flex items-center text-indigo-200">
                <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                <a
                  href="tel:+919811190082"
                  className="hover:text-white text-sm transition-colors underline decoration-transparent hover:decoration-white"
                >
                  +91 9811190082
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-indigo-800 mt-8 pt-8 text-center text-indigo-200">
      
          <p>&copy; {new Date().getFullYear()} MLM UNION. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}