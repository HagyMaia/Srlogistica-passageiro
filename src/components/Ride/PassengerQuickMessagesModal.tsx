'use client';

import React, { useState } from 'react';
import { MessageSquare, Send, X, Check } from 'lucide-react';
import { Button, Input } from '@/components/ui';

interface PassengerQuickMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (msg: string) => void;
}

export function PassengerQuickMessagesModal({
  isOpen,
  onClose,
  onSendMessage
}: PassengerQuickMessagesModalProps) {
  const [customMsg, setCustomMsg] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const messages = [
    'Estou no ponto de embarque aguardando.',
    'Estou descendo pelo elevador.',
    'Aguarde 2 minutos, já estou saindo da portaria.',
    'Estou com camisa azul / mochila preta.',
    'Pode ligar o ar-condicionado, por favor?',
    'Estou na entrada principal do condomínio.',
    'Vou precisar colocar bagagem no porta-malas.'
  ];

  const handleSend = (msg: string) => {
    onSendMessage(msg);
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 p-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-brand-600 dark:text-brand" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Mensagem ao Motorista</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {sentSuccess ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white mb-2">
              <Check size={24} />
            </div>
            <p className="font-bold text-slate-900 dark:text-white">Mensagem enviada com sucesso!</p>
          </div>
        ) : (
          <>
            <div className="max-h-60 overflow-y-auto p-2">
              <div className="space-y-1">
                {messages.map((msg, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(msg)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition hover:bg-brand/10 hover:text-brand-700 dark:hover:text-brand active:scale-[0.98]"
                  >
                    💬 {msg}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-dark-800 p-3 bg-slate-50/50 dark:bg-dark-950/50">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customMsg.trim()) {
                    handleSend(customMsg.trim());
                    setCustomMsg('');
                  }
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="Digitar mensagem personalizada..."
                  className="text-xs"
                />
                <Button type="submit" size="sm" variant="primary" disabled={!customMsg.trim()}>
                  <Send size={14} />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
