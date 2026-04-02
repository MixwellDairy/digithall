import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import socket from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Kiosk: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [kioskRoom, setKioskRoom] = useState<any>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    const storedRoom = localStorage.getItem('kiosk_room');
    if (storedRoom) setKioskRoom(JSON.parse(storedRoom));
  }, []);

  const fetchData = async () => {
    const resRooms = await api.get('/rooms');
    setRooms(resRooms.data);
    const resStudents = await api.get('/users/students');
    setStudents(resStudents.data);
  };

  const handleKioskSetup = (room: any) => {
    setKioskRoom(room);
    localStorage.setItem('kiosk_room', JSON.stringify(room));
  };

  const handleStudentSelect = async (student: any) => {
    setSelectedStudent(student);
    try {
      const res = await api.post('/auth/kiosk/login', { studentId: student.studentId });
      login(res.data.token, res.data.user);
      // Wait for student to select destination
    } catch (err) {
      alert('Login failed');
    }
  };

  const handlePassRequest = async (toRoomId: string) => {
    try {
      await api.post('/passes/request', { fromRoomId: kioskRoom.id, toRoomId, type: 'ROUND_TRIP' });
      alert('Pass requested! You are good to go.');
      setSelectedStudent(null);
      // Logout student but keep kiosk mode active
      localStorage.removeItem('token');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request pass');
    }
  };

  if (!kioskRoom) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-8">Setup Kiosk Mode</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <button key={room.id} onClick={() => handleKioskSetup(room)} className="bg-white p-4 rounded-lg shadow-md border-2 border-blue-500 font-bold">
              {room.name} ({room.number})
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-500 text-white p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-extrabold mb-4 uppercase">Kiosk: {kioskRoom.name}</h1>
        <p className="text-xl mb-8">Tap your name to request a pass</p>

        {!selectedStudent ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => handleStudentSelect(student)}
                className="bg-white text-blue-800 p-6 rounded-xl shadow-lg font-bold text-lg hover:scale-105 transition"
              >
                {student.firstName} {student.lastName}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <h2 className="text-3xl font-bold mb-6">Where are you going, {selectedStudent.firstName}?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {rooms.filter(r => r.id !== kioskRoom.id).map((room) => (
                <button
                  key={room.id}
                  onClick={() => handlePassRequest(room.id)}
                  className="bg-green-600 p-6 rounded-xl shadow-lg font-bold text-xl hover:bg-green-700 transition"
                >
                  {room.name}
                </button>
              ))}
            </div>
            <button onClick={() => setSelectedStudent(null)} className="mt-8 text-xl underline opacity-75">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Kiosk;
