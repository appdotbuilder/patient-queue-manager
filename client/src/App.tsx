
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PatientInterface } from '@/components/PatientInterface';
import { DoctorInterface } from '@/components/DoctorInterface';
import { DisplayBoard } from '@/components/DisplayBoard';
import { Card } from '@/components/ui/card';

function App() {
  const [activeTab, setActiveTab] = useState('patient');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-800 mb-2">
            🏥 Medical Queue Management System
          </h1>
          <p className="text-lg text-gray-600">
            Streamlined patient flow for better healthcare experience
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-blue-100 p-1 rounded-lg">
              <TabsTrigger 
                value="patient" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold"
              >
                👤 Patient Portal
              </TabsTrigger>
              <TabsTrigger 
                value="doctor" 
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white font-semibold"
              >
                👨‍⚕️ Doctor Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="display" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white font-semibold"
              >
                📺 Display Board
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="patient" className="space-y-4">
                <PatientInterface />
              </TabsContent>

              <TabsContent value="doctor" className="space-y-4">
                <DoctorInterface />
              </TabsContent>

              <TabsContent value="display" className="space-y-4">
                <DisplayBoard />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

export default App;
