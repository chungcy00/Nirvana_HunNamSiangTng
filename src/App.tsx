/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Nirvana from './pages/Nirvana';
import PackageDetail from './pages/PackageDetail';
import YunnanSiantang from './pages/Yunnan';
import About from './pages/About';
import Contact from './pages/Contact';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="nirvana" element={<Nirvana />} />
          <Route path="nirvana/packages/:slug" element={<PackageDetail />} />
          <Route path="yunnan-siantang" element={<YunnanSiantang />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
        </Route>
        
        {/* Admin Routes (Stubbed for MVP) */}
        <Route path="/admin/login" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-md text-center">
              <h1 className="text-2xl font-serif text-[#164F3A] mb-4">管理员登录</h1>
              <p className="text-gray-600 mb-6">这是管理后台入口。需要连接 Supabase Auth。</p>
              <button className="px-4 py-2 bg-[#164F3A] text-white rounded-lg">登录测试</button>
            </div>
          </div>
        } />
        <Route path="/admin/*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
