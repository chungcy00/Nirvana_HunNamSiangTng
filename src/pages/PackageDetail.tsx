import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, MessageCircle } from 'lucide-react';
import { getPackageBySlug, mockProfile } from '../lib/api';
import type { Package, PackageFeature } from '../types';

export default function PackageDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<{ pkg: Package; features: PackageFeature[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (slug) {
        const result = await getPackageBySlug(slug);
        setData(result);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#164F3A]"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <h2 className="text-2xl font-serif text-[#164F3A] mb-4">找不到该配套</h2>
        <p className="text-gray-600 mb-8">您正在寻找的配套可能已被移除或地址有误。</p>
        <Link to="/nirvana" className="text-[#164F3A] hover:underline flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" /> 返回富贵山庄页面
        </Link>
      </div>
    );
  }

  const { pkg, features } = data;

  const formatPrice = (p: Package) => {
    if (p.priceDisplayType === 'hidden') return null;
    if (p.priceDisplayType === 'contact_us') return '欢迎咨询';
    const formatted = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(p.price).replace('MYR', 'RM');
    if (p.priceDisplayType === 'starting_at') return `${formatted} 起`;
    return formatted;
  };

  const whatsappMessage = `您好，我想了解「${pkg.name}」，请问可以提供更多资料吗？`;

  return (
    <div className="bg-[#F9FBF8] min-h-screen pb-32">
      {/* Hero Image */}
      <div className="w-full h-[40vh] md:h-[50vh] relative">
        <img 
          src={pkg.coverImageUrl} 
          alt={pkg.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 text-white max-w-7xl mx-auto">
          <Link to="/nirvana" className="inline-flex items-center text-white/80 hover:text-white mb-6 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> 返回配套列表
          </Link>
          <div className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider mb-4 border border-white/30">
            {pkg.categoryId}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-4 drop-shadow-md">{pkg.name}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[#DCE6D7]">
              <h2 className="text-2xl font-serif text-[#164F3A] mb-6">配套简介</h2>
              <p className="text-gray-700 leading-relaxed text-lg mb-8">
                {pkg.description}
              </p>

              <h3 className="text-xl font-serif text-[#164F3A] mb-6 border-b border-[#DCE6D7] pb-4">配套特点与包含内容</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map(f => (
                  <div key={f.id} className="flex items-start bg-[#F9FBF8] p-4 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-[#78936D] mt-0.5 mr-3 shrink-0" />
                    <span className="text-gray-800">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar / Sticky Action Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-8 shadow-md border border-[#DCE6D7] sticky top-28">
              <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">参考价格</h3>
              <div className="text-3xl text-[#C8A45A] font-medium mb-6">
                {formatPrice(pkg)}
              </div>
              
              {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                <div className="text-sm text-gray-500 line-through mb-4">
                  原价: RM {pkg.originalPrice.toLocaleString()}
                </div>
              )}

              <p className="text-sm text-gray-600 mb-8 pb-8 border-b border-[#DCE6D7]">
                价格可能因具体需求、地点和家属选择而有所不同，建议直接联系我们以获取最准确的报价。
              </p>

              <a
                href={`https://wa.me/${mockProfile.whatsapp}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center px-6 py-4 bg-[#164F3A] hover:bg-[#1F6045] text-white rounded-xl font-medium transition-colors text-lg"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp 咨询此配套
              </a>
              <div className="text-center mt-4 text-xs text-gray-500">
                点击将自动打开 WhatsApp
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
