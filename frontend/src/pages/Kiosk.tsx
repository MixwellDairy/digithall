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
    <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-end mb-12 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter text-blue-500">Kiosk</h1>
            <p className="text-2xl text-slate-400 font-medium">{kioskRoom.name}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-mono font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-slate-500 uppercase tracking-widest text-sm">{new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</div>
          </div>
        </header>

        {!selectedStudent ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => handleStudentSelect(student)}
                className="bg-slate-900 border-2 border-slate-800 text-white p-8 rounded-2xl shadow-xl font-bold text-xl hover:border-blue-500 hover:bg-slate-800 hover:-translate-y-1 transition-all"
              >
                <div className="text-blue-500 text-xs uppercase mb-1 opacity-50">{student.studentId}</div>
                {student.firstName} {student.lastName}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-12">
              <h2 className="text-5xl font-bold mb-2">Hello, {selectedStudent.firstName}!</h2>
              <p className="text-2xl text-slate-400">Where are you headed?</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {rooms.filter(r => r.id !== kioskRoom.id).map((room) => (
                <button
                  key={room.id}
                  onClick={() => handlePassRequest(room.id)}
                  className="bg-blue-600 border-b-4 border-blue-800 p-10 rounded-2xl shadow-2xl font-black text-2xl hover:bg-blue-500 hover:-translate-y-1 active:translate-y-1 active:border-b-0 transition-all uppercase tracking-tight"
                >
                  {room.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedStudent(null)}
              className="mt-16 bg-slate-800 text-slate-400 px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-colors"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Kiosk;
