import React from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, ShieldCheck, Heart, Users, ArrowRight } from 'lucide-react';
import { mockProfile } from '../lib/api';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&q=80&w=2000" 
            alt="自然风景" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-6 leading-tight drop-shadow-md">
            以关怀承托<br/>每一段生命旅程
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-light drop-shadow-sm">
            尊重不同的信仰与选择，让爱与记忆继续延伸。为您和家人提供最专业、安心的身后规划服务。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href={`https://wa.me/${mockProfile.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-[#164F3A] hover:bg-[#1F6045] text-white rounded-full font-medium transition-all shadow-lg text-lg flex items-center justify-center"
            >
              WhatsApp 联系我们
            </a>
            <Link 
              to="/nirvana"
              className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/30 rounded-full font-medium transition-all text-lg"
            >
              了解我们的服务
            </Link>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 bg-[#F9FBF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif text-[#164F3A] mb-4">我们的服务理念</h2>
            <div className="w-16 h-1 bg-[#C8A45A] mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { icon: Users, title: '专业咨询', desc: '一对一提供客观、专业的规划建议。' },
              { icon: Heart, title: '多元选择', desc: '配合不同信仰、文化与家庭需求。' },
              { icon: ShieldCheck, title: '安心托付', desc: '透明说明流程及相关服务，无隐藏收费。' },
              { icon: HeartHandshake, title: '延续关怀', desc: '从规划到后续安排持续提供协助。' }
            ].map((item, idx) => (
              <div key={idx} className="text-center group">
                <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-[0_4px_20px_-4px_rgba(22,79,58,0.1)] mb-6 text-[#164F3A] group-hover:scale-110 group-hover:bg-[#164F3A] group-hover:text-white transition-all duration-300">
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Showcase */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif text-[#164F3A] mb-4">为您提供多元化选择</h2>
            <div className="w-16 h-1 bg-[#C8A45A] mx-auto rounded-full"></div>
          </div>

          <div className="space-y-12">
            {/* Nirvana Card */}
            <div className="flex flex-col md:flex-row bg-[#F9FBF8] rounded-3xl overflow-hidden shadow-sm border border-[#DCE6D7]">
              <div className="md:w-1/2">
                <img 
                  src="https://images.unsplash.com/photo-1542360563-70335e2373fb?auto=format&fit=crop&q=80&w=800" 
                  alt="富贵山庄" 
                  className="w-full h-full object-cover min-h-[300px]"
                />
              </div>
              <div className="md:w-1/2 p-10 lg:p-14 flex flex-col justify-center">
                <h3 className="text-sm font-bold tracking-widest text-[#C8A45A] uppercase mb-2">NIRVANA</h3>
                <h2 className="text-3xl font-serif text-[#164F3A] mb-6">富贵山庄</h2>
                <ul className="grid grid-cols-2 gap-y-3 gap-x-4 mb-8 text-gray-700">
                  <li className="flex items-center"><div className="w-1.5 h-1.5 bg-[#C8A45A] rounded-full mr-2"></div> 生前规划</li>
                  <li className="flex items-center"><div className="w-1.5 h-1.5 bg-[#C8A45A] rounded-full mr-2"></div> 墓园 / 骨灰位</li>
                  <li className="flex items-center"><div className="w-1.5 h-1.5 bg-[#C8A45A] rounded-full mr-2"></div> 纪念空间</li>
                  <li className="flex items-center"><div className="w-1.5 h-1.5 bg-[#C8A45A] rounded-full mr-2"></div> 不同宗教配套</li>
                </ul>
                <div>
                  <Link 
                    to="/nirvana"
                    className="inline-flex items-center text-[#164F3A] font-medium hover:text-[#1F6045] group"
                  >
                    了解富贵山庄 <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Yunnan Card */}
            <div className="flex flex-col md:flex-row-reverse bg-[#F9FBF8] rounded-3xl overflow-hidden shadow-sm border border-[#DCE6D7]">
              <div className="md:w-1/2">
                <img 
                  src="https://images.unsplash.com/photo-1499540633125-484965b60031?auto=format&fit=crop&q=80&w=800" 
                  alt="云南善堂" 
                  className="w-full h-full object-cover min-h-[300px]"
                />
              </div>
              <div className="md:w-1/2 p-10 lg:p-14 flex flex-col justify-center">
                <h3 className="text-sm font-bold tracking-widest text-[#C8A45A] uppercase mb-2">YUNNAN SIANTANG</h3>
                <h2 className="text-3xl font-serif text-[#164F3A] mb-6">云南善堂</h2>
                <ul className="grid grid-cols-2 gap-y-3 gap-x-4 mb-8 text-gray-700">
                  <li className="flex items-center"><div className="w-1.5 h-1.5 bg-[#C8A45A] rounded-full mr-2"></div> 殡葬咨询</li>
                  <li className="flex items-center"><div className="w-1.5 h-1.5 bg-[#C8A45A] rounded-full mr-2"></div> 流程说明</li>
                  <li className="flex items-center"><div className="w-1.5 h-1.5 bg-[#C8A45A] rounded-full mr-2"></div> 家属协助</li>
                  <li className="flex items-center"><div className="w-1.5 h-1.5 bg-[#C8A45A] rounded-full mr-2"></div> 后续安排建议</li>
                </ul>
                <div>
                  <Link 
                    to="/yunnan-siantang"
                    className="inline-flex items-center text-[#164F3A] font-medium hover:text-[#1F6045] group"
                  >
                    了解云南善堂 <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Pet Memorial */}
            <div className="flex flex-col md:flex-row bg-[#F9FBF8] rounded-3xl overflow-hidden shadow-sm border border-[#DCE6D7]">
              <div className="md:w-1/2">
                <img 
                  src="https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=800" 
                  alt="宠物纪念" 
                  className="w-full h-full object-cover min-h-[300px]"
                />
              </div>
              <div className="md:w-1/2 p-10 lg:p-14 flex flex-col justify-center">
                <h3 className="text-sm font-bold tracking-widest text-[#C8A45A] uppercase mb-2">PET MEMORIAL</h3>
                <h2 className="text-3xl font-serif text-[#164F3A] mb-6">宠物纪念</h2>
                <p className="text-gray-700 mb-8 leading-relaxed">
                  宠物也是家人。<br/>
                  提供宠物纪念及相关规划资讯，让陪伴过我们的生命，也能够获得温柔而有尊严的告别。
                </p>
                <div>
                  <Link 
                    to="/nirvana/packages/pet-memorial-package"
                    className="inline-flex items-center text-[#164F3A] font-medium hover:text-[#1F6045] group"
                  >
                    了解宠物纪念服务 <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
