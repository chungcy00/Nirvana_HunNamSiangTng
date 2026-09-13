import React, { useEffect, useState } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { getServices, mockProfile } from '../lib/api';
import type { Service } from '../types';

export default function YunnanSiantang() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getServices('yunnan');
      setServices(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="bg-[#F9FBF8] min-h-screen pb-20">
      {/* Header */}
      <div className="bg-[#164F3A] py-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none translate-x-1/3 -translate-y-1/4">
           {/* Abstract shape representing Yunnan Siantang's spiritual essence */}
           <div className="w-96 h-96 rounded-full border-[20px] border-[#C8A45A]"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-6">云南善堂服务</h1>
          <p className="text-lg md:text-xl text-[#DCE6D7] leading-relaxed font-light max-w-2xl mx-auto">
            在您最需要的时候，提供及时、专业、充满关怀的协助。我们负责处理繁琐事务，让您能专心陪伴家人走完最后一程。
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-12 relative z-20">
        
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#164F3A]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service) => (
              <div key={service.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#DCE6D7] flex flex-col sm:flex-row group hover:shadow-md transition-shadow">
                <div className="sm:w-2/5 relative min-h-[200px]">
                  <img 
                    src={service.coverImageUrl} 
                    alt={service.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8 sm:w-3/5 flex flex-col justify-center">
                  <h3 className="text-2xl font-serif text-[#164F3A] mb-3">{service.name}</h3>
                  <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                    {service.description}
                  </p>
                  
                  <div className="mt-auto">
                    <a
                      href={`https://wa.me/${mockProfile.whatsapp}?text=${encodeURIComponent(`您好，我想了解云南善堂的「${service.name}」，请问可以提供更多资料吗？`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-[#164F3A] font-medium hover:text-[#1F6045] group/btn"
                    >
                      WhatsApp 咨询 <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Emergency Contact CTA */}
        <div className="mt-20 bg-[#1F6045] rounded-3xl p-10 md:p-16 text-center text-white shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)]"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-serif mb-6">需要紧急协助？</h2>
            <p className="text-[#DCE6D7] mb-8 max-w-2xl mx-auto">
              如果您遇到紧急情况，请随时拨打我们的24小时热线。我们将以最快的时间协助您处理相关事务。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href={`tel:${mockProfile.phone.replace(/[^0-9+]/g, '')}`} 
                className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4 bg-white text-[#164F3A] rounded-full font-medium hover:bg-gray-100 transition-colors text-lg"
              >
                <Phone className="w-5 h-5 mr-3" />
                {mockProfile.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
