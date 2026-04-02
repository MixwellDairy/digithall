import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Settings, Users, Home, ClipboardList, Upload, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'rooms' | 'settings' | 'analytics' | 'encounters'>('students');
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [csvContent, setCsvContent] = useState('');
  const [newRoom, setNewRoom] = useState({ name: '', number: '', teacherId: '', approvalRequired: true, capacity: 0, defaultPassType: 'ROUND_TRIP' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    if (activeTab === 'students') {
      const res = await api.get('/users');
      setStudents(res.data.filter((u: any) => u.role === 'STUDENT'));
    } else if (activeTab === 'rooms') {
      const res = await api.get('/rooms');
      setRooms(res.data);

    } else if (activeTab === 'analytics') {
      const res = await api.get('/passes/analytics');
      setAnalytics(res.data);
    } else if (activeTab === 'encounters') {
      const res = await api.get('/users');
      setStudents(res.data.filter((u: any) => u.role === 'STUDENT'));
    }
  };

  const handleImport = async () => {
    try {
      await api.post('/users/import-students', { csvContent });
      alert('Students imported!');
      setCsvContent('');
      fetchData();
    } catch (err) {
      alert('Import failed');
    }
  };

  const handleBlock = async (id1: string, id2: string) => {
    try {
      await api.post('/users/block', { studentId1: id1, studentId2: id2 });
      alert('Students blocked!');
    } catch (err) {
      alert('Failed to block');
    }
  };

  const toggleFlag = async (studentId: string, currentFlagged: boolean) => {
    const reason = !currentFlagged ? prompt("Reason for flagging?") : null;
    if (!currentFlagged && reason === null) return;
    try {
      await api.put(`/users/${studentId}/flag`, { isFlagged: !currentFlagged, flagReason: reason });
      fetchData();
    } catch (err) {
      alert('Failed to update flag');
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/rooms', newRoom);
      setNewRoom({ name: '', number: '', teacherId: '', approvalRequired: true, capacity: 0, defaultPassType: 'ROUND_TRIP' });
      fetchData();
    } catch (err) {
      alert('Failed to create room');
    }
  };

  if (user?.role !== 'ADMIN') return <div>Access Denied</div>;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <motion.nav
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-72 bg-slate-900 text-white p-8 space-y-2 border-r border-white/5"
      >
        <div className="flex items-center gap-3 mb-12 px-2">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl">D</div>
           <h2 className="text-2xl font-black tracking-tighter">DigiHall <span className="text-blue-500 italic text-sm">PRO</span></h2>
        </div>
        {[
          { id: 'students', icon: Users, label: 'Students' },
          { id: 'rooms', icon: Home, label: 'Rooms' },
          { id: 'encounters', icon: ShieldAlert, label: 'Encounters' },
          { id: 'analytics', icon: ClipboardList, label: 'Analytics' },
          { id: 'settings', icon: Settings, label: 'Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-4 w-full px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={22} className={activeTab === tab.id ? 'text-white' : 'text-slate-500'} />
            {tab.label}
          </button>
        ))}
      </motion.nav>

      <main className="flex-1 p-12 overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100">
        <AnimatePresence mode="wait">
        {activeTab === 'students' && (
          <motion.div
            key="students"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Student <span className="text-blue-600">Management</span></h1>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
                <Upload size={24} className="text-blue-600" /> Import Students (CSV)
              </h2>
              <textarea
                className="w-full h-32 border border-slate-200 rounded-2xl p-4 mb-4 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="firstName,lastName,studentId,password,grade"
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
              />
              <button onClick={handleImport} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Import Students</button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-6 text-left text-xs font-black uppercase tracking-widest text-slate-400">ID</th>
                    <th className="p-6 text-left text-xs font-black uppercase tracking-widest text-slate-400">Name</th>
                    <th className="p-6 text-left text-xs font-black uppercase tracking-widest text-slate-400">Grade</th>
                    <th className="p-6 text-right text-xs font-black uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 font-mono text-sm text-slate-500">{s.studentId}</td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">{s.firstName[0]}{s.lastName[0]}</div>
                           <span className="font-bold text-slate-800">{s.firstName} {s.lastName}</span>
                           {s.isFlagged && <span className="text-red-500" title={s.flagReason}><ShieldAlert size={16} /></span>}
                        </div>
                      </td>
                      <td className="p-6 text-slate-600 font-medium">Grade {s.grade}</td>
                      <td className="p-6">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toggleFlag(s.id, s.isFlagged)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${s.isFlagged ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {s.isFlagged ? 'Unflag' : 'Flag'}
                          </button>
                          <button
                            onClick={async () => {
                              if(confirm('Delete student?')) {
                                await api.delete(`/users/${s.id}`);
                                fetchData();
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'encounters' && (
          <motion.div
            key="encounters"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Encounter <span className="text-red-600">Prevention</span></h1>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-2xl">
              <h2 className="text-xl font-bold mb-6 text-slate-800">Block Student Pair</h2>
              <p className="text-slate-500 mb-6">Select two students who should not be out in the hallway at the same time.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Student A</label>
                  <select id="student1" className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold text-slate-700">
                    {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Student B</label>
                  <select id="student2" className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold text-slate-700">
                    {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  const s1 = (document.getElementById('student1') as HTMLSelectElement).value;
                  const s2 = (document.getElementById('student2') as HTMLSelectElement).value;
                  handleBlock(s1, s2);
                }}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                Create Prevention Rule
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Pass <span className="text-blue-600">Analytics</span></h1>
              <button
                onClick={async () => {
                  const res = await api.get('/passes/export', { responseType: 'blob' });
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', 'pass-history.csv');
                  document.body.appendChild(link);
                  link.click();
                }}
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
              >
                <Upload size={20} /> Export CSV History
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <h2 className="text-xl font-black mb-8 text-slate-800 uppercase tracking-tight">Total Passes by Room</h2>
                <div className="space-y-6">
                  {analytics.map((item) => (
                    <div key={item.room}>
                      <div className="flex justify-between mb-2 items-end">
                        <span className="font-bold text-slate-700">{item.room}</span>
                        <span className="font-mono text-blue-600 font-bold">{item.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, item.count * 5)}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full"
                        ></motion.div>
                      </div>
                    </div>
                  ))}
                  {analytics.length === 0 && <p className="text-slate-400 font-medium text-center py-10">No pass data available yet.</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">System <span className="text-blue-600">Settings</span></h1>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-md">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Daily Pass Limit</label>
              <div className="flex gap-4">
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold text-slate-700"
                  defaultValue={5}
                  id="daily-limit-input"
                />
                <button
                  onClick={async () => {
                    const val = (document.getElementById('daily-limit-input') as HTMLInputElement).value;
                    await api.post('/settings', { key: 'DAILY_PASS_LIMIT', value: val });
                    alert('Setting updated!');
                  }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 whitespace-nowrap"
                >
                  Save Changes
                </button>
              </div>
              <p className="text-slate-400 text-xs mt-4 font-medium">This limit applies to all students unless overridden individually.</p>
            </div>
          </motion.div>
        )}

        {activeTab === 'rooms' && (
          <motion.div
            key="rooms"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Room <span className="text-blue-600">Management</span></h1>
            <form onSubmit={createRoom} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Room Name</label>
                <input name="roomName" type="text" className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold text-slate-700" value={newRoom.name} onChange={(e) => setNewRoom({...newRoom, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Number</label>
                <input name="roomNumber" type="text" className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold text-slate-700" value={newRoom.number} onChange={(e) => setNewRoom({...newRoom, number: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Capacity</label>
                <input type="number" className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold text-slate-700" value={newRoom.capacity} onChange={(e) => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Type</label>
                <select className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold text-slate-700" value={newRoom.defaultPassType} onChange={(e) => setNewRoom({...newRoom, defaultPassType: e.target.value})}>
                   <option value="ROUND_TRIP">Round Trip</option>
                   <option value="ONE_WAY">One Way</option>
                </select>
              </div>
              <button type="submit" className="bg-blue-600 text-white px-6 py-4 rounded-xl font-bold flex items-center gap-2 justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                <Plus size={20} /> Add Room
              </button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <motion.div
                  layout
                  key={room.id}
                  className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                     <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <Home className="text-blue-600" size={24} />
                     </div>
                     <button
                        onClick={async () => {
                          if(confirm('Delete room?')) {
                            await api.delete(`/rooms/${room.id}`);
                            fetchData();
                          }
                        }}
                        className="p-2 text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={20} />
                      </button>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">{room.name}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded">#{room.number || 'N/A'}</span>
                    <span className="text-xs font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded">Cap: {room.capacity || '∞'}</span>
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{room.defaultPassType}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AdminPanel;
