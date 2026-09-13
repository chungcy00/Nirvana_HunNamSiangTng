import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { getPackages, mockFeatures, mockProfile } from '../lib/api';
import type { Package } from '../types';

export default function Nirvana() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getPackages('nirvana');
      setPackages(data);
      setLoading(false);
    }
    load();
  }, []);

  const formatPrice = (pkg: Package) => {
    if (pkg.priceDisplayType === 'hidden') return null;
    if (pkg.priceDisplayType === 'contact_us') return '欢迎咨询';
    const formatted = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(pkg.price).replace('MYR', 'RM');
    if (pkg.priceDisplayType === 'starting_at') return `${formatted} 起`;
    return formatted;
  };

  return (
    <div className="bg-[#F9FBF8] min-h-screen">
      {/* Header */}
      <div className="bg-[#164F3A] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-6">富贵山庄配套与服务</h1>
          <p className="text-lg text-[#DCE6D7] leading-relaxed font-light">
            让客户快速了解富贵山庄有哪些产品、服务、配套、价格和选择。我们提供多样化的生前规划与殡葬服务，尊重不同宗教与文化需求。
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Filters/Categories could go here */}
        <div className="flex flex-wrap gap-4 mb-12 justify-center">
          {['全部', '生前规划', '墓园', '骨灰位', '佛教配套', '基督教配套', '宠物纪念'].map((cat, idx) => (
            <button 
              key={idx} 
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${idx === 0 ? 'bg-[#164F3A] text-white' : 'bg-white text-gray-600 border border-[#DCE6D7] hover:border-[#164F3A] hover:text-[#164F3A]'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#164F3A]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#DCE6D7] flex flex-col group hover:shadow-md transition-shadow">
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={pkg.coverImageUrl} 
                    alt={pkg.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-[#164F3A] rounded-full uppercase tracking-wider">
                    {pkg.categoryId}
                  </div>
                </div>
                
                <div className="p-8 flex flex-col flex-grow">
                  <h3 className="text-2xl font-serif text-[#164F3A] mb-2">{pkg.name}</h3>
                  <div className="text-xl text-[#C8A45A] font-medium mb-4">
                    {formatPrice(pkg)}
                  </div>
                  <p className="text-gray-600 text-sm mb-6 flex-grow">
                    {pkg.shortDescription}
                  </p>
                  
                  <div className="space-y-2 mb-8">
                    {(mockFeatures[pkg.id] || []).slice(0, 4).map((f) => (
                      <div key={f.id} className="flex items-start">
                        <CheckCircle2 className="w-4 h-4 text-[#78936D] mt-0.5 mr-2 shrink-0" />
                        <span className="text-sm text-gray-700">{f.text}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <Link 
                      to={`/nirvana/packages/${pkg.slug}`}
                      className="inline-flex justify-center items-center px-4 py-2.5 border border-[#164F3A] text-[#164F3A] rounded-lg text-sm font-medium hover:bg-[#f0f5ee] transition-colors"
                    >
                      查看详情
                    </Link>
                    <a
                      href={`https://wa.me/${mockProfile.whatsapp}?text=${encodeURIComponent(`您好，我想了解「${pkg.name}」，请问可以提供更多资料吗？`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex justify-center items-center px-4 py-2.5 bg-[#164F3A] text-white rounded-lg text-sm font-medium hover:bg-[#1F6045] transition-colors"
                    >
                      WhatsApp 咨询
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
