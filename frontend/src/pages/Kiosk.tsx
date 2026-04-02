import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Kiosk: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [kioskRoom, setKioskRoom] = useState<any>(null);
  const { login } = useAuth();

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

  const handlePassRequest = async (toRoom: any, toRoomId: string) => {
    try {
      await api.post('/passes/request', { fromRoomId: kioskRoom.id, toRoomId, type: toRoom.defaultPassType });
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
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl w-full bg-white p-12 rounded-3xl shadow-xl border border-slate-100 text-center"
        >
          <h1 className="text-4xl font-black mb-4 text-slate-900 tracking-tight">Setup <span className="text-blue-600">Kiosk Mode</span></h1>
          <p className="text-slate-500 mb-10 font-medium">Select the room where this device is located.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleKioskSetup(room)}
                className="bg-slate-50 p-6 rounded-2xl border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-slate-700 hover:text-blue-700"
              >
                {room.name}
                <div className="text-xs font-medium opacity-50 uppercase mt-1">Room {room.number}</div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 font-sans select-none overflow-hidden">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-end mb-16 border-b border-white/10 pb-8"
        >
          <div>
            <h1 className="text-6xl font-black uppercase tracking-tighter text-blue-500 leading-none">KIOSK</h1>
            <p className="text-3xl text-slate-400 font-bold mt-2 uppercase tracking-wide">{kioskRoom.name}</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-mono font-black tracking-tighter">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-slate-500 uppercase tracking-[0.2em] font-bold text-sm mt-1">{new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</div>
          </div>
        </motion.header>

        <AnimatePresence mode="wait">
          {!selectedStudent ? (
            <motion.div
              key="students"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
            >
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => handleStudentSelect(student)}
                  className="bg-slate-900 border-2 border-white/5 text-white p-10 rounded-[2rem] shadow-2xl font-black text-2xl hover:border-blue-500 hover:bg-slate-800 hover:-translate-y-2 active:scale-95 transition-all duration-300"
                >
                  <div className="text-blue-500 text-xs font-mono mb-2 opacity-40">{student.studentId}</div>
                  {student.firstName}
                  <div className="text-lg opacity-60 font-medium">{student.lastName}</div>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="rooms"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="text-center flex-1 flex flex-col justify-center py-10"
            >
              <div className="mb-16">
                <h2 className="text-7xl font-black mb-4 tracking-tighter">Hello, <span className="text-blue-500">{selectedStudent.firstName}</span>!</h2>
                <p className="text-3xl text-slate-400 font-bold uppercase tracking-widest">Where are you headed?</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
                {rooms.filter(r => r.id !== kioskRoom.id).map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handlePassRequest(room, room.id)}
                    className="bg-blue-600 border-b-8 border-blue-900 p-12 rounded-[2.5rem] shadow-2xl font-black text-3xl hover:bg-blue-500 hover:-translate-y-2 active:translate-y-1 active:border-b-0 transition-all uppercase tracking-tight"
                  >
                    {room.name}
                    <div className="text-xs opacity-50">{room.defaultPassType}</div>
                  </button>
                ))}
              </div>
              <div className="mt-24">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="bg-white/5 text-slate-500 px-12 py-5 rounded-full font-black uppercase tracking-[0.3em] text-lg hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Kiosk;
