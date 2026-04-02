import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import socket from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle, XCircle, User as UserIcon, LogOut } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [activePass, setActivePass] = useState<any>(null);
  const [passRequests, setPassRequests] = useState<any[]>([]);
  const [allActivePasses, setAllActivePasses] = useState<any[]>([]);
  const [passHistory, setPassHistory] = useState<any[]>([]);
  const [dailyCredits, setDailyCredits] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [currentRoom, setCurrentRoom] = useState<string>(localStorage.getItem('student_location') || '');
  const [roomStatus, setRoomStatus] = useState<any>(null);

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
    await api.put(`/passes/${passId}/status`, { status });
    fetchData();
  };

  const toggleRoomStatus = async () => {
    if (!roomStatus) return;
    const res = await api.put(`/rooms/${roomStatus.id}/status`, {
      isClosed: !roomStatus.isClosed,
      approvalRequired: roomStatus.approvalRequired
    });
    setRoomStatus(res.data);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <UserIcon className="text-blue-600" />
          <span className="font-bold text-xl">{user?.firstName} {user?.lastName} ({user?.role})</span>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium">
          <LogOut size={20} /> Logout
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {user?.role === 'STUDENT' && (
          <div className="col-span-full space-y-8">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-600">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Remaining Credits</h2>
                <div className="text-3xl font-black text-blue-600">{dailyCredits} <span className="text-sm text-gray-400">/ {dailyLimit}</span></div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-sm font-medium">My Current Room:</span>
                <select
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
            </div>
            <h2 className="text-2xl font-bold mb-4">Request a Pass</h2>
            {activePass ? (
              <div className="bg-blue-600 text-white p-6 rounded-lg shadow-md animate-pulse">
                <h3 className="text-xl font-bold mb-2">Active Pass: {activePass.toRoom.name}</h3>
                <p>Started at: {new Date(activePass.startTime).toLocaleTimeString()}</p>
                <button onClick={() => handlePassUpdate(activePass.id, 'COMPLETED')} className="mt-4 bg-white text-blue-600 font-bold px-4 py-2 rounded">
                  End Pass
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {rooms.map((room) => (
                  <div key={room.id} className="relative group">
                    <button
                      disabled={room.isClosed}
                      onClick={() => handlePassRequest(room.id, 'ROUND_TRIP')}
                      className={`w-full p-4 rounded-lg shadow transition text-center ${
                        room.isClosed ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-blue-50 text-blue-700 border-2 border-blue-200'
                      }`}
                    >
                      <div className="font-bold">{room.name}</div>
                      <div className="text-xs opacity-75">{room.teacher?.lastName}</div>
                      {room.capacity > 0 && <div className="text-[10px] mt-1">Cap: {room.capacity}</div>}
                    </button>
                    <button
                      onClick={() => {
                        const time = prompt("Enter scheduled time (YYYY-MM-DD HH:MM)");
                        if(time) handlePassRequest(room.id, 'ROUND_TRIP', time);
                      }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-blue-100 text-blue-600 p-1 rounded text-[10px]"
                    >
                      Sched
                    </button>
                  </div>
                ))}
              </div>
            )}

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

        {user?.role === 'TEACHER' && roomStatus && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Room Control: {roomStatus.name}</h2>
            <button
              onClick={toggleRoomStatus}
              className={`w-full py-3 rounded-lg font-bold transition ${
                roomStatus.isClosed ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
              }`}
            >
              {roomStatus.isClosed ? 'Room is CLOSED' : 'Room is OPEN'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
