import { useState } from 'react';
import type { Project } from '../../App';

interface Props {
  onClose: () => void;
  onCreate: (project: Project) => void;
}

export default function CreateProjectModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [buildingType, setBuildingType] = useState('Office');
  const [floors, setFloors] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name,
      clientName: client,
      clientEmail: email,
      clientPhone: phone,
      location,
      buildingType,
      floors,
      status: 'Pending',
      startDate: new Date().toISOString().split('T')[0],
      assignedTechnicians: [],
      createdAt: new Date().toISOString(),
    };
    onCreate(newProject);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    color: '#1E293B',
    fontSize: '13px',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#94A3B8',
    marginBottom: '6px',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-[#1E3A8A]">
              📁
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Create New Project</h2>
              <p className="text-[10px] font-bold text-slate-400">Initialize a new site survey project</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Project Name</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. BGC CCTV Site Survey" required />
            </div>
            <div>
              <label style={labelStyle}>Company / Client Name</label>
              <input value={client} onChange={e => setClient(e.target.value)} style={inputStyle} placeholder="e.g. MegaCorp Philippines" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Client Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="client@company.com" required />
            </div>
            <div>
              <label style={labelStyle}>Client Contact Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="e.g. 0917 123 4567" required />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Project Location Address</label>
            <input value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} placeholder="e.g. 5th Ave, Taguig, Metro Manila" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Building Type</label>
              <select value={buildingType} onChange={e => setBuildingType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option>Office</option>
                <option>Retail</option>
                <option>Warehouse</option>
                <option>School</option>
                <option>Hospital</option>
                <option>Residential</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Number of Floors</label>
              <input type="number" min={1} value={floors} onChange={e => setFloors(Number(e.target.value))} style={inputStyle} required />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-50">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm"
              style={{ background: '#1E3A8A' }}
            >
              Create Project
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}