/**
 * Skeleton.tsx — Reusable contextual skeleton loader primitives
 * All variants match the exact dimensions of their real content counterparts.
 * Zero layout shift: containers use fixed/min heights.
 */

import React from 'react';

// ─── Base Skeleton Block ─────────────────────────────────────────────────────
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
  style?: React.CSSProperties;
  soft?: boolean; // use softer shimmer for tinted backgrounds
}

const radiusMap = {
  sm:  'var(--radius-sm)',
  md:  'var(--radius-md)',
  lg:  'var(--radius-lg)',
  xl:  'var(--radius-xl)',
  '2xl': 'var(--radius-2xl)',
  full: 'var(--radius-full)',
};

export function Skeleton({ width = '100%', height = 16, rounded = 'md', className = '', style = {}, soft = false }: SkeletonProps) {
  return (
    <div
      className={`${soft ? 'skeleton-soft' : 'skeleton'} ${className}`}
      style={{
        width,
        height,
        borderRadius: radiusMap[rounded],
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

// ─── Stat Card Skeleton ───────────────────────────────────────────────────────
// Matches StatCard in Dashboard.tsx
export function SkeletonStatCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex-1 min-w-0 bg-white rounded-2xl p-5 border animate-fade-in-up"
      style={{ borderColor: '#E2E8F0', animationDelay: `${delay}ms`, minHeight: 112 }}
    >
      <div className="flex items-start justify-between mb-4">
        <Skeleton width={80} height={10} rounded="full" />
        <Skeleton width={36} height={36} rounded="xl" />
      </div>
      <Skeleton width={48} height={28} rounded="lg" style={{ marginBottom: 8 }} />
      <Skeleton width={96} height={9} rounded="full" />
    </div>
  );
}

// ─── Company Row Skeleton ─────────────────────────────────────────────────────
// Matches company list rows in Home.tsx and CompanyDetail.tsx
export function SkeletonCompanyRow({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-2xl animate-fade-in-up"
      style={{ minHeight: 64, animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Skeleton width={40} height={40} rounded="xl" style={{ flexShrink: 0 }} />
        <div className="flex-1 space-y-2 min-w-0">
          <Skeleton width="45%" height={12} rounded="md" />
          <Skeleton width="65%" height={9}  rounded="full" />
          <div className="flex items-center gap-2 mt-1">
            <Skeleton width={80} height={5} rounded="full" />
            <Skeleton width={24} height={9} rounded="full" />
          </div>
        </div>
      </div>
      <Skeleton width={56} height={20} rounded="full" style={{ flexShrink: 0 }} />
    </div>
  );
}

// ─── Project Row Skeleton ─────────────────────────────────────────────────────
// Matches project table rows in Dashboard.tsx
export function SkeletonProjectRow({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl animate-fade-in-up"
      style={{ minHeight: 56, animationDelay: `${delay}ms` }}
    >
      <Skeleton width={32} height={32} rounded="lg" style={{ flexShrink: 0 }} />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Skeleton width="40%" height={12} rounded="md" />
        <Skeleton width="60%" height={9}  rounded="full" />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Skeleton width={64} height={20} rounded="full" />
        <Skeleton width={20} height={20} rounded="md" />
      </div>
    </div>
  );
}

// ─── Notification Row Skeleton ────────────────────────────────────────────────
export function SkeletonNotificationRow({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 animate-fade-in-up"
      style={{ minHeight: 60, animationDelay: `${delay}ms` }}
    >
      <Skeleton width={32} height={32} rounded="lg" style={{ flexShrink: 0 }} />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton width="55%" height={11} rounded="md" />
        <Skeleton width="75%" height={9}  rounded="full" />
        <Skeleton width={48} height={8}   rounded="full" />
      </div>
      <Skeleton width={16} height={16} rounded="md" style={{ flexShrink: 0, marginTop: 4 }} />
    </div>
  );
}

// ─── Calendar Event Skeleton ──────────────────────────────────────────────────
export function SkeletonCalendarEvent({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl animate-fade-in-up"
      style={{ minHeight: 52, animationDelay: `${delay}ms` }}
    >
      <Skeleton width={4} height={40} rounded="full" style={{ flexShrink: 0 }} />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Skeleton width="50%" height={11} rounded="md" />
        <Skeleton width="35%" height={9}  rounded="full" />
      </div>
      <Skeleton width={48} height={20} rounded="full" style={{ flexShrink: 0 }} />
    </div>
  );
}

// ─── Activity Item Skeleton ───────────────────────────────────────────────────
export function SkeletonActivityItem({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-start gap-3 animate-fade-in-up"
      style={{ minHeight: 48, animationDelay: `${delay}ms` }}
    >
      <div className="relative flex flex-col items-center">
        <Skeleton width={28} height={28} rounded="full" />
        <div className="w-px flex-1 mt-1" style={{ background: '#E2E8F0', minHeight: 16 }} />
      </div>
      <div className="flex-1 space-y-1.5 pb-4 min-w-0">
        <Skeleton width="55%" height={11} rounded="md" />
        <Skeleton width="40%" height={9}  rounded="full" />
      </div>
    </div>
  );
}

// ─── User Profile Card Skeleton ───────────────────────────────────────────────
export function SkeletonUserCard({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Skeleton width={32} height={32} rounded="full" style={{ flexShrink: 0 }} />
        <div className="flex-1 space-y-1.5 min-w-0">
          <Skeleton width="60%" height={10} rounded="md" />
          <Skeleton width="40%" height={8}  rounded="full" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <Skeleton width={56} height={56} rounded="full" />
      <div className="space-y-2 w-full flex flex-col items-center">
        <Skeleton width="50%" height={12} rounded="md" />
        <Skeleton width="35%" height={9}  rounded="full" />
        <Skeleton width={80} height={20} rounded="full" style={{ marginTop: 4 }} />
      </div>
    </div>
  );
}

// ─── Chart Skeleton ───────────────────────────────────────────────────────────
export function SkeletonChart({ height = 160 }: { height?: number }) {
  return (
    <div style={{ height, position: 'relative', overflow: 'hidden' }}>
      {/* Fake bar chart bars */}
      <div className="flex items-end gap-2 h-full px-2 pb-2">
        {[65, 40, 80, 55, 90, 45, 70].map((h, i) => (
          <Skeleton
            key={i}
            width="100%"
            height={`${h}%`}
            rounded="sm"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Search Results Skeleton ──────────────────────────────────────────────────
export function SkeletonSearchResult({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 animate-fade-in-up"
      style={{ minHeight: 44, animationDelay: `${delay}ms` }}
    >
      <Skeleton width={24} height={24} rounded="lg" style={{ flexShrink: 0 }} />
      <div className="flex-1 space-y-1.5">
        <Skeleton width="40%" height={11} rounded="md" />
        <Skeleton width="65%" height={9}  rounded="full" />
      </div>
    </div>
  );
}

// ─── Form Field Skeleton ──────────────────────────────────────────────────────
export function SkeletonFormField({ delay = 0 }: { delay?: number }) {
  return (
    <div className="space-y-1.5 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <Skeleton width={80} height={9}  rounded="full" />
      <Skeleton width="100%" height={40} rounded="lg" />
    </div>
  );
}

// ─── Table Skeleton (header + rows) ──────────────────────────────────────────
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}
export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="space-y-0.5">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width={i === 0 ? '30%' : '20%'} height={10} rounded="full" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 animate-fade-in-up"
          style={{ minHeight: 48, animationDelay: `${i * 50}ms` }}
        >
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} width={j === 0 ? '30%' : j === columns - 1 ? '15%' : '20%'} height={12} rounded="md" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Missing Specs Page Skeleton ──────────────────────────────────────────────
export function SkeletonMissingSpecsPage() {
  return (
    <div className="space-y-3 py-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
          <Skeleton width={36} height={36} rounded="xl" style={{ flexShrink: 0 }} />
          <div className="flex-1 space-y-2">
            <Skeleton width="45%" height={12} rounded="md" />
            <Skeleton width="65%" height={9}  rounded="full" />
          </div>
          <Skeleton width={72} height={24} rounded="lg" style={{ flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

// ─── Approval Pipeline Skeleton ───────────────────────────────────────────────
export function SkeletonApprovalCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton width="55%" height={13} rounded="md" />
          <Skeleton width="40%" height={9}  rounded="full" />
        </div>
        <Skeleton width={64} height={22} rounded="full" style={{ flexShrink: 0 }} />
      </div>
      <div className="progress-bar-track">
        <Skeleton width="60%" height={6} rounded="full" soft />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton width={20} height={20} rounded="full" />
        <Skeleton width={80} height={9}  rounded="full" />
      </div>
    </div>
  );
}

// ─── Convenience: count-based repeater ───────────────────────────────────────
interface SkeletonListProps {
  count?: number;
  component: React.FC<{ delay?: number }>;
  baseDelay?: number;
  delayStep?: number;
}
export function SkeletonList({ count = 3, component: Component, baseDelay = 0, delayStep = 60 }: SkeletonListProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} delay={baseDelay + i * delayStep} />
      ))}
    </>
  );
}
