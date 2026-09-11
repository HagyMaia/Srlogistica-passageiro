'use client';

import { useState } from 'react';
import {
  Phone,
  MessageSquare,
  Globe,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  X,
  HelpCircle,
  Clock,
  MapPin,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { SR_SUPPORT_CONFIG } from '@/types';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'Como funciona a aprovação de novo cadastro?',
      a: 'Por segurança de todos os passageiros e motoristas, todo cadastro na SR Logística passa por validação no painel administrativo. Você pode agilizar sua aprovação enviando uma mensagem no WhatsApp do suporte.'
    },
    {
      q: 'Como agendar uma corrida com antecedência?',
      a: 'Na aba "Solicitar", selecione "Agendar Viagem", defina a data, o horário com no mínimo 15 minutos de antecedência e informe instruções específicas para o motorista parceiro.'
    },
    {
      q: 'Quais as formas de pagamento aceitas?',
      a: 'Aceitamos PIX Direto via chave oficial CNPJ 52.967.828/0001-17 (SR Logística) e Voucher Corporativo com faturamento quinzenal para empresas parceiras.'
    },
    {
      q: 'Esqueci um item no veículo. O que fazer?',
      a: 'Entre em contato imediatamente com nossa central de suporte via WhatsApp nos números (92) 98492-3316 ou (92) 99130-6160 com o horário e trajeto da sua viagem.'
    }
  ];

  return (
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-dark-950/80 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200/90 dark:border-dark-700/80 bg-white dark:bg-dark-900 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-dark-950 font-black shadow-md shadow-brand/20">
              <HelpCircle size={22} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Central de Atendimento
              </span>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Suporte & Ajuda SR
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Canais Oficiais de Suporte WhatsApp & Telefone */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
            Canais Diretos de Atendimento (Manaus - AM)
          </span>

          {/* Número 1 */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white font-black shadow-sm">
                <MessageSquare size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">
                  WhatsApp & Central 1
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {SR_SUPPORT_CONFIG.phone1}
                </span>
              </div>
            </div>

            <div className="flex gap-1.5">
              <a
                href={`https://wa.me/${SR_SUPPORT_CONFIG.phone1Raw}?text=Ol%C3%A1%2C+preciso+de+suporte+no+App+do+Passageiro+SR+Log%C3%ADstica`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition"
              >
                Conversar
              </a>
              <a
                href={`tel:+${SR_SUPPORT_CONFIG.phone1Raw}`}
                className="flex items-center justify-center rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
                title="Ligar"
              >
                <Phone size={15} />
              </a>
            </div>
          </div>

          {/* Número 2 */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white font-black shadow-sm">
                <MessageSquare size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">
                  WhatsApp & Central 2
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {SR_SUPPORT_CONFIG.phone2}
                </span>
              </div>
            </div>

            <div className="flex gap-1.5">
              <a
                href={`https://wa.me/${SR_SUPPORT_CONFIG.phone2Raw}?text=Ol%C3%A1%2C+preciso+de+suporte+no+App+do+Passageiro+SR+Log%C3%ADstica`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition"
              >
                Conversar
              </a>
              <a
                href={`tel:+${SR_SUPPORT_CONFIG.phone2Raw}`}
                className="flex items-center justify-center rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
                title="Ligar"
              >
                <Phone size={15} />
              </a>
            </div>
          </div>
        </div>

        {/* Link para Site Oficial */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-dark-700/80 bg-slate-50 dark:bg-dark-800/80 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-dark-950 font-black">
              <Globe size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Site Oficial</span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                www.srlogisticatrasporte.com.br
              </span>
            </div>
          </div>

          <a
            href={SR_SUPPORT_CONFIG.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-xl bg-dark-900 dark:bg-dark-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-dark-800 transition"
          >
            Acessar <ExternalLink size={12} />
          </a>
        </div>

        {/* Perguntas Frequentes (FAQ) */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
            Dúvidas Frequentes
          </span>

          <div className="space-y-1.5">
            {faqs.map((faq, idx) => {
              const isOpenItem = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/70 dark:border-dark-700/60 bg-white dark:bg-dark-950/60 overflow-hidden"
                >
                  <button
                    onClick={() => setActiveFaq(isOpenItem ? null : idx)}
                    className="w-full flex items-center justify-between p-3 text-left text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight
                      size={16}
                      className={`text-slate-400 transition-transform ${isOpenItem ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {isOpenItem && (
                    <div className="p-3 pt-0 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-dark-800">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Botão de Emergência SOS */}
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={20} className="text-red-500" />
            <div>
              <span className="text-xs font-black text-red-600 dark:text-red-400 block">Emergência SOS</span>
              <span className="text-[10px] text-slate-400">Em caso de risco ou socorro imediato</span>
            </div>
          </div>
          <a
            href={`tel:${SR_SUPPORT_CONFIG.emergencyPolice}`}
            className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-red-700"
          >
            Ligar 190
          </a>
        </div>

        <Button variant="ghost" size="md" full onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
