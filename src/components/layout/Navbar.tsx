import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { mockProfile } from '../../lib/api'; // Using mock for now, ideally fetched at app level

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const links = [
    { name: '首页', path: '/' },
    { name: '富贵山庄', path: '/nirvana' },
    { name: '云南善堂', path: '/yunnan-siantang' },
    { name: '关于我们', path: '/about' },
    { name: '联系我们', path: '/contact' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-[#DCE6D7] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3" onClick={closeMenu}>
              <img src="/logo.png" alt="身后规划服务 Logo" className="w-12 h-12 object-contain" />
              <span className="font-serif text-xl text-[#164F3A] font-semibold tracking-wide">
                身后规划服务
              </span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "text-base font-medium transition-colors hover:text-[#164F3A]",
                  isActive(link.path) 
                    ? "text-[#164F3A] border-b-2 border-[#C8A45A] py-1" 
                    : "text-gray-600"
                )}
              >
                {link.name}
              </Link>
            ))}
            <a 
              href={`https://wa.me/${mockProfile.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-[#164F3A] hover:bg-[#1F6045] transition-colors"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp 咨询
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-[#164F3A] hover:bg-[#DCE6D7] focus:outline-none"
            >
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-[#DCE6D7]">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={closeMenu}
                className={cn(
                  "block px-3 py-2 rounded-md text-base font-medium",
                  isActive(link.path)
                    ? "text-[#164F3A] bg-[#f0f5ee]"
                    : "text-gray-600 hover:text-[#164F3A] hover:bg-[#f0f5ee]"
                )}
              >
                {link.name}
              </Link>
            ))}
            <a
              href={`https://wa.me/${mockProfile.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center px-3 py-2 rounded-md text-base font-medium text-[#164F3A] bg-[#f0f5ee]"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp 咨询
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
