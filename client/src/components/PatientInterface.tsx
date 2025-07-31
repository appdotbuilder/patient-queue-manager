
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { 
  JoinQueueInput, 
  QueueStatusResponse, 
  PatientQueueInfo 
} from '../../../server/src/schema';

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

type MedicalSpecialty = keyof typeof SPECIALTY_LABELS;

export function PatientInterface() {
  const [queueStatuses, setQueueStatuses] = useState<QueueStatusResponse[]>([]);
  const [patientInfo, setPatientInfo] = useState<PatientQueueInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<JoinQueueInput>({
    patient_id: '',
    specialty: 'GENERAL_MEDICINE'
  });

  const loadQueueStatuses = useCallback(async () => {
    try {
      const result = await trpc.getQueueStatus.query();
      setQueueStatuses(result);
    } catch (error) {
      console.error('Failed to load queue statuses:', error);
    }
  }, []);

  const checkPatientStatus = useCallback(async (patientId: string) => {
    if (!patientId.trim()) return;
    
    try {
      const result = await trpc.getPatientQueueInfo.query(patientId);
      setPatientInfo(result);
    } catch (error) {
      console.error('Failed to get patient info:', error);
      setPatientInfo(null);
    }
  }, []);

  useEffect(() => {
    loadQueueStatuses();
    const interval = setInterval(loadQueueStatuses, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [loadQueueStatuses]);

  useEffect(() => {
    if (formData.patient_id.trim()) {
      checkPatientStatus(formData.patient_id);
      const interval = setInterval(() => checkPatientStatus(formData.patient_id), 5000);
      return () => clearInterval(interval);
    }
  }, [formData.patient_id, checkPatientStatus]);

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await trpc.joinQueue.mutate(formData);
      setSuccess('✅ Successfully joined the queue! Your queue information will appear below.');
      await checkPatientStatus(formData.patient_id);
      await loadQueueStatuses();
    } catch (error) {
      setError('❌ Failed to join queue. Please try again.');
      console.error('Failed to join queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelQueue = async () => {
    if (!patientInfo) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await trpc.cancelQueueEntry.mutate(patientInfo.queue_entry.id);
      setSuccess('✅ Successfully cancelled your queue entry.');
      setPatientInfo(null);
      await loadQueueStatuses();
    } catch (error) {
      setError('❌ Failed to cancel queue entry. Please try again.');
      console.error('Failed to cancel queue entry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-yellow-100 text-yellow-800';
      case 'CALLED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-blue-800">👤 Join Queue</CardTitle>
          <CardDescription>
            Enter your patient ID and select a specialty to join the queue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinQueue} className="space-y-4">
            <div>
              <Input
                placeholder="Enter your Patient ID"
                value={formData.patient_id}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: JoinQueueInput) => ({ ...prev, patient_id: e.target.value }))
                }
                required
                className="text-lg"
              />
            </div>
            
            <div>
              <Select
                value={formData.specialty || 'GENERAL_MEDICINE'}
                onValueChange={(value: MedicalSpecialty) =>
                  setFormData((prev: JoinQueueInput) => ({ ...prev, specialty: value }))
                }
              >
                <SelectTrigger className="text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SPECIALTY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700">
              {isLoading ? '⏳ Joining Queue...' : '🎫 Join Queue'}
            </Button>
          </form>

          {error && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {patientInfo && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-green-800">📋 Your Queue Status</CardTitle>
            <CardDescription>Real-time updates for Patient ID: {patientInfo.queue_entry.patient_id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">#{patientInfo.queue_entry.queue_number}</div>
                <div className="text-sm text-gray-600">Queue Number</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">#{patientInfo.position_in_queue}</div>
                <div className="text-sm text-gray-600">Position</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{patientInfo.estimated_wait_time}min</div>
                <div className="text-sm text-gray-600">Est. Wait</div>
              </div>
              <div className="text-center">
                <Badge className={getStatusColor(patientInfo.queue_entry.status)}>
                  {patientInfo.queue_entry.status}
                </Badge>
              </div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800">
                {SPECIALTY_LABELS[patientInfo.queue_entry.specialty]}
              </div>
              {patientInfo.queue_entry.room_number && (
                <div className="text-xl font-bold text-blue-600 mt-2">
                  🏥 Room: {patientInfo.queue_entry.room_number}
                </div>
              )}
            </div>

            {patientInfo.queue_entry.status === 'WAITING' && (
              <Button 
                onClick={handleCancelQueue} 
                disabled={isLoading}
                variant="destructive"
                className="w-full"
              >
                {isLoading ? '⏳ Cancelling...' : '❌ Cancel Queue Entry'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-800">📊 Current Queue Status</CardTitle>
          <CardDescription>Live updates of all specialty queues</CardDescription>
        </CardHeader>
        <CardContent>
          {queueStatuses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              🔄 Loading queue information... 
              {/* Note: This shows empty due to stub implementation in backend */}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {queueStatuses.map((status: QueueStatusResponse) => (
                <Card key={status.specialty} className="border-gray-200">
                  <CardContent className="p-4">
                    <div className="text-sm font-semibold text-gray-800 mb-2">
                      {SPECIALTY_LABELS[status.specialty]}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div>Waiting: <span className="font-bold text-orange-600">{status.total_waiting}</span></div>
                      <div>Current: <span className="font-bold text-blue-600">#{status.current_queue_number}</span></div>
                      <div>Wait Time: <span className="font-bold text-purple-600">{status.estimated_wait_time}min</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
