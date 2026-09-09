'use client';

import { useState } from 'react';
import {
  QrCode,
  Copy,
  Check,
  Building2,
  ShieldCheck,
  X,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { SR_PIX_CONFIG, SR_SUPPORT_CONFIG } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount?: number;
  tripId?: string;
}

export function PixPaymentModal({
  isOpen,
  onClose,
  amount,
  tripId
}: PixPaymentModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyPix = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(SR_PIX_CONFIG.keyRaw);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Olá! Segue o comprovante de pagamento PIX da corrida ${tripId ? `#${tripId.slice(-6)}` : ''} no valor de ${amount ? formatCurrency(amount) : 'PIX'} realizado para a chave CNPJ ${SR_PIX_CONFIG.keyFormatted} (SR Logística).`
  );

  return (
    <div className="fixed inset-0 z-[1300] flex items-end sm:items-center justify-center bg-dark-950/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-white dark:bg-dark-900 p-6 shadow-2xl space-y-4 animate-slideUp max-h-[90vh] overflow-y-auto">
        {/* Topo do Modal */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <QrCode size={26} />
            </div>
            <div>
              <Badge className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 text-[10px] font-bold">
                Chave Oficial da Empresa
              </Badge>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Pagamento via PIX
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Card do Valor da Corrida (se houver) */}
        {typeof amount === 'number' && (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 p-3.5 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Valor da Corrida
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(amount)}
            </div>
          </div>
        )}

        {/* Informações da Chave PIX */}
        <div className="rounded-2xl bg-slate-50 dark:bg-dark-950/70 border border-slate-200/80 dark:border-dark-800 p-4 space-y-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Chave PIX (CNPJ da Empresa)
            </span>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 p-2.5">
              <div className="min-w-0">
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-wide block">
                  {SR_PIX_CONFIG.keyFormatted}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {SR_PIX_CONFIG.keyRaw}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyPix}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition active:scale-95 shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-1 text-xs border-t border-slate-200/60 dark:border-dark-800">
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Beneficiário:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {SR_PIX_CONFIG.beneficiaryName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Cidade:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {SR_PIX_CONFIG.city}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Tipo de Chave:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {SR_PIX_CONFIG.keyType}
              </span>
            </div>
          </div>
        </div>

        {/* Botão Principal de Copiar Chave */}
        <Button
          type="button"
          variant="primary"
          size="lg"
          full
          onClick={handleCopyPix}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Chave PIX Copiada com Sucesso!' : `Copiar Chave PIX: ${SR_PIX_CONFIG.keyRaw}`}
        </Button>

        {/* Passo a Passo */}
        <div className="rounded-2xl bg-brand/10 dark:bg-brand/10 border border-brand/25 p-3.5 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
            <ShieldCheck size={16} className="text-brand-700 dark:text-brand" />
            <span>Como pagar com segurança:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
            <li>Abra o aplicativo do seu banco preferido;</li>
            <li>Acesse a área <strong>PIX</strong> &gt; <strong>Transferir / Pagar por Chave</strong>;</li>
            <li>Selecione <strong>CNPJ</strong> e cole a chave: <code className="font-bold text-slate-900 dark:text-white">{SR_PIX_CONFIG.keyRaw}</code>;</li>
            <li>Confira o nome <strong>{SR_PIX_CONFIG.beneficiaryName}</strong> e confirme.</li>
          </ol>
        </div>

        {/* Enviar Comprovante no WhatsApp */}
        <div className="pt-2 border-t border-slate-100 dark:border-dark-800 space-y-2">
          <a
            href={`https://wa.me/${SR_SUPPORT_CONFIG.phone1Raw}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 dark:bg-dark-800 border border-slate-300 dark:border-dark-700 p-2.5 text-xs font-black text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-dark-750 transition"
          >
            <MessageSquare size={15} className="text-emerald-500" />
            Enviar Comprovante no WhatsApp ({SR_SUPPORT_CONFIG.phone1})
          </a>

          <Button
            type="button"
            variant="ghost"
            size="md"
            full
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Concluir / Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
