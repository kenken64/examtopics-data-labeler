'use client';

import React from 'react';

interface LeaderboardPlayer {
  _id: string;
  username: string;
  displayName: string;
  totalPoints: number;
  quizzesTaken: number;
  accuracy: number;
  source: 'registered' | 'quizblitz';
  position: number;
}

interface SimpleLeaderboardProps {
  data: LeaderboardPlayer[];
}

export default function SimpleLeaderboard({ data }: SimpleLeaderboardProps) {
  console.log('🟢 SimpleLeaderboard: Component rendering with data:', data);
  
  if (!data || data.length === 0) {
    return (
      <div className="border-2 border-orange-500 p-4 bg-orange-50">
        <h3 className="text-orange-800 font-bold">Simple Leaderboard - No Data</h3>
        <p className="text-orange-700">Data length: {data?.length || 0}</p>
        <div className="mt-2 p-2 bg-orange-200">
          <p className="text-orange-800">This component is rendering but has no data to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-blue-500 p-4 bg-blue-50">
      <h3 className="text-blue-800 font-bold mb-3">Simple Leaderboard ({data.length} players)</h3>
      <div className="space-y-2">
        {data.slice(0, 5).map((player, index) => (
          <div key={player._id} className="flex justify-between items-center p-2 bg-white rounded border">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-600">#{index + 1}</span>
              <span className="font-semibold">{player.displayName || player.username}</span>
              <span className={`px-2 py-1 rounded text-xs ${
                player.source === 'registered' 
                  ? 'bg-blue-200 text-blue-800' 
                  : 'bg-green-200 text-green-800'
              }`}>
                {player.source}
              </span>
            </div>
            <div className="text-right">
              <div className="font-bold text-purple-600">{player.totalPoints} pts</div>
              <div className="text-xs text-gray-500">{player.accuracy.toFixed(1)}% accuracy</div>
            </div>
          </div>
        ))}
      </div>
      {data.length > 5 && (
        <div className="mt-2 text-center text-sm text-gray-600">
          ... and {data.length - 5} more players
        </div>
      )}
    </div>
  );
}
