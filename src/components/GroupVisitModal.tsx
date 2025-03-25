import React, { useState } from 'react';
import { X, Calendar, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMinutes, setHours, setMinutes, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ApplicationForm } from '../types';

interface GroupVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApplications: ApplicationForm[];
  onSchedule: (date: Date, duration: number) => Promise<void>;
}

export function GroupVisitModal({ isOpen, onClose, selectedApplications, onSchedule }: GroupVisitModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [startTime, setStartTime] = useState<Date>(setHours(setMinutes(new Date(), 0), 9));
  const [currentView, setCurrentView] = useState<'calendar' | 'time'>('calendar');
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfDay(new Date()));
  const [loading, setLoading] = useState(false);

  // Calculate occupied slots based on selected time
  const getOccupiedSlots = (time: Date) => {
    const slots = [];
    let current = new Date(time);
    
    // Add slots for each visitor (20 minutes each)
    for (let i = 0; i < selectedApplications.length; i++) {
      slots.push(format(current, 'HH:mm'));
      current = addMinutes(current, 20);
    }
    
    return slots;
  };

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = [];
    const start = setHours(setMinutes(new Date(), 0), 9); // 9:00
    const end = setHours(setMinutes(new Date(), 0), 19); // 19:00

    let current = start;
    while (current <= end) {
      slots.push(new Date(current));
      current = addMinutes(current, 20);
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();
  const requiredSlots = selectedApplications.length; // 20 minutes per visitor

  const handleSchedule = async () => {
    try {
      setLoading(true);
      const visitDateTime = new Date(selectedDate);
      visitDateTime.setHours(startTime.getHours());
      visitDateTime.setMinutes(startTime.getMinutes());
      
      await onSchedule(visitDateTime, 20);
      onClose();
    } catch (error) {
      console.error('Error scheduling visit:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentView === 'calendar' ? 'Sélectionner une date' : 'Choisir un horaire'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentView === 'calendar' ? (
            <div className="space-y-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-medium">
                  {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                </h3>
                <button
                  onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px">
                {/* Day names */}
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {Array.from({ length: 35 }, (_, i) => {
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i - currentMonth.getDay() + 1);
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isSelected = date.toDateString() === selectedDate.toDateString();
                  const isPast = date < new Date();

                  return (
                    <button
                      key={i}
                      onClick={() => !isPast && isCurrentMonth && setSelectedDate(date)}
                      disabled={isPast || !isCurrentMonth}
                      className={`
                        aspect-square flex items-center justify-center rounded-full text-sm
                        ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''}
                        ${isCurrentMonth && !isPast && !isSelected ? 'hover:bg-gray-100' : ''}
                        ${!isCurrentMonth || isPast ? 'text-gray-300' : 'text-gray-900'}
                        transition-colors duration-200
                      `}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Info */}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Time slots */}
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((time, index) => {
                  const isSelected = time.getHours() === startTime.getHours() && 
                                   time.getMinutes() === startTime.getMinutes();
                  const isPast = selectedDate.toDateString() === new Date().toDateString() && 
                                time < new Date();
                  const occupiedSlots = getOccupiedSlots(startTime);
                  const isOccupied = occupiedSlots.includes(format(time, 'HH:mm'));

                  return (
                    <button
                      key={index}
                      onClick={() => !isPast && setStartTime(time)}
                      disabled={isPast}
                      className={`
                        py-2 px-3 rounded-lg text-sm font-medium
                        ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'hover:bg-gray-100'}
                        ${isOccupied && !isSelected ? 'bg-gray-100' : ''}
                        ${isPast ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}
                        transition-colors duration-200
                      `}
                    >
                      {format(time, 'HH:mm')}
                    </button>
                  );
                })}
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{format(selectedDate, 'dd MMMM yyyy', { locale: fr })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{format(startTime, 'HH:mm')}</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-blue-800">
                  {selectedApplications.length} visiteur{selectedApplications.length > 1 ? 's' : ''} •{' '}
                  {selectedApplications.length * 20} minutes au total
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between">
          {currentView === 'calendar' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Annuler
              </button>
              <button
                onClick={() => setCurrentView('time')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Choisir l'horaire
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setCurrentView('calendar')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Retour
              </button>
              <button
                onClick={handleSchedule}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Planification...' : 'Planifier la visite'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupVisitModal;