import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Phone, Mail, MapPin, Clock, MessageCircle, Send } from 'lucide-react';
import { getProfile, submitInquiry } from '../lib/api';
import type { Profile } from '../types';

type InquiryForm = {
  name: string;
  phone: string;
  serviceInterest: string;
  message: string;
};

export default function Contact() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm<InquiryForm>();
  const [submitError, setSubmitError] = useState(false);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  const onSubmit = async (data: InquiryForm) => {
    setSubmitError(false);
    const success = await submitInquiry({
      ...data,
      createdAt: new Date().toISOString()
    });
    if (success) {
      reset();
    } else {
      setSubmitError(true);
    }
  };

  if (!profile) return null;

  return (
    <div className="bg-[#F9FBF8] min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-[#164F3A] mb-4">联系我们</h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            无论您需要立即的协助，还是希望提早了解身后规划，我们都随时准备为您解答。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Contact Info */}
          <div>
            <div className="bg-[#164F3A] rounded-3xl p-8 md:p-12 text-white shadow-lg relative overflow-hidden h-full">
              <div className="absolute -bottom-24 -right-24 w-64 h-64 border-[40px] border-[#1F6045] rounded-full opacity-50 pointer-events-none"></div>
              
              <h2 className="text-2xl font-serif mb-8 relative z-10">联络资讯</h2>
              
              <div className="space-y-8 relative z-10">
                <div className="flex items-start">
                  <div className="bg-white/10 p-3 rounded-full mr-4 shrink-0">
                    <Phone className="w-6 h-6 text-[#C8A45A]" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">联系电话</p>
                    <p className="text-xl font-medium">{profile.phone}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-white/10 p-3 rounded-full mr-4 shrink-0">
                    <Mail className="w-6 h-6 text-[#C8A45A]" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">电子邮件</p>
                    <p className="text-lg">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-white/10 p-3 rounded-full mr-4 shrink-0">
                    <MapPin className="w-6 h-6 text-[#C8A45A]" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">服务地区</p>
                    <p className="text-lg">{profile.serviceAreas}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-white/10 p-3 rounded-full mr-4 shrink-0">
                    <Clock className="w-6 h-6 text-[#C8A45A]" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">营业时间</p>
                    <p className="text-lg">{profile.businessHours}</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 relative z-10">
                <a
                  href={`https://wa.me/${profile.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center px-6 py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-medium transition-colors text-lg shadow-md"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  使用 WhatsApp 联系
                </a>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[#DCE6D7]">
            <h2 className="text-2xl font-serif text-[#164F3A] mb-8">在线咨询</h2>
            
            {isSubmitSuccessful ? (
              <div className="bg-[#f0f5ee] border border-[#78936D] text-[#164F3A] p-6 rounded-xl text-center">
                <p className="text-xl font-medium mb-2">感谢您的咨询</p>
                <p>我们已收到您的留言，将尽快与您联系。</p>
                <button 
                  onClick={() => reset()}
                  className="mt-6 px-6 py-2 bg-[#164F3A] text-white rounded-lg text-sm"
                >
                  发送新咨询
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">姓名 *</label>
                  <input
                    {...register("name", { required: "请输入姓名" })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#164F3A] focus:border-transparent outline-none transition-all"
                    placeholder="您的姓名"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">联系电话 *</label>
                  <input
                    {...register("phone", { required: "请输入联系电话" })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#164F3A] focus:border-transparent outline-none transition-all"
                    placeholder="您的手机号码"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">想咨询的服务 *</label>
                  <select
                    {...register("serviceInterest", { required: "请选择咨询项目" })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#164F3A] focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="">请选择...</option>
                    <option value="富贵山庄">富贵山庄</option>
                    <option value="云南善堂">云南善堂</option>
                    <option value="宠物纪念">宠物纪念</option>
                    <option value="其他">其他</option>
                  </select>
                  {errors.serviceInterest && <p className="text-red-500 text-xs mt-1">{errors.serviceInterest.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">留言内容</label>
                  <textarea
                    {...register("message")}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#164F3A] focus:border-transparent outline-none transition-all resize-none"
                    placeholder="有什么我们可以协助您的？"
                  ></textarea>
                </div>

                {submitError && (
                  <p className="text-red-500 text-sm">提交失败，请稍后再试或直接通过 WhatsApp 联系我们。</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center px-6 py-4 bg-[#164F3A] hover:bg-[#1F6045] disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors text-lg"
                >
                  {isSubmitting ? (
                     <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      发送咨询 <Send className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
