'use client';

import { useState } from 'react';
import { Star, CheckCircle, Award, ThumbsUp, DollarSign, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { formatCurrency, formatDistance, formatDuration } from '@/lib/utils';
import type { PassengerTrip } from '@/features/trips/domain/passenger-trip.types';

interface RideFinishedModalProps {
  trip: PassengerTrip;
  onFinish: (rating: number, feedback: string) => void;
}

export function RideFinishedModal({ trip, onFinish }: RideFinishedModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Direção Segura', 'Carro Limpo']);
  const [feedback, setFeedback] = useState('');

  const tags = [
    'Direção Segura',
    'Carro Limpo',
    'Super Educado',
    'Ar-Condicionado Bom',
    'Música Agradável',
    'Excelente Rota',
    'Pontual'
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleComplete = () => {
    const fullFeedback = [
      selectedTags.length > 0 ? `Tags: ${selectedTags.join(', ')}` : '',
      feedback.trim()
    ].filter(Boolean).join(' | ');

    onFinish(rating, fullFeedback);
  };

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-900 shadow-2xl overflow-hidden">
        {/* Header de Recibo */}
        <div className="bg-gradient-to-b from-brand/25 to-transparent p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-dark-950 shadow-lg shadow-brand/30 mb-3">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Viagem Finalizada!</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Esperamos que você tenha tido uma excelente viagem.</p>
          
          <div className="mt-4 rounded-2xl bg-white/90 dark:bg-dark-800/90 border border-slate-200/80 dark:border-dark-700/80 p-3.5 shadow-sm">
            <span className="text-xs font-semibold text-slate-400">Total pago</span>
            <div className="text-2xl font-black text-slate-900 dark:text-brand mt-0.5">
              {formatCurrency(trip.finalFare || trip.estimatedFare)}
            </div>
            <div className="flex justify-center items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{formatDistance(trip.estimatedDistanceMeters)}</span>
              <span>•</span>
              <span>{formatDuration(trip.estimatedDurationSeconds)}</span>
              <span>•</span>
              <span>
                {trip.paymentMethod === 'VOUCHER' ? '🏢 Voucher Quinzenal' : 'PIX'}
              </span>
            </div>
          </div>
        </div>

        {/* Avaliação do Motorista */}
        <div className="p-5 pt-0 space-y-4">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Como foi sua viagem com {trip.driver?.name?.split(' ')[0] || 'o motorista'}?
            </span>

            {/* Estrelas Interativas */}
            <div className="flex justify-center items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 active:scale-95"
                  >
                    <Star
                      size={30}
                      className={isFilled ? 'text-brand fill-brand' : 'text-slate-300 dark:text-dark-700'}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags de Elogio */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">Elogios Rápidos:</span>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      active
                        ? 'bg-brand text-dark-950 font-bold shadow-sm'
                        : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-700'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comentário Opcional */}
          <div>
            <Input
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Escreva um elogio ou comentário (opcional)..."
              className="text-xs"
            />
          </div>

          {/* Botão Concluir */}
          <Button
            variant="primary"
            size="lg"
            full
            onClick={handleComplete}
          >
            Enviar Avaliação
          </Button>
        </div>
      </div>
    </div>
  );
}
