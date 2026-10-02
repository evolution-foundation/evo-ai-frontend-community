import { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  User,
  CalendarDays,
  History,
  DollarSign,
  AlertCircle,
  Folder,
  FolderOpen,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Save,
  Printer,
  Clock,
  Trash2,
  Receipt,
  PlusCircle,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { BaseHeader } from '@/components/base';
import { financialTransactionsService } from '@/services/finances/financesService';

// Tabelas INSS e IRRF 2024/2026 vigentes no Brasil
const TABELA_INSS = [
  { limite: 1412.0, aliquota: 0.075, deducao: 0 },
  { limite: 2666.68, aliquota: 0.09, deducao: 21.18 },
  { limite: 4000.03, aliquota: 0.12, deducao: 101.18 },
  { limite: 7786.02, aliquota: 0.14, deducao: 181.18 },
];

const TABELA_IRRF = [
  { limite: 2259.2, aliquota: 0.0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.0 },
];

const SALARIO_MINIMO = 1412.0;
const DEDUCAO_DEPENDENTE = 189.59;
const TETO_INSS = 908.44;

type Aba = 'fixos' | 'variaveis' | 'dividas' | 'historico';

interface Empresa {
  razaoSocial: string;
  cnpj: string;
}

interface Funcionario {
  nome: string;
  cargo: string;
  cbo: string;
  salarioBase: number;
  dependentesIR: number;
  dependentesSF: number;
  insalubridade: string;
  periculosidade: boolean;
  planoSaude: number;
  valeTransporte: boolean;
  valeRefeicao: boolean;
  valorBeneficioVR: number;
  percentualVR: number;
  valeAlimentacao: boolean;
  valorBeneficioVA: number;
  percentualVA: number;
}

interface Variaveis {
  mesAno: string;
  diasUteis: number;
  diasDescanso: number;
  diasTrabalhados: number;
  horasExtras50: number;
  horasExtras100: number;
  adicionalNoturno: number;
  comissoes: number;
  faltasDias: number;
  atrasosHoras: number;
  adiantamento: number;
  emprestimoConsignado: number;
}

interface RubricaExtra {
  id: string;
  desc: string;
  valor: number;
  incideIR?: boolean;
}

interface HistoricoItem {
  id: string;
  mesAno: string;
  nomeFuncionario: string;
  liquido: number;
  estado: {
    empresa: Empresa;
    funcionario: Funcionario;
    variaveis: Variaveis;
    outrosProventos: RubricaExtra[];
    outrosDescontos: RubricaExtra[];
  };
}

interface Linha {
  cod: string;
  desc: string;
  ref: string;
  valor: number;
}

const HISTORICO_KEY = 'historico_holerites';

function carregarHistorico(): HistoricoItem[] {
  try {
    const salvo = localStorage.getItem(HISTORICO_KEY);
    return salvo ? (JSON.parse(salvo) as HistoricoItem[]) : [];
  } catch {
    return [];
  }
}

export default function HoleritePage() {
  const [activeTab, setActiveTab] = useState<Aba>('fixos');
  const [toastMsg, setToastMsg] = useState('');
  const [ordemAnos, setOrdemAnos] = useState('desc');
  const [ordemItens, setOrdemItens] = useState('desc');
  const [pastasAbertas, setPastasAbertas] = useState<Record<string, boolean>>({});

  const [empresa, setEmpresa] = useState<Empresa>({
    razaoSocial: 'Empresa Exemplo LTDA',
    cnpj: '12.345.678/0001-99',
  });

  const [funcionario, setFuncionario] = useState<Funcionario>({
    nome: 'João da Silva',
    cargo: 'Analista de Sistemas',
    cbo: '2124-05',
    salarioBase: 4500.0,
    dependentesIR: 1,
    dependentesSF: 0,
    insalubridade: '0',
    periculosidade: false,
    planoSaude: 150.0,
    valeTransporte: true,
    valeRefeicao: false,
    valorBeneficioVR: 0,
    percentualVR: 20,
    valeAlimentacao: false,
    valorBeneficioVA: 0,
    percentualVA: 20,
  });

  const [variaveis, setVariaveis] = useState<Variaveis>({
    mesAno: '06/2026',
    diasUteis: 22,
    diasDescanso: 8,
    diasTrabalhados: 30,
    horasExtras50: 10,
    horasExtras100: 0,
    adicionalNoturno: 0,
    comissoes: 300.0,
    faltasDias: 0,
    atrasosHoras: 0,
    adiantamento: 0.0,
    emprestimoConsignado: 0.0,
  });

  const [outrosProventos, setOutrosProventos] = useState<RubricaExtra[]>([]);
  const [outrosDescontos, setOutrosDescontos] = useState<RubricaExtra[]>([]);

  const [historico, setHistorico] = useState<HistoricoItem[]>(carregarHistorico);
  const [emitindo, setEmitindo] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORICO_KEY, JSON.stringify(historico));
    } catch {
      // ignora falhas de storage
    }
  }, [historico]);

  useEffect(() => {
    if (!toastMsg) return;
    const id = window.setTimeout(() => setToastMsg(''), 3500);
    return () => window.clearTimeout(id);
  }, [toastMsg]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const addProvento = () =>
    setOutrosProventos((prev) => [...prev, { id: Date.now().toString(), desc: 'Novo Provento', valor: 0 }]);
  const removeProvento = (id: string) => setOutrosProventos((prev) => prev.filter((p) => p.id !== id));
  const updateProvento = (id: string, field: 'desc' | 'valor', value: string | number) =>
    setOutrosProventos((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const addDesconto = () =>
    setOutrosDescontos((prev) => [
      ...prev,
      { id: Date.now().toString(), desc: 'Novo Desconto', valor: 0, incideIR: false },
    ]);
  const removeDesconto = (id: string) => setOutrosDescontos((prev) => prev.filter((d) => d.id !== id));
  const updateDesconto = (id: string, field: 'desc' | 'valor', value: string | number) =>
    setOutrosDescontos((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  const updateDescontoIncideIR = (id: string, checked: boolean) =>
    setOutrosDescontos((prev) => prev.map((d) => (d.id === id ? { ...d, incideIR: checked } : d)));

  const holerite = useMemo(() => {
    const salarioBase = Number(funcionario.salarioBase) || 0;
    const diasUteis = parseInt(String(variaveis.diasUteis), 10) || 22;
    const diasDescanso = parseInt(String(variaveis.diasDescanso), 10) || 8;
    const diasTrabalhados = parseInt(String(variaveis.diasTrabalhados), 10) || 30;
    const valorHora = salarioBase / 220;

    const proventos: Linha[] = [];
    const descontos: Linha[] = [];
    let codSeq = 1;
    let totalProventos = 0;
    let totalDescontos = 0;

    const addProv = (desc: string, ref: string, valor: number) => {
      if (valor > 0) {
        proventos.push({ cod: String(codSeq++).padStart(3, '0'), desc, ref, valor });
        totalProventos += valor;
      }
    };
    const addDesc = (desc: string, ref: string, valor: number) => {
      if (valor > 0) {
        descontos.push({ cod: String(codSeq++).padStart(3, '0'), desc, ref, valor });
        totalDescontos += valor;
      }
    };

    // Salário proporcional aos dias efetivamente trabalhados no mês
    const salarioProporcional = (salarioBase / 30) * diasTrabalhados;
    addProv('Salário Base', `${diasTrabalhados} dias`, salarioProporcional);

    const insalubridadePct = parseFloat(funcionario.insalubridade) || 0;
    if (insalubridadePct > 0) {
      addProv(
        `Adicional Insalubridade (${insalubridadePct}%)`,
        '100%',
        SALARIO_MINIMO * (insalubridadePct / 100),
      );
    }

    if (funcionario.periculosidade) {
      addProv('Adicional Periculosidade (30%)', '100%', salarioBase * 0.3);
    }

    const he50 = parseInt(String(variaveis.horasExtras50), 10) || 0;
    const valorHE50 = he50 * valorHora * 1.5;
    addProv('Horas Extras 50%', `${he50}h`, valorHE50);

    const he100 = parseInt(String(variaveis.horasExtras100), 10) || 0;
    const valorHE100 = he100 * valorHora * 2.0;
    addProv('Horas Extras 100%', `${he100}h`, valorHE100);

    const adNoturnoHoras = parseFloat(String(variaveis.adicionalNoturno)) || 0;
    const valorAdNoturno = valorHora * 0.2 * adNoturnoHoras;
    addProv('Adicional Noturno', `${adNoturnoHoras}h`, valorAdNoturno);

    const comissoes = parseFloat(String(variaveis.comissoes)) || 0;
    addProv('Comissões / Prêmios', '100%', comissoes);

    let somaOutrosProventos = 0;
    outrosProventos.forEach((p) => {
      const valor = Number(p.valor) || 0;
      if (valor > 0) {
        addProv(p.desc || 'Outro Provento', '-', valor);
        somaOutrosProventos += valor;
      }
    });

    // Reflexo do DSR sobre as parcelas variáveis (extras, noturno, comissões e outros proventos)
    const baseParaDSR = valorHE50 + valorHE100 + valorAdNoturno + comissoes + somaOutrosProventos;
    const dsr = diasUteis > 0 ? (baseParaDSR / diasUteis) * diasDescanso : 0;
    addProv('Reflexo DSR', '-', dsr);

    // Salário Família (só cabe a quem recebe até o teto legal)
    const dependentesSF = parseInt(String(funcionario.dependentesSF), 10) || 0;
    let valorSalFamilia = 0;
    if (dependentesSF > 0 && totalProventos <= 1819.26) {
      valorSalFamilia = 62.04 * dependentesSF;
      addProv('Salário Família', `${dependentesSF} dep`, valorSalFamilia);
    }

    const faltas = parseInt(String(variaveis.faltasDias), 10) || 0;
    let valorFaltas = 0;
    let valorDSRFaltas = 0;
    if (faltas > 0) {
      valorFaltas = (salarioBase / 30) * faltas;
      addDesc('Faltas Injustificadas', `${faltas} dias`, valorFaltas);
      const dsrPerdidos = Math.min(faltas, diasDescanso);
      valorDSRFaltas = (salarioBase / 30) * dsrPerdidos;
      addDesc('DSR sobre Faltas', `${dsrPerdidos} dias`, valorDSRFaltas);
    }

    const atrasos = parseFloat(String(variaveis.atrasosHoras)) || 0;
    const valorAtrasos = atrasos * valorHora;
    addDesc('Atrasos / Saídas Antecipadas', `${atrasos}h`, valorAtrasos);

    const baseINSS = totalProventos - valorSalFamilia - valorFaltas - valorDSRFaltas - valorAtrasos;

    let inss = 0;
    let faixaAnterior = 0;
    for (const faixa of TABELA_INSS) {
      if (baseINSS > faixaAnterior) {
        const baseFaixa = Math.min(baseINSS, faixa.limite) - faixaAnterior;
        inss += baseFaixa * faixa.aliquota;
        faixaAnterior = faixa.limite;
      }
      if (baseINSS <= faixa.limite) break;
    }
    inss = Math.min(inss, TETO_INSS);

    addDesc('Contribuição INSS', 'Prog.', inss);

    // Descontos dinâmicos (dívidas/retenções) — os marcados "Abate no IR" reduzem a base do IRRF
    let deducaoIRExtra = 0;
    outrosDescontos.forEach((d) => {
      const valor = Number(d.valor) || 0;
      if (valor > 0) {
        addDesc(d.desc || 'Outro Desconto', '-', valor);
        if (d.incideIR) deducaoIRExtra += valor;
      }
    });

    const dependentesIR = parseInt(String(funcionario.dependentesIR), 10) || 0;
    const deducaoDependentes = dependentesIR * DEDUCAO_DEPENDENTE;
    const baseIRRF = Math.max(0, baseINSS - inss - deducaoDependentes - deducaoIRExtra);

    let irrf = 0;
    let faixaIRRF = 0;
    for (const faixa of TABELA_IRRF) {
      if (baseIRRF <= faixa.limite) {
        irrf = baseIRRF * faixa.aliquota - faixa.deducao;
        faixaIRRF = faixa.aliquota * 100;
        break;
      }
    }
    irrf = Math.max(0, irrf);

    addDesc('Imposto de Renda Retido na Fonte (IRRF)', `${faixaIRRF}%`, irrf);

    const planoSaude = parseFloat(String(funcionario.planoSaude)) || 0;
    addDesc('Desconto Plano de Saúde', '1 un', planoSaude);

    if (funcionario.valeTransporte) {
      const vt = Math.min(salarioBase * 0.06, totalProventos * 0.06);
      addDesc('Desconto Vale Transporte (6%)', '6%', vt);
    }

    const percentualVR = parseFloat(String(funcionario.percentualVR)) || 0;
    if (funcionario.valeRefeicao) {
      const valorBeneficioVR = parseFloat(String(funcionario.valorBeneficioVR)) || 0;
      const vr = valorBeneficioVR * (percentualVR / 100);
      addDesc(`Desconto Vale Refeição (${percentualVR}%)`, `${percentualVR}%`, vr);
    }

    const percentualVA = parseFloat(String(funcionario.percentualVA)) || 0;
    if (funcionario.valeAlimentacao) {
      const valorBeneficioVA = parseFloat(String(funcionario.valorBeneficioVA)) || 0;
      const va = valorBeneficioVA * (percentualVA / 100);
      addDesc(`Desconto Vale Alimentação (${percentualVA}%)`, `${percentualVA}%`, va);
    }

    const adiantamento = parseFloat(String(variaveis.adiantamento)) || 0;
    addDesc('Adiantamento Salarial (Vale)', '100%', adiantamento);

    const emprestimoConsignado = parseFloat(String(variaveis.emprestimoConsignado)) || 0;
    addDesc('Empréstimo Consignado', '100%', emprestimoConsignado);

    const liquido = totalProventos - totalDescontos;
    const baseFGTS = baseINSS;
    const fgts = baseFGTS * 0.08;

    // Alerta legal: descontos não podem ultrapassar 70% dos proventos (Art. 82, CLT)
    const limiteSeguranca = totalProventos * 0.7;
    const alertaDescontos = totalProventos > 0 && totalDescontos > limiteSeguranca;
    const percentualDescontos = totalProventos > 0 ? (totalDescontos / totalProventos) * 100 : 0;

    // Margem consignável: empréstimo consignado não pode ultrapassar 35% da
    // remuneração bruta (30% empréstimo + 5% cartão consignado — Lei 10.820/2003,
    // alterada pela Lei 14.131/2021)
    const margemConsignavel = totalProventos * 0.35;
    const excedeMargemConsignado = emprestimoConsignado > margemConsignavel;

    return {
      proventos,
      descontos,
      totalProventos,
      totalDescontos,
      liquido,
      baseINSS,
      baseFGTS,
      fgts,
      baseIRRF,
      faixaIRRF,
      alertaDescontos,
      percentualDescontos,
      margemConsignavel,
      excedeMargemConsignado,
    };
  }, [funcionario, variaveis, outrosProventos, outrosDescontos]);

  const salvarHolerite = () => {
    const novoItem: HistoricoItem = {
      id: Date.now().toString(),
      mesAno: variaveis.mesAno,
      nomeFuncionario: funcionario.nome,
      liquido: holerite.liquido,
      estado: { empresa, funcionario, variaveis, outrosProventos, outrosDescontos },
    };
    setHistorico([novoItem, ...historico]);
    setToastMsg('Holerite salvo com sucesso no histórico!');
  };

  const carregarHolerite = (estadoSalvo: HistoricoItem['estado']) => {
    setEmpresa(estadoSalvo.empresa);
    setFuncionario({
      valeRefeicao: false,
      valorBeneficioVR: 0,
      percentualVR: 20,
      valeAlimentacao: false,
      valorBeneficioVA: 0,
      percentualVA: 20,
      ...estadoSalvo.funcionario,
    });
    setVariaveis(estadoSalvo.variaveis);
    setOutrosProventos(estadoSalvo.outrosProventos || []);
    setOutrosDescontos(estadoSalvo.outrosDescontos || []);
    setToastMsg('Holerite carregado com sucesso!');
  };

  const excluirHolerite = (id: string) => {
    setHistorico(historico.filter((h) => h.id !== id));
    setToastMsg('Item removido do histórico.');
  };

  const togglePasta = (ano: string) => {
    setPastasAbertas((prev) => ({ ...prev, [ano]: !prev[ano] }));
  };

  const historicoAgrupado = useMemo(() => {
    const agrupado: Record<string, HistoricoItem[]> = {};
    historico.forEach((item) => {
      const partes = item.mesAno.split('/');
      const ano = partes[1] || 'Outros';
      if (!agrupado[ano]) agrupado[ano] = [];
      agrupado[ano].push(item);
    });

    const anosOrdenados = Object.keys(agrupado).sort((a, b) =>
      ordemAnos === 'desc' ? b.localeCompare(a) : a.localeCompare(b),
    );

    Object.keys(agrupado).forEach((ano) => {
      agrupado[ano].sort((a, b) =>
        ordemItens === 'desc' ? b.mesAno.localeCompare(a.mesAno) : a.mesAno.localeCompare(b.mesAno),
      );
    });

    return { agrupado, anosOrdenados };
  }, [historico, ordemAnos, ordemItens]);

  const emitirPagamento = async () => {
    if (!variaveis.mesAno.trim()) {
      toast.error('Informe a competência (MM/AAAA) antes de emitir o pagamento.');
      return;
    }
    if (!funcionario.nome.trim()) {
      toast.error('Informe o nome do funcionário antes de emitir o pagamento.');
      return;
    }
    if (holerite.liquido <= 0) {
      toast.error('O valor líquido do holerite deve ser maior que zero.');
      return;
    }
    setEmitindo(true);
    try {
      const descricao = `Salário ${funcionario.nome.trim()} — ${variaveis.mesAno.trim()}`;
      await financialTransactionsService.createTransaction({
        kind: 'expense',
        scope: 'store',
        description: descricao,
        category: 'Folha de Pagamento',
        amount: holerite.liquido,
        transaction_date: new Date().toISOString(),
      });
      toast.success(
        `Pagamento emitido! Despesa de Loja registrada: ${formatCurrency(holerite.liquido)} (${descricao}).`,
      );
    } catch {
      toast.error('Erro ao emitir pagamento e registrar a despesa de loja.');
    } finally {
      setEmitindo(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const inputClass =
    'w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-background';
  const labelClass = 'block text-sm font-medium text-foreground mb-1';

  return (
    <div className="flex flex-col min-h-full bg-background p-6 space-y-6">
      <BaseHeader
        title="Holerite & Folha de Pagamento"
        subtitle="Gere o contracheque do funcionário. Ao emitir o pagamento, a despesa é lançada automaticamente nas Despesas de Loja da Gestão Financeira."
      />

      {toastMsg && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-foreground text-background px-4 py-3 rounded shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {toastMsg}
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* COLUNA ESQUERDA - PAINEL DE CONTROLE (NÃO IMPRIME) */}
        <div className="lg:col-span-4 bg-card rounded-xl shadow-lg overflow-hidden flex flex-col print:hidden">
          <div className="bg-primary text-primary-foreground p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <Calculator className="w-5 h-5" /> Holerite & RH
                </h1>
                <p className="text-primary-foreground/80 text-xs mt-1">Simulador de Folha de Pagamento</p>
              </div>
              {holerite.alertaDescontos && (
                <div
                  className="flex items-center gap-1 text-red-300 text-xs font-bold animate-pulse shrink-0"
                  title="Descontos ultrapassam 70% dos vencimentos (Art. 82 da CLT)"
                >
                  <ShieldAlert className="w-4 h-4" /> {holerite.percentualDescontos.toFixed(1)}%
                </div>
              )}
            </div>
          </div>

          <div className="flex border-b border-border">
            <button
              type="button"
              className={`flex-1 py-2.5 text-xs font-medium flex justify-center items-center gap-1.5 transition-colors ${
                activeTab === 'fixos'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('fixos')}
            >
              <User className="w-4 h-4" /> Dados Fixos
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-xs font-medium flex justify-center items-center gap-1.5 transition-colors ${
                activeTab === 'variaveis'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('variaveis')}
            >
              <CalendarDays className="w-4 h-4" /> Lançamentos
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-xs font-medium flex justify-center items-center gap-1.5 transition-colors ${
                activeTab === 'dividas'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('dividas')}
            >
              <Scale className="w-4 h-4" /> Extras/Dívidas
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-xs font-medium flex justify-center items-center gap-1.5 transition-colors ${
                activeTab === 'historico'
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('historico')}
            >
              <History className="w-4 h-4" /> Histórico
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[50vh] lg:max-h-[calc(100vh-260px)] custom-scrollbar">
            {activeTab === 'fixos' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-2 mb-3">
                    <User className="w-4 h-4 text-primary" /> Empresa
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Razão Social</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={empresa.razaoSocial}
                        onChange={(e) => setEmpresa({ ...empresa, razaoSocial: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>CNPJ</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={empresa.cnpj}
                        onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-2 mb-3">
                    <User className="w-4 h-4 text-primary" /> Funcionário
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Nome Completo</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={funcionario.nome}
                        onChange={(e) => setFuncionario({ ...funcionario, nome: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Cargo</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={funcionario.cargo}
                          onChange={(e) => setFuncionario({ ...funcionario, cargo: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>CBO</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={funcionario.cbo}
                          onChange={(e) => setFuncionario({ ...funcionario, cbo: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Salário Base (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputClass}
                        value={funcionario.salarioBase}
                        onChange={(e) =>
                          setFuncionario({ ...funcionario, salarioBase: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Nº Dependentes IR</label>
                        <input
                          type="number"
                          className={inputClass}
                          value={funcionario.dependentesIR}
                          onChange={(e) =>
                            setFuncionario({ ...funcionario, dependentesIR: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Dependentes Sal. Família</label>
                        <input
                          type="number"
                          className={inputClass}
                          value={funcionario.dependentesSF}
                          onChange={(e) =>
                            setFuncionario({ ...funcionario, dependentesSF: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-2 mb-3">
                    <DollarSign className="w-4 h-4 text-primary" /> Adicionais e Benefícios
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Insalubridade</label>
                        <select
                          className={inputClass}
                          value={funcionario.insalubridade}
                          onChange={(e) => setFuncionario({ ...funcionario, insalubridade: e.target.value })}
                        >
                          <option value="0">Não aplicável</option>
                          <option value="10">10% (Grau Mínimo)</option>
                          <option value="20">20% (Grau Médio)</option>
                          <option value="40">40% (Grau Máximo)</option>
                        </select>
                      </div>
                      <div className="flex items-center sm:mt-6">
                        <input
                          type="checkbox"
                          id="pericul"
                          className="mr-2 h-4 w-4 text-primary rounded"
                          checked={funcionario.periculosidade}
                          onChange={(e) => setFuncionario({ ...funcionario, periculosidade: e.target.checked })}
                        />
                        <label htmlFor="pericul" className="text-sm font-medium text-foreground">
                          Periculosidade (30%)
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Desc. Plano de Saúde (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          className={inputClass}
                          value={funcionario.planoSaude}
                          onChange={(e) =>
                            setFuncionario({ ...funcionario, planoSaude: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="flex items-center sm:mt-6">
                        <input
                          type="checkbox"
                          id="vt"
                          className="mr-2 h-4 w-4 text-primary rounded"
                          checked={funcionario.valeTransporte}
                          onChange={(e) => setFuncionario({ ...funcionario, valeTransporte: e.target.checked })}
                        />
                        <label htmlFor="vt" className="text-sm font-medium text-foreground">
                          Desconto Vale Transp.
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="vr"
                          className="mr-2 h-4 w-4 text-primary rounded"
                          checked={funcionario.valeRefeicao}
                          onChange={(e) => setFuncionario({ ...funcionario, valeRefeicao: e.target.checked })}
                        />
                        <label htmlFor="vr" className="text-sm font-medium text-foreground">
                          Desconto Vale Refeição
                        </label>
                      </div>
                      <div>
                        <label className={labelClass}>Valor do Benefício (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          className={inputClass}
                          disabled={!funcionario.valeRefeicao}
                          value={funcionario.valorBeneficioVR}
                          onChange={(e) =>
                            setFuncionario({ ...funcionario, valorBeneficioVR: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Taxa de Desconto (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          className={inputClass}
                          disabled={!funcionario.valeRefeicao}
                          value={funcionario.percentualVR}
                          onChange={(e) =>
                            setFuncionario({ ...funcionario, percentualVR: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="va"
                          className="mr-2 h-4 w-4 text-primary rounded"
                          checked={funcionario.valeAlimentacao}
                          onChange={(e) => setFuncionario({ ...funcionario, valeAlimentacao: e.target.checked })}
                        />
                        <label htmlFor="va" className="text-sm font-medium text-foreground">
                          Desconto Vale Aliment.
                        </label>
                      </div>
                      <div>
                        <label className={labelClass}>Valor do Benefício (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          className={inputClass}
                          disabled={!funcionario.valeAlimentacao}
                          value={funcionario.valorBeneficioVA}
                          onChange={(e) =>
                            setFuncionario({ ...funcionario, valorBeneficioVA: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Taxa de Desconto (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          className={inputClass}
                          disabled={!funcionario.valeAlimentacao}
                          value={funcionario.percentualVA}
                          onChange={(e) =>
                            setFuncionario({ ...funcionario, percentualVA: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'variaveis' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-2 mb-3">
                    <CalendarDays className="w-4 h-4 text-primary" /> Parâmetros do Mês
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Competência</label>
                      <input
                        type="text"
                        placeholder="MM/AAAA"
                        className={inputClass}
                        value={variaveis.mesAno}
                        onChange={(e) => setVariaveis({ ...variaveis, mesAno: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Dias Trabalhados</label>
                      <input
                        type="number"
                        className={inputClass}
                        value={variaveis.diasTrabalhados}
                        onChange={(e) =>
                          setVariaveis({ ...variaveis, diasTrabalhados: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Dias Úteis</label>
                      <input
                        type="number"
                        className={inputClass}
                        value={variaveis.diasUteis}
                        onChange={(e) => setVariaveis({ ...variaveis, diasUteis: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Dias DSR/Feriado</label>
                      <input
                        type="number"
                        className={inputClass}
                        value={variaveis.diasDescanso}
                        onChange={(e) => setVariaveis({ ...variaveis, diasDescanso: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2 border-b pb-2 mb-3">
                    <Clock className="w-4 h-4" /> Ocorrências Positivas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Horas Extras 50%</label>
                      <input
                        type="number"
                        className={inputClass}
                        value={variaveis.horasExtras50}
                        onChange={(e) => setVariaveis({ ...variaveis, horasExtras50: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Horas Extras 100%</label>
                      <input
                        type="number"
                        className={inputClass}
                        value={variaveis.horasExtras100}
                        onChange={(e) =>
                          setVariaveis({ ...variaveis, horasExtras100: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Adicional Noturno (h)</label>
                      <input
                        type="number"
                        className={inputClass}
                        value={variaveis.adicionalNoturno}
                        onChange={(e) =>
                          setVariaveis({ ...variaveis, adicionalNoturno: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Comissões/Prêmios (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputClass}
                        value={variaveis.comissoes}
                        onChange={(e) => setVariaveis({ ...variaveis, comissoes: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider flex items-center gap-2 border-b pb-2 mb-3">
                    <AlertCircle className="w-4 h-4" /> Ocorrências Negativas / Outros
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Faltas Injust. (Dias)</label>
                      <input
                        type="number"
                        className={inputClass}
                        value={variaveis.faltasDias}
                        onChange={(e) => setVariaveis({ ...variaveis, faltasDias: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Atrasos (Horas)</label>
                      <input
                        type="number"
                        className={inputClass}
                        value={variaveis.atrasosHoras}
                        onChange={(e) => setVariaveis({ ...variaveis, atrasosHoras: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className={labelClass}>Adiantamento Salarial (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputClass}
                        value={variaveis.adiantamento}
                        onChange={(e) => setVariaveis({ ...variaveis, adiantamento: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className={labelClass}>Empréstimo Consignado (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputClass}
                        value={variaveis.emprestimoConsignado}
                        onChange={(e) =>
                          setVariaveis({ ...variaveis, emprestimoConsignado: Number(e.target.value) })
                        }
                      />
                      {holerite.excedeMargemConsignado && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Excede a margem consignável de 35% do bruto ({formatCurrency(holerite.margemConsignavel)})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dividas' && (
              <div className="space-y-6">
                <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg p-3">
                  Use esta aba para rubricas que não constam no cadastro fixo (ex: PLR, bônus, penhora
                  judicial, mensalidade sindical).
                </div>

                <div>
                  <div className="flex justify-between items-center border-b pb-2 mb-3">
                    <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" /> Outros Proventos
                    </h3>
                    <button
                      type="button"
                      onClick={addProvento}
                      className="text-xs font-medium bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors"
                    >
                      + Novo Ganho
                    </button>
                  </div>
                  {outrosProventos.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhum provento extra lançado.</p>
                  )}
                  <div className="space-y-2">
                    {outrosProventos.map((p) => (
                      <div
                        key={p.id}
                        className="flex gap-2 items-center bg-muted/30 p-2 rounded-lg border border-border"
                      >
                        <input
                          type="text"
                          className={`${inputClass} flex-1`}
                          value={p.desc}
                          placeholder="Descrição (ex: PLR)"
                          onChange={(e) => updateProvento(p.id, 'desc', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className={`${inputClass} w-28`}
                          value={p.valor}
                          placeholder="R$"
                          onChange={(e) => updateProvento(p.id, 'valor', Number(e.target.value))}
                        />
                        <button
                          type="button"
                          onClick={() => removeProvento(p.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center border-b pb-2 mb-3">
                    <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider flex items-center gap-2">
                      <Scale className="w-4 h-4" /> Retenções / Dívidas
                    </h3>
                    <button
                      type="button"
                      onClick={addDesconto}
                      className="text-xs font-medium bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      + Nova Dívida
                    </button>
                  </div>
                  {outrosDescontos.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhuma retenção extra lançada.</p>
                  )}
                  <div className="space-y-2">
                    {outrosDescontos.map((d) => (
                      <div
                        key={d.id}
                        className="flex flex-wrap gap-2 items-center bg-muted/30 p-2 rounded-lg border border-border"
                      >
                        <input
                          type="text"
                          className={`${inputClass} flex-1 min-w-[120px]`}
                          value={d.desc}
                          placeholder="Descrição (ex: Pensão Judicial)"
                          onChange={(e) => updateDesconto(d.id, 'desc', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className={`${inputClass} w-28`}
                          value={d.valor}
                          placeholder="R$"
                          onChange={(e) => updateDesconto(d.id, 'valor', Number(e.target.value))}
                        />
                        <label
                          className="flex items-center gap-1 text-[10px] bg-background border border-border rounded px-2 py-1.5 cursor-pointer"
                          title="Marque se este desconto pode ser abatido na base do IRRF (ex: pensão judicial)"
                        >
                          <input
                            type="checkbox"
                            checked={!!d.incideIR}
                            onChange={(e) => updateDescontoIncideIR(d.id, e.target.checked)}
                          />
                          Abate no IR?
                        </label>
                        <button
                          type="button"
                          onClick={() => removeDesconto(d.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'historico' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4 pb-2 border-b">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" /> Histórico Salvo
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOrdemAnos((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground px-2 py-1 bg-muted rounded"
                      title="Ordenar Anos"
                    >
                      <Folder className="w-3 h-3" /> <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdemItens((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground px-2 py-1 bg-muted rounded"
                      title="Ordenar Meses"
                    >
                      <CalendarDays className="w-3 h-3" /> <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {historicoAgrupado.anosOrdenados.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                    <p>Nenhum holerite salvo no histórico.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historicoAgrupado.anosOrdenados.map((ano) => (
                      <div key={ano} className="border border-border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => togglePasta(ano)}
                          className="w-full flex justify-between items-center p-3 bg-muted/40 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            {pastasAbertas[ano] ? (
                              <FolderOpen className="w-4 h-4 text-primary" />
                            ) : (
                              <Folder className="w-4 h-4 text-primary" />
                            )}
                            Ano: {ano}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                              {historicoAgrupado.agrupado[ano].length}{' '}
                              {historicoAgrupado.agrupado[ano].length === 1 ? 'item' : 'itens'}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-muted-foreground transition-transform ${
                                pastasAbertas[ano] ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </button>

                        {pastasAbertas[ano] && (
                          <div className="p-2 bg-card divide-y divide-border">
                            {historicoAgrupado.agrupado[ano].map((h) => (
                              <div
                                key={h.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-2 hover:bg-muted/40 rounded transition-colors gap-2"
                              >
                                <div>
                                  <div className="font-medium text-sm text-foreground">{h.mesAno}</div>
                                  <div className="text-xs text-muted-foreground">{h.nomeFuncionario}</div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(h.liquido)}
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => carregarHolerite(h.estado)}
                                      className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                                      title="Carregar para visualização"
                                    >
                                      <CalendarDays className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => excluirHolerite(h.id)}
                                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                      title="Excluir do histórico"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-muted/40 flex justify-between items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">* Cálculos em tempo real</span>
            <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={salvarHolerite}
                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium flex justify-center items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" /> Salvar
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex justify-center items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button
                type="button"
                onClick={emitirPagamento}
                disabled={emitindo}
                className="flex-1 sm:flex-none px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex justify-center items-center gap-2 hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
              >
                {emitindo ? <Clock className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                Emitir Pagamento
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA - VISUALIZAÇÃO DO HOLERITE (IMPRIMÍVEL) */}
        <div className="lg:col-span-8 overflow-x-auto w-full">
          <div className="flex items-center justify-center lg:hidden mb-2 text-muted-foreground text-xs font-medium">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Deslize para ver o holerite completo{' '}
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
          <div className="bg-white text-black p-4 sm:p-8 rounded-xl shadow-lg border border-border min-w-[700px] font-mono text-sm print:shadow-none print:border-none print:p-0 print:m-0 print:w-full max-w-[850px] mx-auto">
            {/* CABEÇALHO DO HOLERITE */}
            <div className="border-2 border-black mb-2 print:border-black">
              <div className="grid grid-cols-4 border-b border-black">
                <div className="col-span-3 p-2 border-r border-black">
                  <div className="font-bold text-lg uppercase">{empresa.razaoSocial}</div>
                  <div className="text-xs mt-1">CNPJ: {empresa.cnpj}</div>
                </div>
                <div className="col-span-1 p-2 flex flex-col justify-center items-center text-center border-l border-black">
                  <div className="font-bold uppercase text-black">Recibo de Pagamento</div>
                </div>
              </div>
              <div className="grid grid-cols-6 border-b border-black p-2 font-bold uppercase bg-slate-100 print:bg-white">
                <div className="col-span-1">Cód.</div>
                <div className="col-span-4">Nome do Funcionário</div>
                <div className="col-span-1 text-right">Referência</div>
              </div>
              <div className="grid grid-cols-6 p-2 uppercase">
                <div className="col-span-1">00001</div>
                <div className="col-span-4">
                  <div>{funcionario.nome}</div>
                  <div className="text-xs text-black/70 mt-1">
                    Cargo: {funcionario.cargo} | CBO: {funcionario.cbo}
                  </div>
                </div>
                <div className="col-span-1 text-right font-bold">{variaveis.mesAno}</div>
              </div>
            </div>

            {/* CORPO: VENCIMENTOS E DESCONTOS */}
            <div className="border-2 border-black flex flex-col">
              <div className="grid grid-cols-12 border-b border-black p-2 font-bold uppercase bg-slate-100 text-xs print:bg-white text-center">
                <div className="col-span-1 text-left">Cód.</div>
                <div className="col-span-5 text-left">Descrição</div>
                <div className="col-span-2">Referência</div>
                <div className="col-span-2">Vencimentos</div>
                <div className="col-span-2">Descontos</div>
              </div>

              <div className="flex-1 p-2 relative overflow-y-auto min-h-[300px]">
                {holerite.proventos.map((item, idx) => (
                  <div key={`prov-${idx}`} className="grid grid-cols-12 text-xs mb-1">
                    <div className="col-span-1 text-left">{item.cod}</div>
                    <div className="col-span-5 text-left uppercase">{item.desc}</div>
                    <div className="col-span-2 text-center">{item.ref}</div>
                    <div className="col-span-2 text-right pr-4">{formatCurrency(item.valor)}</div>
                    <div className="col-span-2 text-right" />
                  </div>
                ))}

                {holerite.descontos.map((item, idx) => (
                  <div key={`desc-${idx}`} className="grid grid-cols-12 text-xs mb-1 text-black/70 print:text-black">
                    <div className="col-span-1 text-left">{item.cod}</div>
                    <div className="col-span-5 text-left uppercase">{item.desc}</div>
                    <div className="col-span-2 text-center">{item.ref}</div>
                    <div className="col-span-2 text-right" />
                    <div className="col-span-2 text-right pr-4">{formatCurrency(item.valor)}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-black mt-auto">
                <div className="grid grid-cols-12 text-xs font-bold bg-slate-100 print:bg-white">
                  <div className="col-span-8 p-2 text-right border-r border-black uppercase">Totais</div>
                  <div className="col-span-2 p-2 text-right border-r border-black pr-4">
                    {formatCurrency(holerite.totalProventos)}
                  </div>
                  <div className="col-span-2 p-2 text-right pr-4 text-red-600 print:text-black">
                    {formatCurrency(holerite.totalDescontos)}
                  </div>
                </div>
                <div className="grid grid-cols-12 text-sm font-bold border-t border-black bg-slate-200 print:bg-white">
                  <div className="col-span-8 p-2 text-right border-r border-black uppercase">Valor Líquido</div>
                  <div className="col-span-4 p-2 text-right pr-4 text-emerald-700 print:text-black text-lg">
                    {formatCurrency(holerite.liquido)}
                  </div>
                </div>
              </div>
            </div>

            {/* RODAPÉ E ASSINATURAS */}
            <div className="border-2 border-black border-t-0 p-2">
              <div className="grid grid-cols-2 gap-4 h-16 pt-6 mb-2">
                <div className="border-t border-slate-400 text-center text-[10px] text-slate-500 uppercase mx-4">
                  Assinatura do Empregador
                </div>
                <div className="border-t border-slate-400 text-center text-[10px] text-slate-500 uppercase mx-4">
                  Assinatura do Funcionário
                </div>
              </div>

              <div className="grid grid-cols-6 text-[10px] text-center divide-x divide-black uppercase border-t border-black pt-2 mt-2">
                <div className="p-1">
                  <div className="font-bold mb-1">Salário Base</div>
                  <div>{formatCurrency(funcionario.salarioBase)}</div>
                </div>
                <div className="p-1">
                  <div className="font-bold mb-1">Base Calc. INSS</div>
                  <div>{formatCurrency(holerite.baseINSS)}</div>
                </div>
                <div className="p-1">
                  <div className="font-bold mb-1">Base Calc. FGTS</div>
                  <div>{formatCurrency(holerite.baseFGTS)}</div>
                </div>
                <div className="p-1">
                  <div className="font-bold mb-1">FGTS do Mês</div>
                  <div>{formatCurrency(holerite.fgts)}</div>
                </div>
                <div className="p-1">
                  <div className="font-bold mb-1">Base Calc. IRRF</div>
                  <div>{formatCurrency(holerite.baseIRRF)}</div>
                </div>
                <div className="p-1">
                  <div className="font-bold mb-1">Faixa IRRF</div>
                  <div>{holerite.faixaIRRF}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
