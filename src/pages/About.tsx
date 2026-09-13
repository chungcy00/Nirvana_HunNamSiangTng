import React, { useEffect, useState } from 'react';
import { getProfile } from '../lib/api';
import type { Profile } from '../types';

export default function About() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  if (!profile) return null;

  const philosophies = [
    { title: '专业经验', desc: '超过十年的行业经验，熟悉各大墓园及服务机构流程，确保每个环节妥善处理。' },
    { title: '真诚陪伴', desc: '以同理心倾听家属需求，在最艰难的时刻提供温暖、实质的协助与支持。' },
    { title: '尊重信仰', desc: profile.philosophy },
    { title: '长期规划', desc: '不仅关注当下的治丧事宜，更协助长远的身后规划，让家属真正安心。' }
  ];

  return (
    <div className="bg-[#F9FBF8] min-h-screen">
      {/* Hero */}
      <section className="bg-[#164F3A] py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">用心服务，让安排更安心</h1>
        <p className="text-[#DCE6D7] max-w-2xl mx-auto">
          我们相信，每一次告别都值得被尊重。专业的规划不仅是对逝者的致敬，更是对生者的体贴。
        </p>
      </section>

      {/* Profile Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 -mt-10">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[#DCE6D7] flex flex-col md:flex-row gap-12 items-center">
          <div className="md:w-1/3">
            <div className="relative">
              <img 
                src={profile.avatarUrl} 
                alt={profile.name} 
                className="w-full aspect-square object-cover rounded-2xl shadow-md"
              />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#F9FBF8] rounded-full border-[10px] border-white flex items-center justify-center -z-10">
                <div className="w-16 h-16 bg-[#C8A45A] rounded-full opacity-20"></div>
              </div>
            </div>
          </div>
          <div className="md:w-2/3">
            <h2 className="text-3xl font-serif text-[#164F3A] mb-2">{profile.name}</h2>
            <p className="text-[#C8A45A] font-medium text-lg mb-6">{profile.title}</p>
            <div className="space-y-4 text-gray-700 leading-relaxed text-lg">
              <p>{profile.bio}</p>
              <p>我深知在面对亲人离去或规划未来时，人们常感彷徨与无助。我的角色不仅是提供服务资讯，更是作为一位可靠的顾问，协助您理清思绪，找到最适合您和家人的方案。</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-white border-t border-[#DCE6D7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif text-[#164F3A] mb-4">我的服务理念</h2>
            <div className="w-16 h-1 bg-[#C8A45A] mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {philosophies.map((item, idx) => (
              <div key={idx} className="bg-[#F9FBF8] p-8 rounded-2xl border border-[#DCE6D7]">
                <h3 className="text-xl font-medium text-[#164F3A] mb-4">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
