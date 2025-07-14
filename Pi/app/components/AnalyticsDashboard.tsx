'use client';

import React, { useState } from 'react';
import { Conversation } from '@/lib/supabase';

interface AnalyticsData {
  conversations: Conversation[];
  searchResults: any[];
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analytics?type=conversations&limit=5');
      const data = await response.json();
      
      if (data.success) {
        setAnalytics({ 
          conversations: data.data, 
          searchResults: analytics?.searchResults || [] 
        });
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchTranscripts = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics?type=search&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics({ 
          conversations: analytics?.conversations || [], 
          searchResults: data.data 
        });
      }
    } catch (error) {
      console.error('Failed to search transcripts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-gray-800 rounded text-xs">
      <div className="flex items-center justify-between mb-3">
        <strong className="text-green-400">💾 Database Analytics</strong>
        <div className="flex gap-2">
          <button 
            onClick={loadConversations}
            disabled={loading}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white text-xs"
          >
            {loading ? '⏳' : '📊'} Load Conversations
          </button>
        </div>
      </div>

      {/* Search Interface */}
      <div className="mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcripts..."
              className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs"
              onKeyPress={(e) => e.key === 'Enter' && searchTranscripts()}
            />
            <button 
              onClick={searchTranscripts}
              disabled={loading || !searchQuery.trim()}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white text-xs"
            >
              🔍 Search
            </button>
          </div>
        </div>

      {/* Recent Conversations */}
      {analytics?.conversations && analytics.conversations.length > 0 && (
        <div className="mb-3">
          <div className="text-gray-300 mb-2">📝 Recent Conversations ({analytics.conversations.length})</div>
          {analytics.conversations.map((conv) => (
            <div key={conv.id} className="text-gray-400 mb-1 pl-2 border-l border-gray-600">
              <div className="flex justify-between">
                <span>👤 {conv.user_name}</span>
                <span className="text-xs text-gray-500">
                  {new Date(conv.start_time).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-yellow-400">💬 {conv.topic}</div>
              <div className="text-gray-500">
                📊 {conv.total_messages} messages
                {conv.end_time && (
                  <span className="ml-2">
                    ⏱️ {Math.round((new Date(conv.end_time).getTime() - new Date(conv.start_time).getTime()) / 60000)}min
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Results */}
      {analytics?.searchResults && analytics.searchResults.length > 0 && (
        <div className="mb-3">
          <div className="text-gray-300 mb-2">🔍 Search Results for &quot;{searchQuery}&quot; ({analytics.searchResults.length})</div>
          {analytics.searchResults.map((result, index) => (
            <div key={index} className="text-gray-400 mb-2 pl-2 border-l border-yellow-600">
              <div className="flex justify-between">
                <span className="text-blue-400">🎭 {result.speaker}</span>
                <span className="text-xs text-gray-500">{result.stage}</span>
              </div>
              <div className="text-gray-300">
                &quot;{result.content.substring(0, 100)}...&quot;
              </div>
              {result.conversations && (
                <div className="text-xs text-gray-500">
                  💬 {result.conversations.topic} - {result.conversations.user_name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {analytics && !analytics.conversations.length && !analytics.searchResults.length && (
        <div className="text-gray-500 text-center py-2">
          No data available. Start a conversation to see analytics!
        </div>
      )}
    </div>
  );
}