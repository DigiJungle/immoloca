import React from 'react';
import { Building2, Clock, Calendar, Euro, BarChart3, Users } from 'lucide-react';
import { StatsCard } from './StatsCard';

interface StatsCardsSkeletonProps {
  count?: number;
}

function StatsCardsSkeleton({ count = 4 }: StatsCardsSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-8 w-32 bg-gray-300 rounded"></div>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          </div>
          <div className="mt-4 flex items-center">
            <div className="h-4 w-4 bg-gray-200 rounded mr-2"></div>
            <div className="h-4 w-36 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface StatsCardsProps {
  stats: {
    totalProperties: number;
    totalViews: number;
    upcomingVisits: number;
    totalVisitCandidates: number;
    pendingApplications: number;
    processedApplications: number;
    averagePrice: number;
    averageViews: number;
  };
  loading?: boolean;
}

export function StatsCards({ stats, loading = false }: StatsCardsProps) {
  if (loading) {
    return <StatsCardsSkeleton count={4} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Properties */}
      <StatsCard
        title="Total des biens"
        value={stats.totalProperties}
        icon={Building2}
        iconColor="text-rose-600"
        iconBgColor="bg-rose-100"
        subtitle={`Moyenne candidat : ${stats.totalProperties > 0 ? ((stats.pendingApplications + stats.processedApplications) / stats.totalProperties).toFixed(1) : '0'}`}
      />

      {/* Pending Applications */}
      <StatsCard
        title="Dossiers à traiter"
        value={stats.pendingApplications}
        icon={Clock}
        iconColor="text-amber-600"
        iconBgColor="bg-amber-100"
        subtitle={`${stats.processedApplications} dossier${stats.processedApplications > 1 ? 's' : ''} traité${stats.processedApplications > 1 ? 's' : ''}`}
      />

      {/* Upcoming Visits */}
      <StatsCard
        title="Visites à venir"
        value={stats.upcomingVisits}
        icon={Calendar}
        iconColor="text-indigo-600"
        iconBgColor="bg-indigo-100"
        subtitle={`${stats.totalVisitCandidates} candidat${stats.totalVisitCandidates > 1 ? 's' : ''} à recevoir`}
      />

      {/* Potential Revenue */}
      <StatsCard
        title="Revenus potentiels"
        value={`${(stats.totalProperties * stats.averagePrice).toLocaleString('fr-FR')} €`}
        icon={Euro}
        iconColor="text-violet-600"
        iconBgColor="bg-violet-100"
        subtitle={`${stats.totalProperties} location${stats.totalProperties > 1 ? 's' : ''}`}
      />
    </div>
  );
}