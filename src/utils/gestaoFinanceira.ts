/**
 * Algoritmo de Gestão Financeira — Dívidas + Fluxo de Caixa com Recorrências
 *
 * Gera um passo a passo mensal considerando:
 * - Dívidas (saldo, taxa de juros, parcela mínima, data de vencimento)
 * - Despesas recorrentes (valor, frequência, data de término)
 * - Entradas recorrentes (valor, frequência, data de término)
 * - Saldo disponível em cada etapa
 * - Alertas quando sobra ou falta dinheiro
 */

// ──────────────────────────── Tipos ────────────────────────────

export type Frequencia = 'mensal' | 'quinzenal' | 'semanal' | 'anual';

export type MetodoPagamento = 'avalanche' | 'snowball';

export interface Divida {
  id: string;
  nome: string;
  saldoTotal: number;
  taxaJurosAnual: number; // percentual (ex: 36 = 36% a.a.)
  parcelaMinima: number;
  dataVencimento: string; // ISO date
}

export interface Recorrencia {
  id: string;
  nome: string;
  valor: number;
  frequencia: Frequencia;
  dataInicio: string;   // ISO date
  dataFim?: string;      // ISO date (null = sem término)
}

export interface Config {
  metodo: MetodoPagamento;
  rendaFixa: number;          // salário mensal base
  dataInicio: string;         // ISO date — mês de referência inicial
  mesesProjecao: number;      // quantos meses projetar (default 24)
  reservaEmergencia?: number; // valor mínimo que deve sobrar por mês
}

export interface EtapaMes {
  mes: number;
  data: string;               // YYYY-MM-01
  rendaFixa: number;
  entradasRecorrentes: number;
  saidasRecorrentes: number;
  saldoDisponivel: number;    // renda + entradas - saídas
  saldoLiquido: number;       // saldoDisponivel - pagamentos de dívida
  pagamentosDivida: PagamentoDivida[];
  alertas: string[];
  dividasRestantes: DividaResumo[];
  temSuperavit: boolean;
  reservaAcumulada: number;
}

export interface PagamentoDivida {
  dividaId: string;
  nome: string;
  valorPago: number;
  jurosDoMes: number;
  amortizacao: number;
  saldoRestante: number;
  quitada: boolean;
}

export interface DividaResumo {
  dividaId: string;
  nome: string;
  saldoRestante: number;
  parcelaMinima: number;
}

export interface ResultadoProjecao {
  etapas: EtapaMes[];
  resumoFinal: {
    totalPagoDividas: number;
    totalJuros: number;
    totalSobrou: number;
    dividaRestante: number;
    mesesParaQuitarTodas: number | null;
    dividaMaiorRestante: string | null;
  };
}

// ──────────────────────────── Helpers ────────────────────────────

function NormalizarParaMensal(valor: number, freq: Frequencia): number {
  switch (freq) {
    case 'mensal':   return valor;
    case 'quinzenal': return valor * 2;
    case 'semanal':   return valor * 4.33;
    case 'anual':     return valor / 12;
  }
}

function DataMesAtual(data: string): string {
  const d = new Date(data);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function ProximoMes(data: string): string {
  const d = new Date(data);
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function FormatarMes(data: string): string {
  const d = new Date(data);
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${meses[d.getMonth()]} ${d.getFullYear()}`;
}

function MesesEntre(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
}

function RecorrenciaAtivaNoMes(rec: Recorrencia, dataMes: string): boolean {
  const inicio = new Date(rec.dataInicio);
  const mesRef = new Date(dataMes);
  if (mesRef < new Date(rec.dataInicio)) return false;
  if (rec.dataFim && mesRef > new Date(rec.dataFim)) return false;
  return true;
}

// ──────────────────────────── Algoritmo Principal ────────────────────────────

export function GerarProjecaoFinanceira(
  dividas: Divida[],
  entradasRecorrentes: Recorrencia[],
  saidasRecorrentes: Recorrencia[],
  config: Config,
): ResultadoProjecao {

  const {
    metodo,
    rendaFixa,
    dataInicio,
    mesesProjecao = 24,
    reservaEmergencia = 0,
  } = config;

  // Clonar dívidas pra não mutar o original
  const dividasTrabalho: Divida[] = dividas.map(d => ({ ...d }));
  const etapas: EtapaMes[] = [];
  let totalPagoDividas = 0;
  let totalJuros = 0;
  let totalSobrou = 0;
  let reservaAcumulada = 0;
  let dataAtual = DataMesAtual(dataInicio);

  for (let mes = 1; mes <= mesesProjecao; mes++) {
    const alertas: string[] = [];
    const pagamentos: PagamentoDivida[] = [];

    // ── 1. Calcular renda do mês ──
    const entradasMes = entradasRecorrentes
      .filter(r => RecorrenciaAtivaNoMes(r, dataAtual))
      .reduce((soma, r) => soma + NormalizarParaMensal(r.valor, r.frequencia), 0);

    // Alertar sobre entradas que terminam este mês ou no próximo
    for (const ent of entradasRecorrentes) {
      if (ent.dataFim) {
        const dif = MesesEntre(dataAtual, ent.dataFim);
        if (dif === 0) {
          alertas.push(`⚠️ "${ent.nome}" (R$ ${ent.valor.toFixed(2)}/mês) termina ESTE MÊS!`);
        } else if (dif === 1) {
          alertas.push(`⚠️ "${ent.nome}" (R$ ${ent.valor.toFixed(2)}/mês) termina no próximo mês.`);
        }
      }
    }

    // ── 2. Calcular despesas recorrentes do mês ──
    const saidasMes = saidasRecorrentes
      .filter(r => RecorrenciaAtivaNoMes(r, dataAtual))
      .reduce((soma, r) => soma + NormalizarParaMensal(r.valor, r.frequencia), 0);

    // Alertar sobre despesas que terminam — libera dinheiro!
    for (const saida of saidasRecorrentes) {
      if (saida.dataFim) {
        const dif = MesesEntre(dataAtual, saida.dataFim);
        if (dif === 0) {
          alertas.push(
            `✅ "${saida.nome}" (R$ ${saida.valor.toFixed(2)}/mês) termina ESTE MÊS! ` +
            `A partir do próximo mês você libera esse valor.`
          );
        } else if (dif === 1) {
          alertas.push(
            `✅ "${saida.nome}" (R$ ${saida.valor.toFixed(2)}/mês) termina no próximo mês. ` +
            `Em breve esse dinheiro fica disponível!`
          );
        }
      }
    }

    // ── 3. Saldo disponível para dívidas ──
    const saldoDisponivel = rendaFixa + entradasMes - saidasMes;

    // Alertar se vai faltar dinheiro
    if (saldoDisponivel < 0) {
      alertas.push(
        `🔴 AVISO: Neste mês suas despesas (R$ ${(saidasMes).toFixed(2)}) ` +
        `ultrapassam sua renda + entradas (R$ ${(rendaFixa + entradasMes).toFixed(2)}). ` +
        `Déficit de R$ ${Math.abs(saldoDisponivel).toFixed(2)}!`
      );
    }

    if (saldoDisponivel > 0 && saldoDisponivel > reservaEmergencia) {
      alertas.push(
        `💰 Sobram R$ ${saldoDisponivel.toFixed(2)} este mês para quitar dívidas.`
      );
    }

    // ── 4. Calcular juros e pagamentos das dívidas ──
    let dinheiroParaDividas = Math.max(0, saldoDisponivel);

    // Ordenar dívidas conforme método
    const dividasOrdenadas = [...dividasTrabalho].filter(d => d.saldoTotal > 0);

    if (metodo === 'avalanche') {
      // Maior taxa de juros primeiro
      dividasOrdenadas.sort((a, b) => b.taxaJurosAnual - a.taxaJurosAnual);
    } else {
      // Menor saldo primeiro (snowball)
      dividasOrdenadas.sort((a, b) => a.saldoTotal - b.saldoTotal);
    }

    for (const divida of dividasOrdenadas) {
      if (dinheiroParaDividas <= 0) {
        pagamentos.push({
          dividaId: divida.id,
          nome: divida.nome,
          valorPago: 0,
          jurosDoMes: 0,
          amortizacao: 0,
          saldoRestante: divida.saldoTotal,
          quitada: false,
        });
        continue;
      }

      // Juros do mês
      const jurosDoMes = divida.saldoTotal * (divida.taxaJurosAnual / 100 / 12);

      // Pelo menos a parcela mínima
      const valorMinimo = Math.min(divida.parcelaMinima, divida.saldoTotal + jurosDoMes);
      let valorPago = Math.min(Math.max(valorMinimo, 0), dinheiroParaDividas);

      // Se sobra dinheiro e essa é a dívida-alvo (primeira da fila), joga o resto nela
      const podeJogarResto =
        divida === dividasOrdenadas.find(d => d.saldoTotal > 0);
      if (podeJogarResto && dinheiroParaDividas > valorPago) {
        valorPago = Math.min(dinheiroParaDividas, divida.saldoTotal + jurosDoMes);
      }

      const amortizacao = Math.max(0, valorPago - jurosDoMes);
      divida.saldoTotal = Math.max(0, divida.saldoTotal - amortizacao);
      dinheiroParaDividas -= valorPago;

      const quitada = divida.saldoTotal <= 0.01;

      totalPagoDividas += valorPago;
      totalJuros += jurosDoMes;

      if (quitada) {
        divida.saldoTotal = 0;
        alertas.push(`🎉 Parabéns! Dívida "${divida.nome}" QUITADA neste mês!`);
      }

      pagamentos.push({
        dividaId: divida.id,
        nome: divida.nome,
        valorPago,
        jurosDoMes,
        amortizacao,
        saldoRestante: divida.saldoTotal,
        quitada,
      });
    }

    // ── 5. Reserva e superávit ──
    const sobrou = dinheiroParaDividas;
    totalSobrou += sobrou;
    reservaAcumulada += sobrou;

    if (sobrou > 0 && divisoriasRestantes(dividasTrabalho) === 0) {
      alertas.push(
        `🏆 Todas as dívidas quitadas! Sobrou R$ ${sobrou.toFixed(2)} este mês. ` +
        `Reserva acumulada: R$ ${reservaAcumulada.toFixed(2)}`
      );
    }

    const saldoLiquido = saldoDisponivel - (saldoDisponivel - dinheiroParaDividas);

    etapas.push({
      mes,
      data: dataAtual,
      rendaFixa,
      entradasRecorrentes: entradasMes,
      saidasRecorrentes: saidasMes,
      saldoDisponivel,
      saldoLiquido: sobrou,
      pagamentosDivida: pagamentos,
      alertas,
      dividasRestantes: dividasTrabalho
        .filter(d => d.saldoTotal > 0)
        .map(d => ({
          dividaId: d.id,
          nome: d.nome,
          saldoRestante: d.saldoTotal,
          parcelaMinima: d.parcelaMinima,
        })),
      temSuperavit: saldoDisponivel > 0,
      reservaAcumulada,
    });

    dataAtual = ProximoMes(dataAtual);

    // Parar se quitou tudo
    if (dividasTrabalho.every(d => d.saldoTotal <= 0)) {
      break;
    }
  }

  const dividaRestanteTotal = dividasTrabalho.reduce((s, d) => s + d.saldoTotal, 0);
  const dividaMaior = dividasTrabalho
    .filter(d => d.saldoTotal > 0)
    .sort((a, b) => b.saldoTotal - a.saldoTotal)[0];

  return {
    etapas,
    resumoFinal: {
      totalPagoDividas,
      totalJuros,
      totalSobrou,
      dividaRestante: dividaRestanteTotal,
      mesesParaQuitarTodas: dividaRestanteTotal <= 0.01
        ? etapas.length
        : null,
      dividaMaiorRestante: dividaMaior?.nome ?? null,
    },
  };
}

function divisoriasRestantes(d: Divida[]): number {
  return d.filter(x => x.saldoTotal > 0).length;
}

// ──────────────────────────── Formatação de Passo a Passo ────────────────────────────

export function GerarPassoAPasso(resultado: ResultadoProjecao): string[] {
  const linhas: string[] = [];

  linhas.push('═'.repeat(60));
  linhas.push('  PLANO DE GESTÃO FINANCEIRA — PASSO A PASSO');
  linhas.push('═'.repeat(60));
  linhas.push('');

  for (const etapa of resultado.etapas) {
    linhas.push(`─── MÊS ${etapa.mes} — ${FormatarMes(etapa.data)} ───`);
    linhas.push(`  Renda fixa:        R$ ${etapa.rendaFixa.toFixed(2)}`);
    if (etapa.entradasRecorrentes > 0) {
      linhas.push(`  Entradas recorr.:  +R$ ${etapa.entradasRecorrentes.toFixed(2)}`);
    }
    if (etapa.saidasRecorrentes > 0) {
      linhas.push(`  Despesas recorr.:  -R$ ${etapa.saidasRecorrentes.toFixed(2)}`);
    }
    linhas.push(`  Saldo disponível:  R$ ${etapa.saldoDisponivel.toFixed(2)}`);
    linhas.push('');

    // Alertas
    for (const alerta of etapa.alertas) {
      linhas.push(`  ${alerta}`);
    }

    // Pagamentos
    if (etapa.pagamentosDivida.length > 0) {
      linhas.push('');
      linhas.push('  Pagamentos de dívidas:');
      for (const p of etapa.pagamentosDivida) {
        if (p.valorPago > 0) {
          linhas.push(
            `    → ${p.nome}: R$ ${p.valorPago.toFixed(2)} ` +
            `(juros: R$ ${p.jurosDoMes.toFixed(2)}, amort.: R$ ${p.amortizacao.toFixed(2)})` +
            (p.quitada ? ' ✅ QUITADA!' : ` — restante: R$ ${p.saldoRestante.toFixed(2)}`)
          );
        } else {
          linhas.push(
            `    → ${p.nome}: R$ 0,00 (sem verba este mês) — restante: R$ ${p.saldoRestante.toFixed(2)}`
          );
        }
      }
    }

    // Sobras
    if (etapa.saldoLiquido > 0) {
      linhas.push(`\n  💰 Sobra do mês: R$ ${etapa.saldoLiquido.toFixed(2)} (reserva acum.: R$ ${etapa.reservaAcumulada.toFixed(2)})`);
    }

    // Dívidas restantes
    if (etapa.dividasRestantes.length > 0) {
      linhas.push('');
      linhas.push('  Dívidas pendentes:');
      for (const d of etapa.dividasRestantes) {
        linhas.push(`    • ${d.nome}: R$ ${d.saldoRestante.toFixed(2)}`);
      }
    }

    linhas.push('');
  }

  // Resumo final
  linhas.push('═'.repeat(60));
  linhas.push('  RESUMO FINAL');
  linhas.push('═'.repeat(60));
  linhas.push(`  Total pago em dívidas:   R$ ${resultado.resumoFinal.totalPagoDividas.toFixed(2)}`);
  linhas.push(`  Total gasto em juros:    R$ ${resultado.resumoFinal.totalJuros.toFixed(2)}`);
  linhas.push(`  Total acumulado (sobra): R$ ${resultado.resumoFinal.totalSobrou.toFixed(2)}`);

  if (resultado.resumoFinal.mesesParaQuitarTodas !== null) {
    linhas.push(`  🏆 Dívidas quitadas em ${resultado.resumoFinal.mesesParaQuitarTodas} meses!`);
  } else {
    linhas.push(`  ⚠️  Ainda resta R$ ${resultado.resumoFinal.dividaRestante.toFixed(2)} após projeção.`);
    if (resultado.resumoFinal.dividaMaiorRestante) {
      linhas.push(`  Maior dívida restante: ${resultado.resumoFinal.dividaMaiorRestante}`);
    }
  }

  return linhas;
}
