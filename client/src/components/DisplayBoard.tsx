
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { DisplayBoardEntry } from '../../../server/src/schema';

const SPECIALTY_LABELS = {
  GENERAL_MEDICINE: '🩺 General Medicine',
  CARDIOLOGY: '❤️ Cardiology',
  DERMATOLOGY: '🔬 Dermatology',
  PEDIATRICS: '👶 Pediatrics',
  ORTHOPEDICS: '🦴 Orthopedics',
  NEUROLOGY: '🧠 Neurology',
  GYNECOLOGY: '👩‍⚕️ Gynecology',
  PSYCHIATRY: '🧘 Psychiatry',
  OPHTHALMOLOGY: '👁️ Ophthalmology',
  ENT: '👂 ENT'
} as const;

export function DisplayBoard() {
  const [displayEntries, setDisplayEntries] = useState<DisplayBoardEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadDisplayBoard = useCallback(async () => {
    try {
      const result = await trpc.getDisplayBoard.query();
      setDisplayEntries(result);
    } catch (error) {
      console.error('Failed to load display board:', error);
    }
  }, []);

  useEffect(() => {
    loadDisplayBoard();
    const interval = setInterval(loadDisplayBoard, 3000); // Refresh every 3 seconds for real-time updates
    return () => clearInterval(interval);
  }, [loadDisplayBoard]);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CALLED': return 'bg-blue-500 text-white animate-pulse';
      case 'IN_PROGRESS': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CALLED': return '📢';
      case 'IN_PROGRESS': return '👨‍⚕️';
      default: return '⏳';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold">
            📺 Public Display Board
          </CardTitle>
          <div className="text-xl opacity-90">
            {currentTime.toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day:  'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center text-gray-800">
            🔔 Now Calling
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayEntries.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🕐</div>
              <div className="text-2xl text-gray-600 mb-2">No Active Calls</div>
              <div className="text-lg text-gray-500">
                Please wait for your number to be called
              </div>
              {/* Note: This shows empty due to stub implementation in backend */}
              <div className="text-sm text-gray-400 mt-4">
                (Display board will show real patient calls when backend is implemented)
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {displayEntries.map((entry: DisplayBoardEntry) => (
                <Card 
                  key={entry.id} 
                  className="border-2 shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-2">
                      {getStatusIcon(entry.status)}
                    </div>
                    
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      Patient ID: {entry.patient_id}
                    </div>
                    
                    <div className="text-2xl font-semibold text-purple-600 mb-3">
                      🏥 Room {entry.room_number}
                    </div>
                    
                    <div className="text-lg text-gray-700 mb-3">
                      {SPECIALTY_LABELS[entry.specialty]}
                    </div>
                    
                    <Badge className={`text-lg px-4 py-2 ${getStatusColor(entry.status)}`}>
                      {entry.status === 'CALLED' && '📢 PLEASE PROCEED'}
                      {entry.status === 'IN_PROGRESS' && '👨‍⚕️ IN CONSULTATION'}
                    </Badge>
                    
                    <div className="text-sm text-gray-500 mt-3">
                      Called at: {entry.created_at.toLocaleTimeString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-800 mb-2">
              📋 Instructions
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-yellow-700">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">📢</span>
                <span>Listen for your Patient ID</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">🏥</span>
                <span>Note the room number</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">🚶‍♂️</span>
                <span>Proceed to the indicated room</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
