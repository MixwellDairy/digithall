import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import socket from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, LogOut, Navigation, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [activePass, setActivePass] = useState<any>(null);

  const [allActivePasses, setAllActivePasses] = useState<any[]>([]);
  const [passHistory, setPassHistory] = useState<any[]>([]);
  const [dailyCredits, setDailyCredits] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [currentRoom, setCurrentRoom] = useState<string>(localStorage.getItem('student_location') || '');
  const [roomStatus, setRoomStatus] = useState<any>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [staffPassForm, setStaffPassForm] = useState({ studentId: '', toRoomId: '', type: 'ONE_WAY' });
  const [showScheduleModal, setShowScheduleModal] = useState<any>(null);
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    fetchData();
    socket.on('pass-updated', (pass) => {
      fetchData();
      if (pass.status === 'PENDING' && user?.role === 'TEACHER' && pass.toRoom.teacherId === user.id) {
        new Notification(`New Pass Request from ${pass.student.firstName}`);
      }
    });

    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    return () => {
      socket.off('pass-updated');
    };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
    const roomsRes = await api.get('/rooms');
    setRooms(roomsRes.data);

    if (user.role === 'STUDENT') {
      const activeRes = await api.get('/passes/active');
      const studentPass = activeRes.data.find((p: any) => p.studentId === user.id);
      setActivePass(studentPass);

      const historyRes = await api.get('/passes/history');
      setPassHistory(historyRes.data);

      const settingsRes = await api.get('/settings');
      const limitSetting = settingsRes.data.find((s: any) => s.key === 'DAILY_PASS_LIMIT');
      const limit = limitSetting ? parseFloat(limitSetting.value) : 5.0;
      setDailyLimit(limit);

      const passCount = historyRes.data
        .filter((p: any) => new Date(p.createdAt).toDateString() === new Date().toDateString())
        .reduce((acc: number, pass: any) => acc + (pass.type === 'ONE_WAY' ? 0.5 : 1.0), 0);
      setDailyCredits(Math.max(0, limit - passCount));
    }

    if (user.role === 'TEACHER' || user.role === 'ADMIN' || user.role === 'HALL_MONITOR') {
      const activeRes = await api.get('/passes/active');
      setAllActivePasses(activeRes.data);

      if (user.role === 'TEACHER') {
        const myRoom = roomsRes.data.find((r: any) => r.teacherId === user.id);
        setRoomStatus(myRoom);
      }

      const studentsRes = await api.get('/users');
      setAllStudents(studentsRes.data.filter((u: any) => u.role === 'STUDENT'));
    }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const handlePassRequest = async (toRoomId: string, type: 'ONE_WAY' | 'ROUND_TRIP', scheduledTime?: string) => {
    if (!currentRoom) {
      alert('Please set your current room first.');
      return;
    }
    try {
      await api.post('/passes/request', { fromRoomId: currentRoom, toRoomId, type, scheduledTime });
      alert(scheduledTime ? 'Pass scheduled!' : 'Pass requested!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request pass');
    }
  };

  const handlePassUpdate = async (passId: string, status: string) => {
    try {
      await api.put(`/passes/${passId}/status`, { status });
      fetchData();
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to update pass';
      alert(errorMessage || 'Failed to update pass');
    }
  };

  const toggleRoomStatus = async () => {
    if (!roomStatus) return;
    const res = await api.put(`/rooms/${roomStatus.id}/status`, {
      isClosed: !roomStatus.isClosed,
      approvalRequired: roomStatus.approvalRequired
    });
    setRoomStatus(res.data);
  };

  const handleStaffPassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffPassForm.studentId || !staffPassForm.toRoomId) return;
    try {
      await api.post('/passes/request', {
        ...staffPassForm,
        fromRoomId: roomStatus?.id || rooms[0]?.id
      });
      alert('Pass issued successfully!');
      setStaffPassForm({ studentId: '', toRoomId: '', type: 'ONE_WAY' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to issue pass');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-between items-center mb-10 bg-white p-5 rounded-2xl shadow-sm border border-slate-100"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <UserIcon className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="font-black text-2xl text-slate-900 tracking-tight">{user?.firstName} {user?.lastName}</h1>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded">{user?.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user?.role === 'ADMIN' && (
            <a href="/admin" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Admin Panel</a>
          )}
          <button
            onClick={logout}
            aria-label="Logout"
            className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl font-bold transition-colors"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {user?.role === 'STUDENT' && (
          <div className="col-span-full space-y-10">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Remaining Credits</h2>
                <div className="text-3xl font-black text-blue-600">{dailyCredits} <span className="text-sm text-gray-400">/ {dailyLimit}</span></div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <label htmlFor="currentRoomSelect" className="text-sm font-medium">My Current Room:</label>
                <select
                  id="currentRoomSelect"
                  value={currentRoom}
                  onChange={(e) => {
                    setCurrentRoom(e.target.value);
                    localStorage.setItem('student_location', e.target.value);
                  }}
                  className="border rounded p-1 text-sm"
                >
                  <option value="">Select Room</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </motion.div>

            <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Request a <span className="text-blue-600">Pass</span></h2>

            <AnimatePresence mode="wait">
            {activePass ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-10 rounded-3xl shadow-2xl shadow-blue-200 relative group"
              >
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                       <Navigation className="text-white animate-pulse" size={40} />
                    </div>
                    <div>
                      <h3 className="text-4xl font-black mb-1 uppercase tracking-tight">{activePass.toRoom.name}</h3>
                      <div className="flex items-center gap-2 opacity-80 font-medium">
                         <Timer size={16} />
                         <span>Started {new Date(activePass.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handlePassUpdate(activePass.id, 'COMPLETED')} className="bg-white text-blue-600 font-black text-xl px-10 py-5 rounded-2xl hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-xl">
                    COMPLETE PASS
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6"
              >
                {rooms.map((room, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={room.id}
                    className="relative group"
                  >
                    <button
                      disabled={room.isClosed}
                      onClick={() => handlePassRequest(room.id, room.defaultPassType)}
                      className={`w-full p-6 rounded-2xl shadow-sm transition-all text-center border-2 ${
                        room.isClosed ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white hover:bg-blue-50 text-slate-900 border-white hover:border-blue-200 hover:shadow-md'
                      }`}
                    >
                      <div className="font-black text-lg mb-1 uppercase tracking-tight">{room.name}</div>
                      <div className="text-xs font-bold text-blue-500 uppercase tracking-widest opacity-60">{room.teacher?.lastName}</div>
                      {room.capacity > 0 && <div className="text-[10px] mt-2 font-mono bg-slate-100 rounded py-0.5 inline-block px-2">CAP: {room.capacity}</div>}
                    </button>
                    <button
                      onClick={() => setShowScheduleModal(room)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-blue-100 text-blue-600 p-1 rounded text-[10px]"
                    >
                      Sched
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
            </AnimatePresence>

            <div className="bg-white p-6 rounded-lg shadow mt-8">
              <h2 className="text-xl font-bold mb-4">Recent History</h2>
              <div className="space-y-3">
                {passHistory.map(p => (
                  <div key={p.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <div className="font-medium">To: {p.toRoom.name}</div>
                      <div className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleString()}</div>
                    </div>
                    <div className={`text-sm px-2 py-1 rounded ${p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'HALL_MONITOR') && (
          <div className="col-span-full bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Active Passes ({allActivePasses.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="py-2">Student</th>
                    <th className="py-2">From</th>
                    <th className="py-2">To</th>
                    <th className="py-2">Time</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allActivePasses.map((pass) => (
                    <tr key={pass.id} className={`border-b hover:bg-gray-50 ${pass.isOvertime ? 'bg-red-50' : ''}`}>
                      <td className="py-3 font-medium">
                        {pass.student.firstName} {pass.student.lastName}
                        {pass.student.isFlagged && <span className="ml-2 text-red-500 font-bold" title={pass.student.flagReason}>⚠️</span>}
                        {pass.isOvertime && <span className="ml-2 bg-red-600 text-white text-[10px] px-1 rounded">LATE</span>}
                      </td>
                      <td className="py-3">{pass.fromRoom.name}</td>
                      <td className="py-3">{pass.toRoom.name}</td>
                      <td className="py-3 text-sm text-gray-500">{new Date(pass.startTime).toLocaleTimeString()}</td>
                      <td className="py-3">
                        <button onClick={() => handlePassUpdate(pass.id, 'COMPLETED')} className="text-red-600 hover:underline">Complete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
          <div className="space-y-6">
            {roomStatus && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-black mb-4 uppercase tracking-tight">Room Status: {roomStatus.name}</h2>
                <button
                  onClick={toggleRoomStatus}
                  className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${
                    roomStatus.isClosed ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                  }`}
                >
                  {roomStatus.isClosed ? 'CLOSED' : 'OPEN'}
                </button>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-black mb-6 uppercase tracking-tight">Issue Student Pass</h2>
              <form onSubmit={handleStaffPassSubmit} className="space-y-4">
                <div>
                  <label htmlFor="staffStudentSelect" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Student</label>
                  <select
                    id="staffStudentSelect"
                    className="w-full border border-slate-100 bg-slate-50 rounded-xl p-3 font-bold"
                    value={staffPassForm.studentId}
                    onChange={e => setStaffPassForm({...staffPassForm, studentId: e.target.value})}
                    required
                  >
                    <option value="">Select Student</option>
                    {allStudents.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="staffRoomSelect" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Destination</label>
                  <select
                    id="staffRoomSelect"
                    className="w-full border border-slate-100 bg-slate-50 rounded-xl p-3 font-bold"
                    value={staffPassForm.toRoomId}
                    onChange={e => setStaffPassForm({...staffPassForm, toRoomId: e.target.value})}
                    required
                  >
                    <option value="">Select Room</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStaffPassForm({...staffPassForm, type: 'ONE_WAY'})}
                      className={`py-3 rounded-xl font-bold border-2 transition-all ${staffPassForm.type === 'ONE_WAY' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'}`}
                    >
                      ONE WAY
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffPassForm({...staffPassForm, type: 'ROUND_TRIP'})}
                      className={`py-3 rounded-xl font-bold border-2 transition-all ${staffPassForm.type === 'ROUND_TRIP' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'}`}
                    >
                      ROUND TRIP
                    </button>
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all">
                  Issue Pass
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full"
            >
              <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Schedule Pass</h2>
              <p className="text-slate-500 mb-6 font-medium">Planning a trip to <span className="text-blue-600">{showScheduleModal.name}</span> later?</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Time</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-100 bg-slate-50 rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowScheduleModal(null)}
                    className="flex-1 py-4 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if(scheduledTime) {
                        handlePassRequest(showScheduleModal.id, showScheduleModal.defaultPassType, scheduledTime);
                        setShowScheduleModal(null);
                        setScheduledTime('');
                      }
                    }}
                    className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-100"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
