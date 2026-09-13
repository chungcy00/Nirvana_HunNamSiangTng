import React from 'react';
import { MessageCircle } from 'lucide-react';
import { mockProfile } from '../../lib/api';

export default function FloatingWhatsApp() {
  return (
    <a
      href={`https://wa.me/${mockProfile.whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 md:hidden z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#20bd5a] transition-colors flex items-center justify-center"
      aria-label="WhatsApp 咨询"
    >
      <MessageCircle className="w-6 h-6" />
    </a>
  );
}
