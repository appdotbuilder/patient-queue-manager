
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { 
  DoctorLoginInput, 
  SetDoctorRoomInput, 
  CallNextPatientInput,
  Doctor
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

export function DoctorInterface() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState<DoctorLoginInput>({
    doctor_id: 0,
    room_number: ''
  });

  const [roomForm, setRoomForm] = useState<SetDoctorRoomInput>({
    doctor_id: 0,
    room_number: ''
  });

  const loadDoctors = useCallback(async () => {
    try {
      const result = await trpc.getDoctors.query();
      setDoctors(result);
    } catch (error) {
      console.error('Failed to load doctors:', error);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
    const interval = setInterval(loadDoctors, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [loadDoctors]);

  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await trpc.doctorLogin.mutate(loginForm);
      const doctor = doctors.find((d: Doctor) => d.id === loginForm.doctor_id);
      if (doctor) {
        setCurrentDoctor({ ...doctor, room_number: loginForm.room_number, status: 'AVAILABLE' });
        setRoomForm({ doctor_id: loginForm.doctor_id, room_number: loginForm.room_number });
      }
      setSuccess('✅ Successfully logged in!');
      await loadDoctors();
    } catch (error) {
      setError('❌ Failed to login. Please check your credentials.');
      console.error('Failed to login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await trpc.setDoctorRoom.mutate(roomForm);
      if (currentDoctor) {
        setCurrentDoctor({ ...currentDoctor, room_number: roomForm.room_number });
      }
      setSuccess('✅ Room number updated successfully!');
      await loadDoctors();
    } catch (error) {
      setError('❌ Failed to update room number.');
      console.error('Failed to set room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallNextPatient = async () => {
    if (!currentDoctor) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const callInput: CallNextPatientInput = { doctor_id: currentDoctor.id };
      await trpc.callNextPatient.mutate(callInput);
      setSuccess('✅ Next patient has been called!');
      await loadDoctors();
    } catch (error) {
      setError('❌ No patients waiting or failed to call next patient.');
      console.error('Failed to call next patient:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'BUSY': return 'bg-yellow-100 text-yellow-800';
      case 'OFFLINE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentDoctor) {
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-green-800">👨‍⚕️ Doctor Login</CardTitle>
            <CardDescription>
              Select your doctor profile and set your room number to begin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDoctorLogin} className="space-y-4">
              <div>
                <Select
                  value={loginForm.doctor_id ? loginForm.doctor_id.toString() : ''}
                  onValueChange={(value: string) =>
                    setLoginForm((prev: DoctorLoginInput) => ({ ...prev, doctor_id: parseInt(value) }))
                  }
                >
                  <SelectTrigger className="text-lg">
                    <SelectValue placeholder="Select Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor: Doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id.toString()}>
                        Dr. {doctor.name} - {SPECIALTY_LABELS[doctor.specialty]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Input
                  placeholder="Room Number (e.g., A101, B205)"
                  value={loginForm.room_number}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLoginForm((prev: DoctorLoginInput) => ({ ...prev, room_number: e.target.value }))
                  }
                  required
                  className="text-lg"
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700">
                {isLoading ? '⏳ Logging in...' : '🔑 Login & Set Room'}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-800">👥 All Doctors</CardTitle>
            <CardDescription>Current status of all doctors in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {doctors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                🔄 Loading doctor information...
                {/* Note: This shows empty due to stub implementation in backend */}
              </div>
            ) : (
              <div className="space-y-3">
                {doctors.map((doctor: Doctor) => (
                  <div key={doctor.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">Dr. {doctor.name}</div>
                      <div className="text-sm text-gray-600">{SPECIALTY_LABELS[doctor.specialty]}</div>
                      {doctor.room_number && (
                        <div className="text-sm text-blue-600">Room: {doctor.room_number}</div>
                      )}
                    </div>
                    <Badge className={getStatusColor(doctor.status)}>
                      {doctor.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-blue-800">
            👨‍⚕️ Welcome, Dr. {currentDoctor.name}
          </CardTitle>
          <CardDescription>
            {SPECIALTY_LABELS[currentDoctor.specialty]} - Room: {currentDoctor.room_number || 'Not Set'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={`${getStatusColor(currentDoctor.status)} text-lg px-4 py-2`}>
              {currentDoctor.status}
            </Badge>
            <Button
              onClick={() => setCurrentDoctor(null)}
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              🚪 Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="text-green-800">🏥 Room Management</CardTitle>
          <CardDescription>Update your assigned room number</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetRoom} className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New Room Number"
                value={roomForm.room_number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRoomForm((prev: SetDoctorRoomInput) => ({ ...prev, room_number: e.target.value }))
                }
                required
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading ? '⏳ Updating...' : '📍 Update Room'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="text-purple-800">🔔 Patient Queue Management</CardTitle>
          <CardDescription>Call and manage patients from your specialty queue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleCallNextPatient} 
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3"
          >
            {isLoading ? '⏳ Calling...' : '📢 Call Next Patient'}
          </Button>

          <Separator />

          <div className="text-center text-gray-600">
            <p>💡 Click "Call Next Patient" to call the next person from your specialty queue</p>
            <p className="text-sm mt-1">The patient will be notified and their information will appear on the display board</p>
          </div>

          {/* Placeholder for current patient info - would be populated by real backend */}
          <div className="p-4 border rounded-lg bg-white">
            <div className="text-sm text-gray-500 text-center">
              Current patient information will appear here when available
              {/* Note: This would show real patient data with proper backend implementation */}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
