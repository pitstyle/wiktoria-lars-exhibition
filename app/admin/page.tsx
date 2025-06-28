'use client';

import React from 'react';
import AnalyticsDashboard from '@/app/components/AnalyticsDashboard';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔧 Wiktoria-Lars Admin Dashboard</h1>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">💾 Database Analytics</h2>
          <AnalyticsDashboard />
        </div>
        
        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">🔗 Quick Links</h2>
          <div className="flex gap-4">
            <a 
              href="/" 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              🏠 Main App
            </a>
            <a 
              href="/?showDebugMessages=true" 
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              🐛 Debug Mode
            </a>
            <a 
              href="https://doyxqmbiafltsovdoucy.supabase.co" 
              target="_blank"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
            >
              🗄️ Supabase Dashboard
            </a>
          </div>
        </div>
        
        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">📋 Database Schema</h2>
          <div className="text-sm text-gray-300 space-y-2">
            <div>
              <strong>conversations</strong>: id, ultravox_call_id, user_name, topic, start_time, end_time, total_messages
            </div>
            <div>
              <strong>transcripts</strong>: id, conversation_id, speaker (lars/wiktoria/user), stage, content, timestamp
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}