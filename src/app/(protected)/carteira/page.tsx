'use client';

import { useState } from 'react';
import {
  Wallet,
  QrCode,
  Building2,
  Check,
  Tag,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  FileText,
  Calendar,
  Info,
  Copy,
  Building
} from 'lucide-react';
import { Card, Button, Input, Badge, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { PixPaymentModal } from '@/components/PixPaymentModal';
import { SR_PIX_CONFIG } from '@/types';
import type { PaymentMethod } from '@/types';

export default function CarteiraPage() {
  const { profile, updateProfile } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    (profile?.payment_preference as PaymentMethod) || 'PIX'
  );

  const [companyName, setCompanyName] = useState(
    profile?.corporate_company || 'Empresa Conveniada / Matriz SR'
  );
  const [costCenter, setCostCenter] = useState(
    profile?.cost_center || 'Centro de Custo / Matrícula'
  );
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [savedCompanySuccess, setSavedCompanySuccess] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [copiedPixKey, setCopiedPixKey] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<string | null>(null);

  const handleSelectMethod = async (method: PaymentMethod) => {
    setSelectedMethod(method);
    await updateProfile({ payment_preference: method });
  };

  const handleCopyPixKey = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(SR_PIX_CONFIG.keyRaw);
      }
      setCopiedPixKey(true);
      setTimeout(() => setCopiedPixKey(false), 2500);
    } catch {
      setCopiedPixKey(true);
      setTimeout(() => setCopiedPixKey(false), 2500);
    }
  };

  const handleSaveCorporateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      corporate_company: companyName,
      cost_center: costCenter
    });
    setIsEditingCompany(false);
    setSavedCompanySuccess(true);
    setTimeout(() => setSavedCompanySuccess(false), 2500);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      couponCode.trim().toUpperCase() === 'SRPROMO10' ||
      couponCode.trim().toUpperCase() === 'PRIMEIRA10'
    ) {
      setCouponApplied('Cupom de R$ 10,00 aplicado na próxima corrida!');
    } else {
      setCouponApplied('Cupom ativado com sucesso: 10% de desconto!');
    }
  };

  return (
    <div className="flex flex-col min-h-dvh p-5 space-y-5 pb-24">
      {/* Header */}
      <div className="pt-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
          <Wallet size={14} /> Pagamentos & Faturamento
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Formas de Pagamento</h1>
        <p className="text-xs text-slate-400">
          Selecione entre PIX imediato da empresa ou Voucher Corporativo quinzenal
        </p>
      </div>

      {/* Métodos de Pagamento Oficiais */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          Método de Cobrança Padrão
        </span>

        {/* 1. PIX Imediato */}
        <div
          onClick={() => handleSelectMethod('PIX')}
          className={`flex flex-col gap-3 rounded-3xl border p-4 cursor-pointer transition ${
            selectedMethod === 'PIX'
              ? 'border-brand bg-brand/10 dark:bg-brand/15 shadow-sm'
              : 'border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <QrCode size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">PIX Imediato</h3>
                  <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                    Oficial SR Logística
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pagamento direto para a chave CNPJ oficial da empresa.
                </p>
              </div>
            </div>
            {selectedMethod === 'PIX' && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-dark-950 shrink-0">
                <Check size={16} strokeWidth={3} />
              </div>
            )}
          </div>

          {/* Destaque da Chave PIX Oficial */}
          <div className="rounded-2xl bg-white/80 dark:bg-dark-900/80 border border-emerald-500/30 p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                Chave PIX (CNPJ Oficial)
              </span>
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono">
                {SR_PIX_CONFIG.keyFormatted}
              </span>
            </div>

            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyPixKey}
                className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-[11px] font-bold shadow-sm transition active:scale-95"
              >
                {copiedPixKey ? <Check size={13} /> : <Copy size={13} />}
                {copiedPixKey ? 'Copiada!' : 'Copiar Chave'}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPixModalOpen(true);
                }}
                className="rounded-xl border border-slate-300 dark:border-dark-700 bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-200 px-2 py-1.5 text-[11px] font-bold hover:bg-slate-200 transition"
              >
                Ver QR Code
              </button>
            </div>
          </div>
        </div>

        {/* 2. Voucher Corporativo (Faturamento Quinzenal) */}
        <div
          onClick={() => handleSelectMethod('VOUCHER')}
          className={`flex items-start justify-between rounded-3xl border p-4 cursor-pointer transition ${
            selectedMethod === 'VOUCHER'
              ? 'border-brand bg-brand/10 dark:bg-brand/15 shadow-sm'
              : 'border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/20 text-brand-700 dark:text-brand shrink-0 mt-0.5">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Voucher Corporativo
                </h3>
                <Badge className="bg-brand text-dark-950 text-[10px] font-black">
                  Faturamento Quinzenal
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Corrida enviada e faturada diretamente para a empresa conveniada, com fechamento quinzenal.
              </p>
            </div>
          </div>
          {selectedMethod === 'VOUCHER' && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-dark-950 shrink-0">
              <Check size={16} strokeWidth={3} />
            </div>
          )}
        </div>
      </div>

      {/* Cartão Informativo / Detalhes do Convênio da Empresa */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
            <Receipt size={16} className="text-brand-600 dark:text-brand" />
            <span>Dados da Empresa Conveniada (Voucher)</span>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingCompany(!isEditingCompany)}
            className="text-[11px] font-bold text-brand-700 dark:text-brand hover:underline"
          >
            {isEditingCompany ? 'Fechar' : 'Editar Dados'}
          </button>
        </div>

        {savedCompanySuccess && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 size={16} />
            <span>Dados da empresa atualizados com sucesso!</span>
          </div>
        )}

        {isEditingCompany ? (
          <form onSubmit={handleSaveCorporateInfo} className="space-y-3 pt-1">
            <Field label="Nome da Empresa Solicitante">
              <Input
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Petroamazon / Indústria AM / SR Logística"
              />
            </Field>

            <Field label="Centro de Custo / Matrícula">
              <Input
                required
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                placeholder="Ex: CC-OPERACIONAL / MAT-8492"
              />
            </Field>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingCompany(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" full>
                Salvar Dados Corporativos
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl bg-slate-50 dark:bg-dark-950/60 border border-slate-200/60 dark:border-dark-800 p-3.5 text-xs space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-dark-800">
              <span className="text-slate-400 font-medium">Empresa Vinculada:</span>
              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                {companyName}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-dark-800">
              <span className="text-slate-400 font-medium">Centro de Custo / Matrícula:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {costCenter}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Ciclo de Faturamento:</span>
              <span className="inline-flex items-center gap-1 font-bold text-brand-700 dark:text-brand">
                <Calendar size={13} /> Quinzena (Fechamento Quinzenal)
              </span>
            </div>
          </div>
        )}

        {/* Como funciona o Voucher */}
        <div className="rounded-2xl bg-brand/10 border border-brand/25 p-3 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
            <Info size={14} className="text-brand-700 dark:text-brand" />
            <span>Como funciona a cobrança por Voucher:</span>
          </div>
          <p className="leading-relaxed text-slate-600 dark:text-slate-300">
            Ao solicitar viagens utilizando o <strong>Voucher</strong>, nenhum pagamento é cobrado do passageiro no veículo. Todas as corridas são consolidadas e o relatório de despesas é enviado para a empresa parceira para liquidação ao fim de cada <strong>quinzena</strong>.
          </p>
        </div>
      </div>

      {/* Cupons e Promoções */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
          <Tag size={16} className="text-brand-600 dark:text-brand" /> Cupom de Desconto
        </div>

        <form onSubmit={handleApplyCoupon} className="flex gap-2">
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Digite o código (ex: PRIMEIRA10)"
            className="text-xs uppercase"
          />
          <Button type="submit" size="sm" variant="primary">
            Aplicar
          </Button>
        </form>

        {couponApplied && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 size={16} />
            <span>{couponApplied}</span>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do PIX */}
      <PixPaymentModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
      />
    </div>
  );
}
