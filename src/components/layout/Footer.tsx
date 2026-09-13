import React from 'react';
import { Link } from 'react-router-dom';
import { mockProfile } from '../../lib/api';

export default function Footer() {
  return (
    <footer className="bg-[#164F3A] text-[#DCE6D7] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-white rounded-full p-1 w-10 h-10 flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain rounded-full" />
              </div>
              <span className="font-serif text-xl text-white font-semibold tracking-wide">
                身后规划服务
              </span>
            </div>
            <p className="text-sm text-[#A7B89B] leading-relaxed max-w-sm mb-6">
              以关怀承托每一段生命旅程。尊重不同的信仰与选择，让爱与记忆继续延伸。
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-medium mb-4">快捷导航</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">首页</Link></li>
              <li><Link to="/nirvana" className="hover:text-white transition-colors">富贵山庄</Link></li>
              <li><Link to="/yunnan-siantang" className="hover:text-white transition-colors">云南善堂</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">关于我们</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-medium mb-4">联系方式</h3>
            <ul className="space-y-2 text-sm text-[#A7B89B]">
              <li>{mockProfile.name} {mockProfile.title}</li>
              <li>{mockProfile.phone}</li>
              <li>{mockProfile.serviceAreas}</li>
              <li>{mockProfile.businessHours}</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-xs text-[#78936D]">
          <p>&copy; {new Date().getFullYear()} 身后规划服务. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
