import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Settings, Users, Home, ClipboardList, PlusCircle, Upload, Plus, Trash2, XCircle } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'rooms' | 'settings' | 'analytics' | 'encounters'>('students');
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [blockedPairs, setBlockedPairs] = useState<any[]>([]);
  const [csvContent, setCsvContent] = useState('');
  const [newRoom, setNewRoom] = useState({ name: '', number: '', teacherId: '', approvalRequired: true, capacity: 0 });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    if (activeTab === 'students') {
      const res = await api.get('/users/students');
      setStudents(res.data);
    } else if (activeTab === 'rooms') {
      const res = await api.get('/rooms');
      setRooms(res.data);
      setTeachers(res.data.map((r: any) => r.teacher).filter(Boolean));
    } else if (activeTab === 'analytics') {
      const res = await api.get('/passes/analytics');
      setAnalytics(res.data);
    } else if (activeTab === 'encounters') {
      const res = await api.get('/users/students');
      setStudents(res.data);
      // Logic to find all blocked pairs would be here
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
      setNewRoom({ name: '', number: '', teacherId: '', approvalRequired: true });
      fetchData();
    } catch (err) {
      alert('Failed to create room');
    }
  };

  if (user?.role !== 'ADMIN') return <div>Access Denied</div>;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <nav className="w-64 bg-slate-900 text-white p-6 space-y-4">
        <h2 className="text-2xl font-bold mb-8 text-blue-400">Admin Panel</h2>
        <button onClick={() => setActiveTab('students')} className={`flex items-center gap-3 w-full p-2 rounded ${activeTab === 'students' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
          <Users size={20} /> Students
        </button>
        <button onClick={() => setActiveTab('rooms')} className={`flex items-center gap-3 w-full p-2 rounded ${activeTab === 'rooms' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
          <Home size={20} /> Rooms
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 w-full p-2 rounded ${activeTab === 'settings' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
          <Settings size={20} /> Settings
        </button>
        <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-3 w-full p-2 rounded ${activeTab === 'analytics' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
          <ClipboardList size={20} /> Analytics
        </button>
        <button onClick={() => setActiveTab('encounters')} className={`flex items-center gap-3 w-full p-2 rounded ${activeTab === 'encounters' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
          <XCircle size={20} /> Encounters
        </button>
      </nav>

      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'students' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Student Management</h1>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Upload size={20} /> Import Students (CSV)
              </h2>
              <textarea
                className="w-full h-32 border p-2 mb-4 font-mono text-sm"
                placeholder="firstName,lastName,studentId,password,grade"
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
              />
              <button onClick={handleImport} className="bg-blue-600 text-white px-4 py-2 rounded">Import</button>
            </div>
            <div className="bg-white rounded-lg shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-4 text-left">ID</th>
                    <th className="p-4 text-left">Name</th>
                    <th className="p-4 text-left">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="p-4">{s.studentId}</td>
                      <td className="p-4 font-medium">
                        {s.firstName} {s.lastName}
                        {s.isFlagged && <span className="ml-2 text-red-500" title={s.flagReason}>⚠️</span>}
                      </td>
                      <td className="p-4">{s.grade}</td>
                      <td className="p-4">
                        <button
                          onClick={() => toggleFlag(s.id, s.isFlagged)}
                          className={`text-xs px-2 py-1 rounded ${s.isFlagged ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {s.isFlagged ? 'Unflag' : 'Flag'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'encounters' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Encounter Prevention</h1>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">Block Student Pair</h2>
              <div className="grid grid-cols-2 gap-4">
                <select id="student1" className="border p-2 rounded">
                  {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                </select>
                <select id="student2" className="border p-2 rounded">
                  {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                </select>
              </div>
              <button
                onClick={() => {
                  const s1 = (document.getElementById('student1') as HTMLSelectElement).value;
                  const s2 = (document.getElementById('student2') as HTMLSelectElement).value;
                  handleBlock(s1, s2);
                }}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
              >
                Block Pair
              </button>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Pass Analytics</h1>
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
                className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <Upload size={20} /> Export CSV
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold mb-4">Total Passes by Room</h2>
                <div className="space-y-4">
                  {analytics.map((item) => (
                    <div key={item.room}>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{item.room}</span>
                        <span>{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100, item.count * 5)}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Room Management</h1>
            <form onSubmit={createRoom} className="bg-white p-6 rounded-lg shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium">Room Name</label>
                <input name="roomName" type="text" className="w-full border p-2 rounded" value={newRoom.name} onChange={(e) => setNewRoom({...newRoom, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium">Number</label>
                <input name="roomNumber" type="text" className="w-full border p-2 rounded" value={newRoom.number} onChange={(e) => setNewRoom({...newRoom, number: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium">Capacity</label>
                <input type="number" className="w-full border p-2 rounded" value={newRoom.capacity} onChange={(e) => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})} />
              </div>
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 justify-center">
                <Plus size={20} /> Add Room
              </button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white p-4 rounded-lg shadow-sm border">
                  <h3 className="text-xl font-bold">{room.name}</h3>
                  <p className="text-gray-500">#{room.number}</p>
                  <div className="mt-4 flex gap-2">
                    <button className="text-red-600 p-2 hover:bg-red-50 rounded">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
