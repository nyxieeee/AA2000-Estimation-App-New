import React, { useState, useMemo } from 'react';
import type { Project } from '../../App';
import { getRoleTheme } from '../../utils/RoleTheme';

interface CalendarViewProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  userRole: string;
}

const statusConfig: Record<string, { color: string; bg: string; dot: string }> = {
  'In Progress':         { color: '#2563EB', bg: 'rgba(37,99,235,0.08)',   dot: '#2563EB' },
  'Pending':             { color: '#D97706', bg: 'rgba(217,119,6,0.08)',   dot: '#D97706' },
  'Completed':           { color: '#059669', bg: 'rgba(5,150,105,0.08)',   dot: '#059669' },
  'Finalized - Approved':{ color: '#059669', bg: 'rgba(5,150,105,0.08)',   dot: '#059669' },
  'Finalized - Rejected':{ color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   dot: '#DC2626' },
  'Finalized':           { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)',  dot: '#7C3AED' },
};

export default function CalendarView({ projects, onSelectProject, userRole }: CalendarViewProps) {
  const theme = getRoleTheme(userRole);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const actualProjects = useMemo(() => {
    return projects.filter(p => p.buildingType !== 'Other');
  }, [projects]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month details
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // Create calendar cells array
  const cells = useMemo(() => {
    const arr = [];
    // Previous Month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      arr.push({ day: d, isCurrentMonth: false, dateString });
    }
    // Current Month days
    for (let d = 1; d <= totalDays; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      arr.push({ day: d, isCurrentMonth: true, dateString });
    }
    // Next Month padding days
    const totalCellsSoFar = arr.length;
    const nextMonthPadding = 42 - totalCellsSoFar; // Grid is 6 rows * 7 columns = 42 cells
    for (let d = 1; d <= nextMonthPadding; d++) {
      const dateString = `${year}-${String(month + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      arr.push({ day: d, isCurrentMonth: false, dateString });
    }
    return arr;
  }, [year, month, firstDayIndex, totalDays, prevMonthTotalDays]);

  // Group projects by date
  const projectsByDate = useMemo(() => {
    const map: Record<string, Project[]> = {};
    actualProjects.forEach(proj => {
      if (proj.startDate) {
        // Normalize startDate string format from YYYY-MM-DD
        const dateStr = proj.startDate;
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(proj);
      }
    });
    return map;
  }, [actualProjects]);

  return (
    <div className="px-6 pt-6 pb-10 space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ color: '#0F172A', fontFamily: 'Manrope, Inter, sans-serif' }}
          >
            Survey Calendar
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            View and manage site surveys scheduled on timeline
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Filter status:</span>
          {['ALL', 'Pending', 'In Progress', 'Completed'].map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200"
              style={
                selectedStatus === status
                  ? { background: theme.primary, color: '#fff', boxShadow: `0 4px 10px ${theme.primary}20` }
                  : { background: 'rgba(241,245,249,0.9)', color: '#64748B' }
              }
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar container */}
      <div
        className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden animate-fade-in-up delay-75"
      >
        {/* Calendar Header with Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">
              {monthName} {year}
            </h2>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-[10px] font-extrabold uppercase bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-all"
            >
              Today
            </button>
          </div>

          <div className="flex gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar grid container wrapper for mobile */}
        <div className="overflow-x-auto w-full">
          <div className="min-w-[640px] sm:min-w-0">
            {/* Days of Week */}
            <div className="grid grid-cols-7 border-b border-slate-100 text-center py-2 bg-slate-50/20">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <span key={d} className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {d}
                </span>
              ))}
            </div>

            {/* Grid Cells */}
            <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-slate-100 bg-slate-50/20">
          {cells.map((cell, idx) => {
            const dayProjects = projectsByDate[cell.dateString] || [];
            const filteredProjects = dayProjects.filter(p => {
              if (selectedStatus === 'ALL') return true;
              return p.status === selectedStatus;
            });
            const isToday = new Date().toDateString() === new Date(year, month + (cell.isCurrentMonth ? 0 : cell.dateString.includes('-' + (month + 2)) ? 1 : -1), cell.day).toDateString();

            return (
              <div
                key={idx}
                className="min-h-[100px] p-2 flex flex-col justify-between transition-all bg-white relative hover:bg-slate-50/30"
              >
                {/* Date number */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${
                      !cell.isCurrentMonth ? 'text-slate-300' :
                      isToday ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' :
                      'text-slate-700'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {filteredProjects.length > 0 && (
                    <span className="text-[9px] font-bold text-slate-400 px-1 bg-slate-100 rounded">
                      {filteredProjects.length}
                    </span>
                  )}
                </div>

                {/* Projects on this day */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[70px] no-scrollbar">
                  {filteredProjects.map(proj => {
                    const cfg = statusConfig[proj.status] || Object.entries(statusConfig).find(([key]) => proj.status && proj.status.includes(key))?.[1] || {
                      color: '#64748B', bg: 'rgba(100,116,139,0.08)', dot: '#64748B'
                    };
                    return (
                      <div
                        key={proj.id}
                        onClick={() => onSelectProject(proj)}
                        className="text-[9.5px] font-bold py-1 px-1.5 rounded-lg border border-transparent transition-all cursor-pointer truncate text-left hover:scale-[1.02] flex items-center gap-1.5"
                        style={{ background: cfg.bg, color: cfg.color }}
                        title={`${proj.name} (${proj.clientName})`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
                        <span className="truncate">{proj.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
